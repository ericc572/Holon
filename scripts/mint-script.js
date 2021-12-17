const hre = require("hardhat");
const WALLET_ADDR = process.env.WALLET_ADDR;



async function main() {
  const NFT = await hre.ethers.getContractFactory("HolonSecDeposit");
  const URI = "ipfs://QmfQ3MXNuo9LzPKVn1UFHPw1Tbiz6bKGGPqVrdstNf5rv8"
  const CONTRACT_ADDRESS = "0x222E84E6e12783cEB67af6701Ba57Aaf022bEAfe"
  const contract = NFT.attach(CONTRACT_ADDRESS);
  await contract.mint(WALLET_ADDR, URI);
  console.log("NFT minted:", contract);
}

main().then(() => process.exit(0)).catch(error => {
  console.error(error);
  process.exit(1);
});