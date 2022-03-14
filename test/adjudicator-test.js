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

describe.only("adjudicator", function () {

  beforeEach(async function() {
    [acc1] = await ethers.getSigners();
    k = await ethers.getContractFactory("StayManager");
    
    requiredDeposit = ethers.utils.parseUnits("1", 18);
    fee = 5;
    contract = await k.deploy(requiredDeposit, fee, ["0x32984c4e2B8d582771ADd9EC3FA219D07ca43F39"], '0xe11a86849d99f524cac3e7a0ec1241828e332c62');

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
    payment = ethers.utils.parseUnits("1", 18);
    securityDeposit = ethers.utils.parseUnits("3", 18);
    totalPayment = payment.add(securityDeposit);
    tx = await contract.connect(host).list(payment, securityDeposit);
    res = await tx.wait();
    stayId = extractStayID(res);

    usdcContract.connect(guest).approve(contract.address, totalPayment);
    tokenURI = "{startDate: 20220101, endDate: 20220201}";

    await contract.connect(guest).purchase(stayId, tokenURI);
    res = await contract.stays(stayId);

    hostBalanceBefore = await usdcContract.balanceOf(host.address);
    guestBalanceBefore = await usdcContract.balanceOf(guest.address);
    contractBalanceBefore = await usdcContract.balanceOf(contract.address);
  });

  it("Admin is adjudicator", async function () {
    adjudicators = await contract.connect(host).viewAdjudicators();
    expect(ethers.utils.getAddress(adjudicators[0])).to.eq(ethers.utils.getAddress("0x32984c4e2B8d582771ADd9EC3FA219D07ca43F39"));
  });
  
  it("Guest submit to adjudicate doesn't close-out", async function () {
    await contract.connect(host).returnStayNFT(res.hstay);
    await contract.connect(guest).sendToAdjudicator(res.gstay);

    stayInfo = await contract.stays(stayId);
    expect(stayInfo.guestStatus).to.eq(3);
    expect(stayInfo.hostStatus).to.eq(2);
    expect(await contract.hostActiveStays(host.address)).to.eq(1);
    expect(await contract.getNumStays()).to.eq(1); 
    expect(await usdcContract.balanceOf(guest.address)).to.eq(guestBalanceBefore);
    expect(await usdcContract.balanceOf(host.address)).to.eq(hostBalanceBefore);
    expect(await usdcContract.balanceOf(contract.address)).to.eq(contractBalanceBefore);   
  });

  it("Host submit to adjudicate doesn't close-out", async function () {
    await contract.connect(host).sendToAdjudicator(res.hstay);
    await contract.connect(guest).returnStayNFT(res.gstay);

    stayInfo = await contract.stays(stayId);
    expect(stayInfo.guestStatus).to.eq(2);
    expect(stayInfo.hostStatus).to.eq(3);
    expect(await contract.hostActiveStays(host.address)).to.eq(1);
    expect(await contract.getNumStays()).to.eq(1); 
    expect(await usdcContract.balanceOf(guest.address)).to.eq(guestBalanceBefore);
    expect(await usdcContract.balanceOf(host.address)).to.eq(hostBalanceBefore);
    expect(await usdcContract.balanceOf(contract.address)).to.eq(contractBalanceBefore);   
  });

  it("Adjudication closes-out", async function () {
    await contract.connect(host).sendToAdjudicator(res.hstay);
    await contract.connect(guest).returnStayNFT(res.gstay);
    hostAward = totalPayment.sub(ethers.utils.parseUnits(".05", 18))
    await contract.connect(host).adjudicate(stayId, hostAward, 0);

    totalFee = contractBalanceBefore.add(ethers.utils.parseUnits(".05", 18)).sub(payment).sub(securityDeposit);
    hostPayment = hostBalanceBefore.add(totalPayment);
    hostRenumeration = hostPayment.sub(ethers.utils.parseUnits(".05", 18));    

    expect(await contract.hostActiveStays(host.address)).to.eq(0);
    expect(await contract.getNumStays()).to.eq(0); 
    expect(await usdcContract.balanceOf(guest.address)).to.eq(guestBalanceBefore);
    expect(await usdcContract.balanceOf(host.address)).to.eq(hostRenumeration);
    expect(await usdcContract.balanceOf(contract.address)).to.eq(totalFee);   
  });

  it("Fails non-authorized adjudicator", async function () {
    await contract.connect(host).sendToAdjudicator(res.hstay);
    await contract.connect(guest).returnStayNFT(res.gstay);
    hostAward = totalPayment.sub(ethers.utils.parseUnits(".05", 18))
    await truffleAssert.fails(
        contract.connect(guest).adjudicate(stayId, hostAward, 0),
        truffleAssert.ErrorType.REVERT,
        "Adjudicator only operation"
    );
  });

});