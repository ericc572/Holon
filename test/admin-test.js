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

describe.only("admin", function () {

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

  it("Add admin fails for non-admin", async function () {
    newAdmins = ["0xf45d030a73558032C4E89171905E09f000F78Ba5"]
    await truffleAssert.fails(
        contract.connect(guest).addAdmins(newAdmins),
        truffleAssert.ErrorType.REVERT,
        "Admin only operation"
    );
  });

  it("View fees fails for non-admin", async function () {
    await truffleAssert.fails(
        contract.connect(guest).viewFees(),
        truffleAssert.ErrorType.REVERT,
        "Admin only operation"
    );
  });

  it("Add admin works", async function () {
    newAdmins = [ethers.utils.getAddress("0xf45d030a73558032C4E89171905E09f000F78Ba5")]
    await contract.connect(host).addAdmins(newAdmins);
    await contract.connect(guest).viewFees();
  });

  it("Remove admin works", async function () {
    newAdmins = [ethers.utils.getAddress("0xf45d030a73558032C4E89171905E09f000F78Ba5")]
    await contract.connect(host).addAdmins(newAdmins);
    await contract.connect(host).removeAdmins(newAdmins);
    await truffleAssert.fails(
        contract.connect(guest).viewFees(),
        truffleAssert.ErrorType.REVERT,
        "Admin only operation"
    );
  });

  it("Admin able to change requiredDeposit and feePercent", async function () {
    await contract.connect(host).setRequiredDeposit(ethers.utils.parseUnits("2", 18));
    expect(await contract.getRequiredDeposit()).to.eq(ethers.utils.parseUnits("2", 18));
    await contract.connect(host).setFeePercent(2);
    expect(await contract.getFeePercent()).to.eq(2);
  });

  it("Admin able to view and transfer fees", async function () {
    await contract.connect(host).returnStayNFT(res.hstay);
    await contract.connect(guest).returnStayNFT(res.gstay);

    hostPayment = hostBalanceBefore.add(payment);
    hostRenumeration = hostPayment.sub(ethers.utils.parseUnits(".05", 18));
    guestPayment = guestBalanceBefore.add(securityDeposit);
    totalFee = contractBalanceBefore.add(ethers.utils.parseUnits(".05", 18)).sub(payment).sub(securityDeposit);

    fees = await contract.connect(host).viewFees();
    expect(fees).to.eq(ethers.utils.parseUnits(".05", 18));

    await contract.connect(host).transferFees(host.address);
    expect(await usdcContract.balanceOf(host.address)).to.eq(hostPayment);
    expect(await usdcContract.balanceOf(contract.address)).to.eq(requiredDeposit);
    fees = await contract.connect(host).viewFees();
    expect(fees).to.eq(0);
  });

  it("Pausing contract works", async function () {
    await contract.connect(host).pause();
    expect(await contract.paused()).to.eq(true);
    await truffleAssert.fails(
        contract.connect(host).withdrawDeposit(),
        truffleAssert.ErrorType.REVERT,
        "Pausable: paused"
    );
  });

  it("Un-pausing contract works", async function () {
    await contract.connect(host).pause();
    expect(await contract.paused()).to.eq(true);
    await truffleAssert.fails(
        contract.connect(host).returnStayNFT(res.hstay),
        truffleAssert.ErrorType.REVERT,
        "Pausable: paused"
    );

    await contract.connect(host).unpause();
    expect(await contract.paused()).to.eq(false);
    await contract.connect(host).returnStayNFT(res.hstay);
  });
  

});