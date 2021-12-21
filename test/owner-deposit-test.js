const { expect } = require("chai");
const {
  BN,           // Big Number support
  constants,    // Common constants, like the zero address and largest integers
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

describe.only("OwnerDeposit Contract", function () {

  beforeEach(async function() {
    [owner] = await ethers.getSigners();
    const OD = await ethers.getContractFactory("OwnerDeposit");

    depositContract = await OD.deploy();
  });


  //test stake function
  it("successfully deposits an amount", async function () {

    await depositContract
          .connect(owner)
          .stake({value: 10 ** 10 });

    console.log(await depositContract.viewBalanceOf(owner.address).toString());

    // expect(
    //   await depositContract.viewBalanceOf(owner.address)
    // ).to.eq(10 ** 10);

  });

  // it("can successfully withdraw an amount", async function () {
  //   console.log(10 ** 10);
  //   await depositContract
  //         .connect(owner)
  //         .stake({ value: 10 ** 10 });

  //   console.log(await depositContract.viewBalanceOf(owner.address));

    // expect(
    //   await depositContract.viewBalanceOf(owner.address)
    // ).to.eq(10 ** 10);

  // });

//test withdraw function
});