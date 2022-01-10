const hre = require("hardhat");
const { ethers } = require("hardhat");
const stayManagerConfig = require('../cfg/stay-manager-cfg.json');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const accountBalance = await deployer.getBalance();

  console.log('Deploying contracts with account: ', deployer.address);
  console.log('Account balance: ', accountBalance.toString());

  requiredDeposit = ethers.utils.parseUnits(stayManagerConfig['requiredDeposit'], 18);
  const stayManagerFactory = await hre.ethers.getContractFactory("StayManager");
  const stayManager = await stayManagerFactory.deploy(requiredDeposit);
  await stayManager.deployed();
  console.log("StayManager deployed to:", stayManager.address);
}

main().then(() => process.exit(0)).catch(error => {
  console.error(error);
  process.exit(1);
});