const { ethers } = require("hardhat");
const { expect } = require("chai");
const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
// const {
//   BN,           // Big Number support
//   constants,    // Common constants, like the zero address and largest integers
//   expectEvent,  // Assertions for emitted events
//   expectRevert, // Assertions for transactions that should fail
// } = require('@openzeppelin/test-helpers');

function extractStayID(txResult) {
    events = txResult['events'];
    for (let i = 0; i < events.length; i++) {
      event = events[i];
      if (event['event'] == 'Listing') {
        return event['args']['stayId'];
      }
    }
    return -1;
  }

describe.only("purchase", function () {

  beforeEach(async function() {
    [acc1] = await ethers.getSigners();
    const k = await ethers.getContractFactory("StayManager");
    
    requiredDeposit = ethers.utils.parseUnits("1", 18);
    contract = await k.deploy(requiredDeposit);

    // Mimic test host account
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x32984c4e2B8d582771ADd9EC3FA219D07ca43F39"],
    });
    host = await ethers.getSigner("0x32984c4e2B8d582771ADd9EC3FA219D07ca43F39");

    // Mimic test guest account
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0xf45d030a73558032C4E89171905E09f000F78Ba5"],
      });
    guest = await ethers.getSigner("0xf45d030a73558032C4E89171905E09f000F78Ba5");

    USDCContract = await ethers.getContractFactory("ERC20");
    usdcContract = await USDCContract.attach('0xe11a86849d99f524cac3e7a0ec1241828e332c62');
    
    // Deposit and create listing
    await usdcContract.connect(host).approve(contract.address, requiredDeposit);
    await contract.connect(host).deposit();
    payment = ethers.utils.parseUnits("2", 18);
    securityDeposit = ethers.utils.parseUnits("1", 18);
    totalPayment = payment.add(securityDeposit);
    tx = await contract.connect(host).list(payment, securityDeposit);
    res = await tx.wait();
    stayId = extractStayID(res);
  });

  it("Purchase succeeds", async function () {
    usdcContract.connect(guest).approve(contract.address, totalPayment);
    tokenURI = "{startDate: 20220101, endDate: 20220201}";
    guestBalanceBefore = await usdcContract.balanceOf(guest.address);
    contractBalanceBefore = await usdcContract.balanceOf(contract.address);

    await contract.connect(guest).purchase(stayId, tokenURI);

    expect(await usdcContract.balanceOf(guest.address)).to.eq(guestBalanceBefore.sub(totalPayment));
    expect(await usdcContract.balanceOf(contract.address)).to.eq(contractBalanceBefore.add(totalPayment));

    res = await contract.stays(stayId);

    expect(res.host).to.eq(host.address);
    expect(res.guest).to.eq(guest.address);
    expect(res.open).to.eq(false);
    expect(await contract.ownerOf(res.hstay)).to.eq(host.address);
    expect(await contract.ownerOf(res.gstay)).to.eq(guest.address);
    expect(res.payment).to.eq(payment);
    expect(res.securityDeposit).to.eq(payment.div(2));
  });

});