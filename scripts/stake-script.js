// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
//IPFS QmfQ3MXNuo9LzPKVn1UFHPw1Tbiz6bKGGPqVrdstNf5rv8

const hre = require("hardhat");
// const provider = new ethers.providers.Web3Provider(window.ethereum, "any");

const ADDR = "0xAda0B6d59bb4a796F0E2ff53be4e8216BAAbBf9b"
const usdc = {
  address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  abi: [
    "function approve(address _spender, uint256 _amount) public returns (bool success)",
    "function gimmeSome() external",
    "function balanceOf(address _owner) public view returns (uint256 balance)",
    "function transferFrom(address _from, address _to, uint256 _value) public returns (bool success)",
  ],
};


async function main() {

    const [deployer] = await hre.ethers.getSigners();
    const accountBalance = await deployer.getBalance();
  
    const OD = await hre.ethers.getContractFactory("OwnerDeposit");
    const od = await OD.deploy();
    await od.deployed();
    console.log("OwnerDeposit deployed to:", od.address);

    // await provider.send("eth_requestAccounts", []);
    const OwnerDeposit = await hre.ethers.getContractFactory("OwnerDeposit");
    // const signer = OwnerDeposit.getSigner();

    const contract = OwnerDeposit.attach(ADDR);
    // let userAddress = await signer.getAddress();
    const usdcContract = new ethers.Contract(usdc.address, usdc.abi, deployer);
    console.log("approving usdc contract..");

    const appr = await usdcContract.approve(od.address, 1000);
    console.log(`tx hash: ${appr.hash}`);

 
    // _token.transferFrom(from, address(this), 1000);
    console.log('sending from: %s to $s', deployer.address);
    console.log('to: ', od.address);

    const tx = await usdcContract.transferFrom(deployer.address, od.address, 1000);
    console.log(`Transaction hash: ${tx.hash}`);

    // const tx = await usdcContract.gimmeSome({ gasPrice: 20e9 });
    // console.log(`Transaction hash: ${tx.hash}`);
  
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);

    let usdcBalance = await usdcContract.balanceOf(od.address);
    console.log("Your balance is: ", usdcBalance);
}

main().then(() => process.exit(0)).catch(error => {
  console.error(error);
  process.exit(1);
});