pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";
import "hardhat/console.sol";


contract OwnerDeposit {

    receive() external payable {
        stake();
    }
    // Balances of the user's stacked funds
    mapping(address => uint256) public balances;

    // Staking threshold
    // uint256 public constant threshold = 1 ether;


    // Contract's Events
    event Stake(address indexed sender, uint256 amount);
    event Withdraw(address sender, uint256 amount);

    constructor() public {
        // what should we do on deploy?
    }

    /**
    * @notice Stake method that update the user's balance
    */
    function stake() public payable {
        //require at least 1000 USDC
        // update the user's balance
        balances[msg.sender] += msg.value;
        // if (address(this).balance >= threshold) {
        //     // isActive = true;
        // }
        // emit the event to notify the blockchain that we have correctly Staked some fund for the user
        emit Stake(msg.sender, msg.value);
    }

    function viewBalance() public view returns (uint256) {
        return balances[msg.sender];
    }

    function withdraw(address payable addr) public {
        // require(failed, "Cant withdraw until execute fails");
        uint256 amount = balances[addr];
        balances[addr] = 0;
        addr.transfer(amount);
    }

}
