import React, { useEffect, useState } from "react";
import './App.css';
import { utils, ethers } from "ethers";
import abi from './utils/OwnerDeposit.json';
import { parseEther } from "@ethersproject/units";

const App = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const contractAddress = "0xAda0B6d59bb4a796F0E2ff53be4e8216BAAbBf9b";
  const contractABI = abi.abi;

  const checkIfWalletIsConnected = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        console.log("Make sure you have metamask!");
        return;
      } else {
        console.log("We have the ethereum object", ethereum);
      }

      const accounts = await ethereum.request({ method: 'eth_accounts' });

      if (accounts.length !== 0) {
        const account = accounts[0];
        console.log("Found an authorized account:", account);
        setCurrentAccount(account);
      } else {
        console.log("No authorized account found")
      }
    } catch (error) {
      console.log(error);
    }
  }

  /**
  * Implement your connectWallet method here
  */
  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }

      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const network_id = window.ethereum.networkVersion;

      console.log('network_id: ', network_id);
      
      if (network_id !== '80001') {
        alert("Please connect to Mumbai Testnet!")
        return; 
      }

      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]); 
    } catch (error) {
      console.log(error)
    }
  }

  // const viewBalance = async () => {
  //   try {
  //     const { ethereum } = window;

  //     if (ethereum) {
  //       const provider = new ethers.providers.Web3Provider(ethereum);
  //       const signer = provider.getSigner();
  //       const stakingContract = new ethers.Contract(contractAddress, contractABI, signer);

  //       const stakedBalance = await stakingContract.viewBalance();
  //       console.log("StakedBalance: ", utils.formatEther(stakedBalance.toString()));

  //     } else {
  //       console.log("Ethereum object doesn't exist!");
  //     }
  //   } catch (error) {
  //     console.log(error)
  //   }
  // }

  const stake = async () => {
    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const stakingContract = new ethers.Contract(contractAddress, contractABI, signer);

        // let count = await stakingContract.getTotalWaves();
        // console.log("Retrieved total wave count...", count.toNumber());

        /*
        * Execute the actual stake from your smart contract
        */
        const stakeTxn = await stakingContract.stake({value: parseEther("0.001")});
        console.log("Staking...", stakeTxn.hash);

        await stakeTxn.wait();
        console.log("Mined -- ", stakeTxn.hash);


        const stakedBalance = await stakingContract.viewBalance();
        console.log("StakedBalance: ", utils.formatEther(stakedBalance.toString()));
        return stakedBalance;
        // count = await stakingContract.getTotalstakes();
        // console.log("Retrieved total stake count...", count.toNumber());
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error)
    }
  }


  useEffect(() => {
    checkIfWalletIsConnected();
  }, [])
  
  return (
    <div className="mainContainer">
      <div className="dataContainer">
        <div className="header">
        👋 Hey there!
        </div>

        <div className="bio">
          Hey yall!! This is holon. 

          Connect your wallet to get started.
        </div>

        <button className="stakeButton" onClick={stake}>
          STAKE DEPOSIT NOW
        </button>
        
        {!!currentAccount && (
          <div className="displayAccount"> 
            <b> Logged in as: </b> {currentAccount}
            {/* <b> Staked Balance: </b> {viewBalance} */}
          </div>

          
        )}
    
        {/*
        * If there is no currentAccount render this button
        */}
        {!currentAccount && (
          <button className="stakeButton" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
}

export default App