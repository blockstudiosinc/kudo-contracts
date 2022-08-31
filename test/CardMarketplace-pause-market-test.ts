import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("CardMarketplace pause market", function () {
  const tokenId = 1;
  const listingId = 1;
  const price = 1000;

  let tokenContract: Contract;
  let marketContract: Contract;
  let cardContract: Contract;

  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async () => {
    const [dep, signer1, signer2] = await ethers.getSigners();
    deployer = dep;
    user1 = signer1;
    user2 = signer2;

    // mUSDC
    const TestERC20 = await ethers.getContractFactory("TestERC20");
    tokenContract = await TestERC20.connect(deployer).deploy(10000);
    await tokenContract.deployed();

    // Card
    const KudoCard = await ethers.getContractFactory("KudoCard");
    cardContract = await KudoCard.connect(deployer).deploy();
    await cardContract.deployed();

    // Market
    const CardMarketplace = await ethers.getContractFactory("CardMarketplace");
    marketContract = await CardMarketplace.connect(deployer).deploy(
      cardContract.address,
      tokenContract.address,
      ethers.constants.AddressZero
    );
    await marketContract.deployed();

    // Auto-approve the market
    await cardContract
      .connect(deployer)
      .setApprovedMarket(marketContract.address, true);

    // Mint NFT
    await cardContract
      .connect(deployer)
      .safeMint(user1.address, "some-token-uri");
    expect(await cardContract.balanceOf(user1.address)).to.eq(1);
  });

  it("reverts if non-admins try to pause", async () => {
    await expect(
      marketContract.connect(user1).pauseMarket(true)
    ).to.be.revertedWith(
      `AccessControl: account ${user1.address.toLowerCase()} is missing role ${
        ethers.constants.AddressZero
      }`
    );
  });

  it("allows admins to pause", async () => {
    expect(await marketContract.marketIsPaused()).to.eq(false);

    await expect(marketContract.connect(deployer).pauseMarket(true))
      .to.emit(marketContract, "MarketPaused")
      .withArgs(deployer.address, true);

    expect(await marketContract.marketIsPaused()).to.eq(true);

    await expect(
      marketContract.connect(deployer).pauseMarket(true)
    ).to.be.revertedWith("No change");

    await expect(marketContract.connect(deployer).pauseMarket(false))
      .to.emit(marketContract, "MarketPaused")
      .withArgs(deployer.address, false);

    await expect(
      marketContract.connect(deployer).pauseMarket(false)
    ).to.be.revertedWith("No change");
  });

  it("allows pausing of new listings", async () => {
    await marketContract.connect(deployer).pauseMarket(true);

    await expect(
      marketContract.connect(user1).list(tokenId, 1000)
    ).to.be.revertedWith("Market paused");
  });

  it("doesn't allow buying when paused", async () => {
    // Set the royalty
    await cardContract
      .connect(deployer)
      .setDefaultRoyalty(deployer.address, 10);

    // List
    await marketContract.connect(user1).list(tokenId, price);

    // Pause listing
    await marketContract.connect(deployer).pauseMarket(true);

    // Give the buyer some mUSDC
    await tokenContract.connect(deployer).transfer(user2.address, price);

    // Approve the marketplace to spend your mUSDC
    await tokenContract.connect(user2).approve(marketContract.address, price);

    // Buy
    await expect(
      marketContract.connect(user2).buy(listingId)
    ).to.be.revertedWith("Market paused");
  });

  it("doesn't allow de-listing when paused", async () => {
    // List
    await marketContract.connect(user1).list(tokenId, price);

    // Pause listing
    await marketContract.connect(deployer).pauseMarket(true);

    // Delist
    await expect(
      marketContract.connect(user1).delist(listingId)
    ).to.be.revertedWith("Market paused");
  });
});
