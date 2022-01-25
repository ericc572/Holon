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
function extractEventInfo(txResult, eventName, eventDataKey) {
  events = txResult['events'];
  results = [];
  for (let i = 0; i < events.length; i++) {
    event = events[i];
    if (event['event'] == eventName) {
      results.push(event['args'][eventDataKey]);
    }
  }
  return results;
}

describe.only("list", function () {

  beforeEach(async function() {
    [acc1] = await ethers.getSigners();
    k = await ethers.getContractFactory("StayManager");
    
    requiredDeposit = ethers.utils.parseUnits("1", 18);
    fee = 5;
    contract = await k.deploy(requiredDeposit, fee);

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

  it("Fails a deposit with insufficient USDC balance", async function () {
    await truffleAssert.fails(
        contract.connect(acc1).deposit(),
        truffleAssert.ErrorType.REVERT,
        "USDC balance insufficient."
    );
  });

  it("Fails a deposit without approval", async function () {
    await truffleAssert.fails(
        contract.connect(host).deposit(),
        truffleAssert.ErrorType.REVERT,
        "Contract not approved for USDC transaction"
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
    stayIds = extractEventInfo(res, 'Listing', 'stayId');
    assert(stayIds.length > 0, "Couldn't find Listing event to extract stayId.");
    stayId = stayIds[0];
    
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

  it("can successfully bulk list", async function () {
    await usdcContract.connect(host).approve(contract.address, requiredDeposit);
    await contract.connect(host).deposit();

    bulkListings = [[payment, securityDeposit], [payment, securityDeposit], [payment, securityDeposit]];

    tx = await contract.connect(host).bulkList(bulkListings);
    res = await tx.wait();
    stayIds = extractEventInfo(res, 'Listing', 'stayId');
    assert(stayIds.length == 3, "Bulk list did not emit sufficient Listing events.")
    expect(await contract.getNumStays()).to.eq(3);
    expect(await contract.hostActiveStays(host.address)).to.eq(3);
  });

  it("can successfully modify listing but fails if non-owner tries to modify", async function () {
    await usdcContract.connect(host).approve(contract.address, requiredDeposit);
    await contract.connect(host).deposit();

    tx = await contract.connect(host).list(payment, securityDeposit);
    res = await tx.wait();
    stayIds = extractEventInfo(res, 'Listing', 'stayId');
    stayid = stayIds[0];

    newPayment = payment.add(2);
    await truffleAssert.fails(
      contract.connect(acc1).modifyListing(stayId, newPayment, securityDeposit),
      truffleAssert.ErrorType.REVERT,
      "Only owner can modify listing."
    );

    tx = await contract.connect(host).modifyListing(stayId, newPayment, securityDeposit);
    res = await tx.wait()
    modifiedPayments = extractEventInfo(res, 'ModifyListing', 'payment');
    expect(modifiedPayments[0]).to.eq(newPayment);
  });

  

});