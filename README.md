# Welcome to Holon.
Holon is helping people reclaim their freedom by changing the systems built around housing. We're using Web3 to make renting and owning property much more flexible and accessible. In the short term, we're focused on deconstructing the 12-month lease through NFTs and enabling DAOs to purchase property with crypto.


This is the public facing repository for everything smart contracts related. written in Solidity and built on the Polygon Network.


## You will need:
- npm
- an IDE or editor


# Setup

Clone the github repo 

```
git clone git@github.com:ericc572/Holon.git
```

Install dependencies

```
npm install 
```

Make sure that hardhat is installed!

```
npm install --save-dev hardhat && npx hardhat
```

Create a `.env` file in the root directory, and add `PRIVATE_KEY=<YOUR EXPORTED PRIVATE KEY>`. 

*DO NOT* PUSH THIS FILE! ADD IT TO YOUR GITIGNORE NOW. OR there will be dire consequences lol.

Run the deploy script

```
npx hardhat run scripts/deploy-script.js --network matic
```

## Testing
Switch to hardhat local blockchain, then do:

```
npx run test
```

To obtain Testnet Mumbai tokens:
[visit this link](https://faucet.matic.network/)

### To switch to using hardhat local blockchain

- go to `hardhat.config.js`
- comment out the following code:
```
matic: {
  url: "https://rpc-mumbai.maticvigil.com",
  accounts: [PRIVATE_KEY]
}
```
- change the value of `defaultNetwork` from `matic` to `hardhat`.

# Contributing

Please make a pull request if you'd like to contribute!




## Basic Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, a sample script that deploys that contract, and an example of a task implementation, which simply lists the available accounts.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```
