const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Kudo Contract", function () {
  let Kudo;
  let kudo;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    Kudo = await ethers.getContractFactory("Kudo");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    console.log("owner", owner.address);
    kudo = await Kudo.deploy(1);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      console.log("Owner address %s", owner.address);
      console.log("Contract address %s", kudo.address);
      expect(await kudo.owner()).to.equal(owner.address);
    });
    it("Should set max per wallet", async function () {
      expect(await kudo.MAX_PER_WALLET()).to.equal(1);
    });
  });
  describe("Minting", function () {
    // it("Should be able to mint with 0.1Ξ", async function () {
    //   await expect(kudo.connect(addr1).mint({ value: ethers.utils.parseEther("0.1") }))
    //     .to.emit(kudo, "NewMint")
    //     .withArgs(addr1.address, 1);
    // });

    // it("Should not allow to mint more than one", async () => {
    //   const STARTING_NEW_ITEM_ID = "1";
    //   await expect(kudo.connect(addr1).mint({ value: ethers.utils.parseEther("0.1") }))
    //     .to.emit(kudo, "NewMint")
    //     .withArgs(
    //       addr1.address,
    //       STARTING_NEW_ITEM_ID
    //     );
    // });

    // describe("balanceOf", () => {
    //   it("Should get the count of NFTs for an address", async () => {
    //     await expect(await kudo.balanceOf(owner.address)).to.eq("0");

    //     // await expect(kudo.mint({ value: ethers.utils.parseEther("0.1") }));

    //     expect(await kudo.balanceOf(owner.address)).to.eq("1");
    //   });
    // });
  }); // End Minting
  describe("Owner", function () {
    it("Should allow owner to withdraw funds", async () => {
      await expect(kudo.connect(addr1).mint({ value: ethers.utils.parseEther("0.1") }))
      await expect(kudo.connect(addr2).mint({ value: ethers.utils.parseEther("0.1") }))

      provider = ethers.provider;
      balance1 = await provider.getBalance(owner.address);
      await expect(await kudo.withdraw());
      balance2 = await provider.getBalance(owner.address);
      await expect(balance2 > balance1);
    });
  }); // End Owner functions
}); // End Contract
