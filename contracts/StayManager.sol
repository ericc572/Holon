pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract StayManager is ERC721, Ownable {
    using Counters for Counters.Counter;
    using EnumerableSet for EnumerableSet.UintSet;
    Counters.Counter private _stayIds;
    Counters.Counter private _gstayIds;
    Counters.Counter private _hstayIds;

    uint256 private _securityDepositDivisor = 2;

    struct Stay {
        uint256 id;
        address host;
        address guest;
        bool open;
        uint256 hstay;
        uint256 gstay;
        uint256 payment;
        uint256 securityDeposit;
    }

    mapping(address => uint256) public depositBalances;
    uint32 private requiredDeposit = 1000000; // in gwei
    string private depositError = "Must deposit .001 MATIC.";

    mapping(uint256 => Stay) public stays;
    EnumerableSet.UintSet private stayIds;  
    mapping(address => uint256) public hostActiveStays;

    // Contract's Events
    event Deposit(address indexed sender, uint256 amount);
    event WithdrawDeposit(address sender, uint256 amount);

    constructor() public ERC721("StayManager", "HolonStayManager") {}

    function deposit() public payable {
        //require at least 1000 USDC

        // update the user's balance
        uint256 amt = msg.value;
        depositBalances[msg.sender] += amt;

        // emit the event to notify the blockchain that we have correctly Staked some fund for the user
        emit Deposit(msg.sender, amt);
    }

    function withdrawDeposit() public {
        require(depositBalances[msg.sender] >= 0, "No deposit to withdraw");
        require(hostActiveStays[msg.sender] == 0, "Cannot withdraw despoit unless 0 active stays.");
        uint256 amount = depositBalances[msg.sender];
        depositBalances[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function list(uint256 payment) 
        public 
        returns (uint256)
    {
        require(depositBalances[msg.sender] >= requiredDeposit, depositError);

        _stayIds.increment();
        uint256 stayId = _stayIds.current();

        uint256 securityDeposit = payment / _securityDepositDivisor;
        stays[stayId] = Stay(stayId, msg.sender, address(0), true, 0, 0, payment, securityDeposit);
        stayIds.add(stayId);
        hostActiveStays[msg.sender]++;

        return stayId;
    }

    function removeListing(uint256 stayId) public {
        require(stayIds.contains(stayId), "Attempted to delist a stayId that doesn't exist.");
        require(stays[stayId].host == msg.sender, "Only host can remove listing.");
        _delist(stayId);
    }

    function _delist(uint256 stayId) internal {
        hostActiveStays[stays[stayId].host]--;
        delete stays[stayId];
        stayIds.remove(stayId);
    }

    function getNumStays() public view returns (uint256){
        return stayIds.length();
    }

    function getStayId(uint index) public view returns (uint256){
        return stayIds.at(index);
    }
}