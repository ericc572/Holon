const { expect } = require("chai");
// const {
//   BN,           // Big Number support
//   constants,    // Common constants, like the zero address and largest integers
//   expectEvent,  // Assertions for emitted events
//   expectRevert, // Assertions for transactions that should fail
// } = require('@openzeppelin/test-helpers');

describe.only("OwnerDeposit Contract", function () {

  beforeEach(async function() {
    [owner] = await ethers.getSigners();
    const OD = await ethers.getContractFactory("OwnerDeposit");

    depositContract = await OD.deploy();
  });


  //test stake function
  it("successfully deposits an amount", async function () {
    const amt = 10 ** 10;
    await depositContract.connect(owner).stake({value: amt });

    expect(
      await depositContract.viewBalanceOf(owner.address)
    ).to.eq(amt);

  });

  it("can successfully withdraw an amount", async function () {
    const amt = 10 ** 10;
    await depositContract.connect(owner).stake({value: amt });

    await depositContract.withdraw(owner.address)

    expect(
      await depositContract.viewBalanceOf(owner.address)
    ).to.eq(0);

  });

//test withdraw function
});