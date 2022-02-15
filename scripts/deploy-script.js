const hre = require("hardhat");
const { ethers } = require("hardhat");
const stayManagerConfig = require('../cfg/stay-manager-cfg.json');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const accountBalance = await deployer.getBalance();

  USDCContract = await ethers.getContractFactory("ERC20");
  usdcContract = await USDCContract.attach('0xe11a86849d99f524cac3e7a0ec1241828e332c62');

  console.log('Deploying contracts with account: ', deployer.address);
  console.log('Account balance: ', accountBalance.toString());

  const requiredDeposit = ethers.utils.parseUnits(stayManagerConfig['requiredDeposit'], await usdcContract.decimals());
  const feePercent = stayManagerConfig['feePercent'];
  const stayManagerFactory = await hre.ethers.getContractFactory("StayManager");
  const stayManager = await stayManagerFactory.deploy(requiredDeposit, feePercent);
  await stayManager.deployed();
  console.log("StayManager deployed to:", stayManager.address);
}

main().then(() => process.exit(0)).catch(error => {
  console.error(error);
  process.exit(1);
});