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

Create a `.env` file in the root directory, and add `PRIVATE_KEY=<YOUR EXPORTED PRIVATE KEY>`. Then add 'MUMBAI_API_URL=<MUMBAI_API_URL>' (ask Pranav for the Mumbai API url from Alchemy).

*DO NOT* PUSH THIS FILE! ADD IT TO YOUR GITIGNORE NOW. OR there will be dire consequences lol.

Run the deploy script

```
npx hardhat run scripts/deploy-script.js --network matic
```

## Testing

Set up tests. 

In a separate terminal tab, run 

```
npx run node
```
This by default forks Polygon's Mumbai Testnet, meaning you can mimic accounts on that network (i.e. you can use the faucets below to obtain USDC in your test account's wallet and then mimic them in your tests on the forked local node that Hardhat runs).
Now run your tests. use `.only` to isolate describe/it blocks.

```
npx run test
```

To obtain Testnet Mumbai tokens:
[visit this link](https://faucet.matic.network/)
To obtain Testnet Mumbai USDC tokens:
[visit this link](https://docs.filswan.com/development-resource/swan-token-contract/acquire-testnet-usdc-and-matic-tokens)

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
