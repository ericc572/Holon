pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "hardhat/console.sol";

contract StayManager is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    using EnumerableSet for EnumerableSet.UintSet;
    using SafeERC20 for IERC20;

    // USDC Contract
    IERC20 private _usdcContract;

    Counters.Counter private _tokenIds;
    Counters.Counter private _stayIds;

    // status = {
    //     0: open,
    //     1: in progress,
    //     2: returned nft,
    //     3: sent nft to adjudicator
    // }

    struct Stay {
        uint256 id;
        address host;
        address guest;
        bool open;
        uint256 hstay;
        uint256 gstay;
        uint256 payment;
        uint256 securityDeposit;
        uint8 hostStatus;
        uint8 guestStatus; 
    }

    mapping(address => uint256) public depositBalances;
    uint256 private _requiredDeposit;

    mapping(uint256 => Stay) public stays;
    EnumerableSet.UintSet private _stayIdSet;  
    mapping(address => uint256) public hostActiveStays;

    mapping(uint256 => uint256) public tokenToStayMap;

    uint256 private _feePercent;
    uint256 private _totalFeeBalance;

    // Contract's Events
    event Deposit(address indexed sender, uint256 amount);
    event WithdrawDeposit(address sender, uint256 amount);
    event Listing(address host, uint256 stayId);
    event ModifyListing(address host, uint256 stayId, uint256 payment, uint256 securityDeposit);
    event CloseOut(uint256 stayId, address host, address guest, uint256 fee, uint256 hostPayment, uint256 guestPayment);

    constructor(uint256 requiredDeposit, uint256 feePercent) ERC721("StayManager", "HolonStayManager") {
        _requiredDeposit = requiredDeposit;
        _feePercent = feePercent;

        // For testing only, this is the USDC contract deployed to Mumbai Testnet
        _usdcContract = IERC20(0xe11A86849d99F524cAC3E7A0Ec1241828e332C62);
    }

    function getRequiredDeposit() public view returns (uint256) {
        return _requiredDeposit;
    }

    function deposit() public {
        require(_usdcContract.balanceOf(msg.sender) >= _requiredDeposit, "USDC balance insufficient.");
        require(_usdcContract.allowance(msg.sender, address(this)) == _requiredDeposit, "Contract not approved for USDC transaction");
        _usdcContract.safeTransferFrom(msg.sender, address(this), _requiredDeposit);
        // update the user's balance
        depositBalances[msg.sender] += _requiredDeposit;

        // emit the event to notify the blockchain that we have correctly Staked some fund for the user
        emit Deposit(msg.sender, _requiredDeposit);
    }

    function withdrawDeposit() public {
        require(depositBalances[msg.sender] > 0, "No deposit to withdraw");
        require(hostActiveStays[msg.sender] == 0, "Cannot withdraw despoit unless 0 active stays.");
        uint256 amount = depositBalances[msg.sender];
        depositBalances[msg.sender] = 0;
        _usdcContract.safeTransfer(msg.sender, amount);

        emit WithdrawDeposit(msg.sender, amount);
    }

    function list(uint256 payment, uint256 securityDeposit) 
        public 
    {
        _list(msg.sender, payment, securityDeposit);
    }

    function bulkList(uint256[][] memory listings) 
        public
    {
        require(depositBalances[msg.sender] >= _requiredDeposit, "User has not deposited.");
        for(uint i = 0; i < listings.length; i++) {
            _list(msg.sender, listings[i][0], listings[i][1]);
        }
    }

    function removeListings(uint256[] memory stayIds) public {
        for (uint i = 0; i < stayIds.length; i++) {
            _checkRemoveListing(stayIds[i]);
            _delist(stayIds[i]);
        }
    }

    function modifyListing(uint256 stayId, uint256 payment, uint256 securityDeposit)
        public
    {
        require(stays[stayId].id > 0, "stayId doesn't exist.");
        require(stays[stayId].open, "stayId has already been purchased.");
        require(stays[stayId].host == msg.sender, "Only owner can modify listing.");
        require(depositBalances[msg.sender] >= _requiredDeposit, "User has not deposited.");
        
        stays[stayId].payment = payment;
        stays[stayId].securityDeposit = securityDeposit;

        emit ModifyListing(msg.sender, stayId, payment, securityDeposit);
    }

    function _list(address sender, uint256 payment, uint256 securityDeposit) 
        private 
    {
        require(depositBalances[sender] >= _requiredDeposit, "User has not deposited.");
        require(payment >= 100, "Min payment is 100*10^-18");

        _stayIds.increment();
        uint256 stayId = _stayIds.current();

        stays[stayId] = Stay(stayId, sender, address(0), true, 0, 0, payment, securityDeposit, 0, 0);
        _stayIdSet.add(stayId);
        hostActiveStays[sender]++;

        emit Listing(sender, stayId);
    }

    function _checkRemoveListing(uint256 stayId) internal {
        require(_stayIdSet.contains(stayId), "Attempted to delist a stayId that doesn't exist.");
        require(stays[stayId].host == msg.sender, "Only host can remove listing.");
        require(stays[stayId].open, "Cannot delist an active stay.");
    }

    function _delist(uint256 stayId) internal {
        hostActiveStays[stays[stayId].host]--;
        delete stays[stayId];
        _stayIdSet.remove(stayId);
    }

    function getNumStays() public view returns (uint256){
        return _stayIdSet.length();
    }

    function getStayId(uint index) public view returns (uint256){
        return _stayIdSet.at(index);
    }

    function purchase(uint256 stayId, string memory tokenURI) public {
        require(stays[stayId].open, "Listing is not open");
        uint256 totalPayment = stays[stayId].payment + stays[stayId].securityDeposit;
        require(totalPayment <= _usdcContract.balanceOf(msg.sender), "USDC balance not sufficient to complete stay transaction.");
        require(stays[stayId].host != msg.sender, "Host cannot purhcase their own stay.");
        require(_usdcContract.allowance(msg.sender, address(this)) == totalPayment, "Contract not approved for USDC transaction");

        _usdcContract.safeTransferFrom(msg.sender, address(this), totalPayment);

        _tokenIds.increment();
        uint256 gstayId = _tokenIds.current();
        _tokenIds.increment();
        uint256 hstayId = _tokenIds.current();

        _safeMint(msg.sender, gstayId);
        _safeMint(stays[stayId].host, hstayId);
        _setTokenURI(gstayId, tokenURI);
        _setTokenURI(hstayId, tokenURI);

        stays[stayId].open = false;
        stays[stayId].hostStatus = 1;
        stays[stayId].guestStatus = 1;
        stays[stayId].guest = msg.sender;
        stays[stayId].gstay = gstayId;
        stays[stayId].hstay = hstayId;

        tokenToStayMap[gstayId] = stayId;
        tokenToStayMap[hstayId] = stayId;
    }

    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4) {
        require(operator == address(this), "StayManager can only accept NFTs minted by itself.");
        return bytes4(keccak256("onERC721Received(address,uint256,bytes)"));
    }

    function returnStayNFT(uint256 tokenId) public {
        require(msg.sender == ownerOf(tokenId), "Cannot return a stay you do not own.");
        require(tokenToStayMap[tokenId] > 0, "No stay associated with this NFT.");

        uint256 stayId = tokenToStayMap[tokenId];
        require((msg.sender == stays[stayId].host) || (msg.sender == stays[stayId].guest), "Only host or guest can interact with an active stay.");

        transferFrom(msg.sender, address(this), tokenId);
        
        if (msg.sender == stays[stayId].host) {
            require(stays[stayId].hostStatus == 1, "hostStatus != 1");
            if (stays[stayId].guestStatus == 2) {
                _closeOut(stayId);
            } else {
                stays[stayId].hostStatus = 2;
            }
        } else {
            require(stays[stayId].guestStatus == 1, "guestStatus != 1");
            if (stays[stayId].hostStatus == 2) {
                _closeOut(stayId);
            } else{
                stays[stayId].guestStatus = 2;
            }
        }
    }

    function _closeOut(uint256 stayId) internal {
        uint256 payment = stays[stayId].payment;
        uint256 securityDeposit = stays[stayId].securityDeposit;
        uint256 fee = _feePercent * payment / 100;
        uint256 hostRenumeration = payment - fee;

        _usdcContract.safeTransfer(stays[stayId].host, hostRenumeration);
        _usdcContract.safeTransfer(stays[stayId].guest, securityDeposit);

        _totalFeeBalance += fee;

        emit CloseOut(stayId, stays[stayId].host, stays[stayId].guest, fee, hostRenumeration, securityDeposit);

        delete tokenToStayMap[stays[stayId].hstay];
        delete tokenToStayMap[stays[stayId].gstay];
        _burn(stays[stayId].hstay);
        _burn(stays[stayId].gstay);

        _delist(stayId);   
    }
}