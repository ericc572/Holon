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

describe.only("list", function () {

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

    USDCContract = await ethers.getContractFactory("ERC20");
    usdcContract = await USDCContract.attach('0xe11a86849d99f524cac3e7a0ec1241828e332c62');

    payment = ethers.utils.parseUnits("2", 18);
    securityDeposit = ethers.utils.parseUnits("1", 18);
  });

  it("Fails a listing without despoit", async function () {
    await truffleAssert.fails(
        contract.connect(host).list(1000, 100),
        truffleAssert.ErrorType.REVERT,
        "User has not deposited."
    );
  });

  //test deposit function
  it("successfully deposits an amount", async function () {
    initialHostBal = await usdcContract.balanceOf(host.address);
    await usdcContract.connect(host).approve(contract.address, requiredDeposit);
    expect(await usdcContract.allowance(host.address, contract.address)).to.eq(requiredDeposit);
    await contract.connect(host).deposit();
    expect(await usdcContract.allowance(host.address, contract.address)).to.eq(0);
    expect(await usdcContract.balanceOf(host.address)).to.eq(initialHostBal.sub(requiredDeposit));
    expect(await usdcContract.balanceOf(contract.address)).to.eq(requiredDeposit);
    expect(await contract.depositBalances(host.address)).to.eq(requiredDeposit);
  });

  //test list function before depositing
  it("successfully deposits an amount, lists stay, and isn't able to withdraw", async function () {
    await usdcContract.connect(host).approve(contract.address, requiredDeposit);
    await contract.connect(host).deposit();
    
    
    tx = await contract.connect(host).list(payment, securityDeposit);
    res = await tx.wait();
    stayId = extractStayID(res);
    assert(stayId >= 0, "Couldn't find Listing event to extract stayId.");
    
    // stayId = await contract.getStayId(await contract.getNumStays() - 1)
    res = await contract.stays(stayId);
    expect(res[1]).to.eq(host.address);
    expect(res[2]).to.eq(ethers.constants.AddressZero);
    expect(res[3]).to.eq(true);
    expect(res[4]).to.eq(0);
    expect(res[5]).to.eq(0);
    expect(res[6]).to.eq(payment);
    expect(res[7]).to.eq(securityDeposit);

    await truffleAssert.fails(
        contract.connect(host).withdrawDeposit(),
        truffleAssert.ErrorType.REVERT,
        "Cannot withdraw despoit unless 0 active stays."
    );
  });

  it("can successfully withdraw an amount", async function () {
    initialHostBal = await usdcContract.balanceOf(host.address);
    initialContractBal = await usdcContract.balanceOf(contract.address);
    await usdcContract.connect(host).approve(contract.address, requiredDeposit);
    await contract.connect(host).deposit();

    await contract.connect(host).withdrawDeposit();

    expect(await contract.depositBalances(host.address)).to.eq(0);
    expect(await usdcContract.balanceOf(host.address)).to.eq(initialHostBal);
    expect(await usdcContract.balanceOf(contract.address)).to.eq(initialContractBal);
  });

  it("can successfully withdraw an amount after listing and delisting", async function () {
    initialHostBal = await usdcContract.balanceOf(host.address);
    initialContractBal = await usdcContract.balanceOf(contract.address);
    await usdcContract.connect(host).approve(contract.address, requiredDeposit);
    await contract.connect(host).deposit();

    tx = await contract.connect(host).list(payment, securityDeposit);
    stayId = await contract.getStayId(await contract.getNumStays() - 1);
    await contract.connect(host).removeListing(stayId);
    await contract.connect(host).withdrawDeposit();

    expect(await contract.depositBalances(host.address)).to.eq(0);
    expect(await contract.getNumStays()).to.eq(0);
    expect(await contract.hostActiveStays(host.address)).to.eq(0);
    expect(await usdcContract.balanceOf(host.address)).to.eq(initialHostBal);
    expect(await usdcContract.balanceOf(contract.address)).to.eq(initialContractBal);
  });

});