// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
//IPFS QmfQ3MXNuo9LzPKVn1UFHPw1Tbiz6bKGGPqVrdstNf5rv8

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const accountBalance = await deployer.getBalance();

  console.log('Deploying contracts with account: ', deployer.address);
  console.log('Account balance: ', accountBalance.toString());

  // const HSD = await hre.ethers.getContractFactory("HolonSecDeposit");
  // const hsd = await HSD.deploy();
  // await hsd.deployed();
  // console.log("HolonSecDeposit deployed to:", hsd.address);

  const OD = await hre.ethers.getContractFactory("OwnerDeposit");
  const od = await OD.deploy();
  await od.deployed();
  console.log("OwnerDeposit deployed to:", od.address);
}

main().then(() => process.exit(0)).catch(error => {
  console.error(error);
  process.exit(1);
});