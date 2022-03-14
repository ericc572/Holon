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
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    // Pause flag
    bool private _paused;

    // USDC Contract
    IERC20 private _usdcContract;

    // Admin list
    EnumerableSet.AddressSet private _admins;  
    // Adjudicator list
    EnumerableSet.AddressSet private _adjudicators;  

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
    event Paused(address admin);
    event Unpaused(address admin);
    event Deposit(address indexed sender, uint256 amount);
    event WithdrawDeposit(address sender, uint256 amount);
    event Listing(address host, uint256 stayId);
    event ModifyListing(address host, uint256 stayId, uint256 payment, uint256 securityDeposit);
    event CloseOut(uint256 stayId, address host, address guest, uint256 fee, uint256 hostPayment, uint256 guestPayment);

    constructor(uint256 requiredDeposit, uint256 feePercent, address[] memory admins, address usdcAddress) ERC721("StayManager", "HolonStayManager") {
        _paused = false;

        _requiredDeposit = requiredDeposit;
        _feePercent = feePercent;
        for(uint i = 0; i < admins.length; i++) {
            _admins.add(admins[i]);
            _adjudicators.add(admins[i]);
        } 
        // For testing only, this is the USDC contract deployed to Mumbai Testnet
        _usdcContract = IERC20(usdcAddress);
    }

    modifier onlyAdmin {
        require(_admins.contains(msg.sender), "Admin only operation.");
        _;
    }

    modifier onlyAdjudicator {
        require(_adjudicators.contains(msg.sender), "Adjudicator only operation");
        _;
    }

    function paused() public view virtual returns (bool) {
        return _paused;
    }

    function pause() public onlyAdmin {
        _paused = true;
        emit Paused(msg.sender);
    }

    function unpause() public onlyAdmin {
        _paused = false;
        emit Unpaused(msg.sender);
    }

    modifier whenNotPaused() {
        require(!paused(), "Pausable: paused");
        _;
    }

    function setRequiredDeposit(uint256 requiredDeposit) public onlyAdmin {
        _requiredDeposit = requiredDeposit;
    }

    function setFeePercent(uint256 feePercent) public onlyAdmin {
        _feePercent = feePercent;
    }

    function addAdjudicators(address[] memory adjudicators) public onlyAdmin {
        for(uint i = 0; i < adjudicators.length; i++) {
            _adjudicators.add(adjudicators[i]);
        } 
    }

    function addAdmins(address[] memory admins) public onlyAdmin {
        for(uint i = 0; i < admins.length; i++) {
            _admins.add(admins[i]);
        } 
    }

    function removeAdjudicators(address[] memory adjudicators) public onlyAdmin {
        require(adjudicators.length < _adjudicators.length(), 'Cannot remove all adjudicators.');
        for(uint i = 0; i < adjudicators.length; i++) {
            if (_adjudicators.contains(adjudicators[i])) {
                _adjudicators.remove(adjudicators[i]);
            }
        } 
    }

    function removeAdmins(address[] memory admins) public onlyAdmin {
        require(admins.length < _admins.length(), 'Cannot remove all admins.');
        for(uint i = 0; i < admins.length; i++) {
            if (_admins.contains(admins[i])) {
                _admins.remove(admins[i]);
            }
        } 
    }

    function viewAdmins() public view onlyAdmin returns (address[] memory) {
        return _admins.values();
    }

    function viewAdjudicators() public view onlyAdmin returns (address[] memory) {
        return _adjudicators.values();
    }

    function viewFees() public view onlyAdmin returns (uint256) {
        return _totalFeeBalance;
    }

    function transferFees(address target) public onlyAdmin {
        require(_usdcContract.balanceOf(address(this)) >= _totalFeeBalance, "USDC balance less than totalFeeBalance");
        _usdcContract.safeTransfer(target, _totalFeeBalance);
        _totalFeeBalance = 0;
    }

    function transferUSDC(address target, uint256 amount) public onlyAdmin {
        require(_usdcContract.balanceOf(address(this)) >= amount, "USDC balance less than amount");
        _usdcContract.safeTransfer(target, amount);
    }

    function getRequiredDeposit() public view returns (uint256) {
        return _requiredDeposit;
    }

    function getFeePercent() public view returns (uint256) {
        return _feePercent;
    }

    function deposit() public whenNotPaused {
        require(_usdcContract.balanceOf(msg.sender) >= _requiredDeposit, "USDC balance insufficient.");
        require(_usdcContract.allowance(msg.sender, address(this)) == _requiredDeposit, "Contract not approved for USDC transaction");
        _usdcContract.safeTransferFrom(msg.sender, address(this), _requiredDeposit);
        // update the user's balance
        depositBalances[msg.sender] += _requiredDeposit;

        // emit the event to notify the blockchain that we have correctly Staked some fund for the user
        emit Deposit(msg.sender, _requiredDeposit);
    }

    function withdrawDeposit() public whenNotPaused {
        require(depositBalances[msg.sender] > 0, "No deposit to withdraw");
        require(hostActiveStays[msg.sender] == 0, "Cannot withdraw despoit unless 0 active stays.");
        uint256 amount = depositBalances[msg.sender];
        depositBalances[msg.sender] = 0;
        _usdcContract.safeTransfer(msg.sender, amount);

        emit WithdrawDeposit(msg.sender, amount);
    }

    function list(uint256 payment, uint256 securityDeposit) 
        public whenNotPaused
    {
        _list(msg.sender, payment, securityDeposit);
    }

    function bulkList(uint256[][] memory listings) 
        public whenNotPaused
    {
        require(depositBalances[msg.sender] >= _requiredDeposit, "User has not deposited.");
        for(uint i = 0; i < listings.length; i++) {
            _list(msg.sender, listings[i][0], listings[i][1]);
        }
    }

    function removeListings(uint256[] memory stayIds) public whenNotPaused {
        for (uint i = 0; i < stayIds.length; i++) {
            _checkRemoveListing(stayIds[i]);
            _delist(stayIds[i]);
        }
    }

    function modifyListing(uint256 stayId, uint256 payment, uint256 securityDeposit)
        public whenNotPaused
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
        private whenNotPaused
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

    function purchase(uint256 stayId, string memory tokenURI) public whenNotPaused {
        _purchase(stayId, tokenURI);
    }

    function bulkPurchase(uint256[] memory stayIds, string[] memory tokenURIs) public whenNotPaused {
        require(stayIds.length == tokenURIs.length, "Must provide two equal length lists.");
        for (uint i = 0; i < stayIds.length; i++) {
            _purchase(stayIds[i], tokenURIs[i]);
        } 
    }

    function _purchase(uint256 stayId, string memory tokenURI) internal {
        require(stays[stayId].open, "Listing is not open");
        uint256 totalPayment = stays[stayId].payment + stays[stayId].securityDeposit;
        require(totalPayment <= _usdcContract.balanceOf(msg.sender), "USDC balance not sufficient to complete stay transaction.");
        require(stays[stayId].host != msg.sender, "Host cannot purhcase their own stay.");
        require(_usdcContract.allowance(msg.sender, address(this)) >= totalPayment, "Contract not approved for USDC transaction");

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

    function sendToAdjudicator(uint256 tokenId) public whenNotPaused {
        require(msg.sender == ownerOf(tokenId), "Cannot return a stay you do not own.");
        require(tokenToStayMap[tokenId] > 0, "No stay associated with this NFT.");

        uint256 stayId = tokenToStayMap[tokenId];
        require((msg.sender == stays[stayId].host) || (msg.sender == stays[stayId].guest), "Only host or guest can interact with an active stay.");

        transferFrom(msg.sender, address(this), tokenId);
        
        if (msg.sender == stays[stayId].host) {
            require(stays[stayId].hostStatus == 1, "hostStatus != 1");
            stays[stayId].hostStatus = 3;
        } else {
            require(stays[stayId].guestStatus == 1, "guestStatus != 1");
            stays[stayId].guestStatus = 3;
        }
    }

    function returnStayNFT(uint256 tokenId) public whenNotPaused {
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

    function adjudicate(uint256 stayId, uint256 hostPayment, uint256 guestPayment) public onlyAdjudicator whenNotPaused {
        require(_stayIdSet.contains(stayId), "Cannot adjudicate a nonexistent stay.");
        // require(stays[stayId].hostStatus == 3 || stays[stayId].guestStatus == 3, "Either host or guest must have submitted for adjudication.");
        uint256 payment = stays[stayId].payment;
        uint256 securityDeposit = stays[stayId].securityDeposit;
        uint256 fee = _feePercent * payment / 100;
        uint256 totalAvailable = payment + securityDeposit - fee;
        require(totalAvailable >= (hostPayment + guestPayment), "Cannot pay out more than payment+security deposit less fees");

        _usdcContract.safeTransfer(stays[stayId].host, hostPayment);
        _usdcContract.safeTransfer(stays[stayId].guest, guestPayment);

        _totalFeeBalance += fee;
        delete tokenToStayMap[stays[stayId].hstay];
        delete tokenToStayMap[stays[stayId].gstay];

        if(stays[stayId].hostStatus == 3) {
            _burn(stays[stayId].hstay);
        }

        if(stays[stayId].guestStatus == 3) {
            _burn(stays[stayId].gstay);
        }
        _delist(stayId); 
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