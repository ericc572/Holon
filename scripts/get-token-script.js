const hre = require("hardhat");
async function main() {
  const NFT = await hre.ethers.getContractFactory("HolonSecDeposit");
  const CONTRACT_ADDRESS = "0x222E84E6e12783cEB67af6701Ba57Aaf022bEAfe"
  const contract = NFT.attach(CONTRACT_ADDRESS);
  const owner = await contract.ownerOf(1);
  console.log("Owner:", owner);
  const uri = await contract.tokenURI(1);
  console.log("URI: ", uri);
}
main().then(() => process.exit(0)).catch(error => {
  console.error(error);
  process.exit(1);
});