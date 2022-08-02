import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("CardMarketplace", function () {
  let marketContract: Contract;
  let cardContract: Contract;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async () => {
    const [deployer, signer1, signer2] = await ethers.getSigners();
    user1 = signer1;
    user2 = signer2;

    // mUSDC
    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const testERC20Contract = await TestERC20.connect(deployer).deploy(10000);
    await testERC20Contract.deployed();

    // Card
    const KudoCardSeason0 = await ethers.getContractFactory("KudoCardSeason0");
    cardContract = await KudoCardSeason0.connect(deployer).deploy();
    await cardContract.deployed();

    // Market
    const CardMarketplace = await ethers.getContractFactory("CardMarketplace");
    marketContract = await CardMarketplace.connect(deployer).deploy(
      cardContract.address,
      testERC20Contract.address
    );
    await marketContract.deployed();

    // Set the market as the forwarder for NFT for meta tx's
    await cardContract
      .connect(deployer)
      .updateTrustedForwarder(marketContract.address);

    // Mint NFT
    await cardContract
      .connect(deployer)
      .safeMint(user1.address, "some-token-uri");
    expect(await cardContract.balanceOf(user1.address)).to.eq(1);
  });

  describe("list()", async () => {
    it("reverts if the user isn't owner of the NFT", async () => {
      // List NFT
      const tokenId = 0;
      const price = 10000;

      await expect(
        marketContract.connect(user2).list(tokenId, price)
      ).to.be.revertedWith("Not card owner");

      // No change
      expect(await cardContract.balanceOf(user1.address)).to.eq(1);
      expect(await cardContract.balanceOf(user2.address)).to.eq(0);
    });

    it("reverts if the price isn't valid", async () => {
      // List NFT
      const tokenId = 0;
      const price = 0;

      await expect(
        marketContract.connect(user1).list(tokenId, price)
      ).to.be.revertedWith("Price can't be 0");

      // No change
      expect(await cardContract.balanceOf(user1.address)).to.eq(1);
      expect(await cardContract.balanceOf(user2.address)).to.eq(0);
    });

    it("won't list an NFT twice", async () => {
      // List NFT
      const tokenId = 0;
      const price = 10000;

      await expect(marketContract.connect(user1).list(tokenId, price))
        .to.emit(marketContract, "CardListed")
        .withArgs(user1.address, tokenId, price);

      await expect(
        marketContract.connect(user1).list(tokenId, price)
      ).to.be.revertedWith("Not card owner");
    });

    it("allows a user to list their NFT", async () => {
      // List NFT
      const tokenId = 0;
      const price = 10000;

      await expect(marketContract.connect(user1).list(tokenId, price))
        .to.emit(marketContract, "CardListed")
        .withArgs(user1.address, tokenId, price);

      // Market owns NFT now
      expect(await cardContract.balanceOf(user1.address)).to.eq(0);
      expect(await cardContract.balanceOf(marketContract.address)).to.eq(1);
    });
  });
});
