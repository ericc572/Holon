const { expect } = require("chai");
const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
// const {
//   BN,           // Big Number support
//   constants,    // Common constants, like the zero address and largest integers
//   expectEvent,  // Assertions for emitted events
//   expectRevert, // Assertions for transactions that should fail
// } = require('@openzeppelin/test-helpers');

describe.only("StayManager Contract", function () {

  beforeEach(async function() {
    [host] = await ethers.getSigners();
    const k = await ethers.getContractFactory("StayManager");

    contract = await k.deploy();
  });

  it("Fails a listing without despoit", async function () {
    await truffleAssert.fails(
        contract.connect(host).list(1000),
        truffleAssert.ErrorType.REVERT,
        "Must deposit .001 MATIC."
    );
  });

  //test stake function
  it("successfully deposits an amount", async function () {
    const amt = 10 ** 10;
    await contract.connect(host).deposit({value: amt });

    expect(
      await contract.depositBalances(host.address)
    ).to.eq(amt);

  });

  //test list function before depositing
  it("successfully deposits an amount, lists stay, and isn't able to withdraw", async function () {
    const amt = 10 ** 10;
    await contract.connect(host).deposit({value: amt});
    assert.equal(await contract.depositBalances(host.address), amt);
    
    const payment = 1000;
    await contract.connect(host).list(payment);
    stayId = await contract.getStayId(await contract.getNumStays() - 1)
    res = await contract.stays(stayId);
    assert.equal(res[1], host.address);
    assert.equal(res[2], 0);
    assert.equal(res[3], true);
    assert.equal(res[4], 0);
    assert.equal(res[5], 0);
    assert.equal(res[6], payment);
    assert.equal(res[7], payment / 2);

    await truffleAssert.fails(
        contract.connect(host).withdrawDeposit(),
        truffleAssert.ErrorType.REVERT,
        "Cannot withdraw despoit unless 0 active stays."
    );
  });

  it("can successfully withdraw an amount", async function () {
    const amt = 10 ** 10;
    await contract.connect(host).deposit({value: amt });

    await contract.withdrawDeposit()

    expect(
      await contract.depositBalances(host.address)
    ).to.eq(0);

  });

  it("can successfully withdraw an amount after listing and delisting", async function () {
    const amt = 10 ** 10;
    await contract.connect(host).deposit({value: amt });
    const payment = 1000;
    await contract.connect(host).list(payment);
    stayId = await contract.getStayId(await contract.getNumStays() - 1)
    await contract.connect(host).removeListing(stayId)
    await contract.withdrawDeposit()

    expect(
      await contract.depositBalances(host.address)
    ).to.eq(0);
    assert.equal(await contract.getNumStays(), 0);
    assert.equal(await contract.hostActiveStays(host.address), 0);
  });

});