#!/bin/bash
npx hardhat run scripts/deploy-script.js --network matic | awk 'END {print $NF}'
echo "Deployed to contract successfully!" 
echo "$CONTRACT_ADDR"

echo "Copying ABI file generated (artifacts/contracts) to front-end. Requires your holon-fe repo to be in the same parent directory as Holon!"
cp -f ./artifacts/contracts/OwnerDeposit.sol/OwnerDeposit.json ../holon-fe/src/utils/OwnerDeposit.json

# paste this in front-end code

# set the config var env file

