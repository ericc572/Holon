pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract HolonSecDeposit is ERC721, Ownable {
  using Counters for Counters.Counter;
  using Strings for uint256;
  Counters.Counter private _tokenIds;
  uint256 totalWaves;
  mapping (uint256 => string) private _tokenURIs;
  
  constructor() ERC721("HolonSecDeposit", "MNFT") {
    console.log("initializing HolonSecDeposit contract");
  }
  
  function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
    _tokenURIs[tokenId] = _tokenURI;
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
    string memory _tokenURI = _tokenURIs[tokenId];
    return _tokenURI;
  }

  function mint(address recipient, string memory uri) public returns (uint256) {
    _tokenIds.increment();
    uint256 newItemId = _tokenIds.current();
    
    _mint(recipient, newItemId);
    _setTokenURI(newItemId, uri);
    return newItemId;
  }

  function wave() public {
      totalWaves += 1;
      console.log("%s has waved!", msg.sender);
  }

  function getTotalWaves() public view returns (uint256) {
      console.log("We have %d total waves!", totalWaves);
      return totalWaves;
  }
}