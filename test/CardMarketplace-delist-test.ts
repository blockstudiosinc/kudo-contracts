import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("CardMarketplace.delist()", function () {
  const tokenId = 1;
  const listingId = 1;

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

    // Mint NFT
    await cardContract
      .connect(deployer)
      .safeMint(user1.address, "some-token-uri");
    expect(await cardContract.balanceOf(user1.address)).to.eq(1);

    // Manually approve for ease of testing without meta tx's
    await cardContract
      .connect(user1)
      .setApprovalForAll(marketContract.address, true);

    // List the NFT
    await marketContract.connect(user1).list(tokenId, 1000);
  });

  it("reverts if the listing doesn't exist", async () => {
    await expect(marketContract.connect(user1).delist(999)).to.be.revertedWith(
      "Invalid listing"
    );
  });

  it("reverts if the user isn't owner of the NFT", async () => {
    await expect(
      marketContract.connect(user2).delist(listingId)
    ).to.be.revertedWith("Not the seller");

    // No change
    expect(await cardContract.balanceOf(marketContract.address)).to.eq(1);
    expect(await cardContract.balanceOf(user2.address)).to.eq(0);
  });

  it("allows a user to delist their NFT", async () => {
    await expect(marketContract.connect(user1).delist(listingId))
      .to.emit(marketContract, "CardDelisted")
      .withArgs(listingId, user1.address);

    // User owns NFT again
    expect((await marketContract.listings(listingId)).isActive).to.eq(false);

    expect(await cardContract.balanceOf(marketContract.address)).to.eq(0);
    expect(await cardContract.balanceOf(user1.address)).to.eq(1);
  });

  it("allows a user to delist and relist their NFT", async () => {
    // Delist
    await marketContract.connect(user1).delist(listingId);
    expect((await marketContract.listings(listingId)).isActive).to.eq(false);

    expect(await cardContract.balanceOf(marketContract.address)).to.eq(0);
    expect(await cardContract.balanceOf(user1.address)).to.eq(1);

    // Relist
    await marketContract.connect(user1).list(tokenId, 1000);
    expect((await marketContract.listings(listingId + 1)).isActive).to.eq(true);

    expect(await cardContract.balanceOf(user1.address)).to.eq(0);
    expect(await cardContract.balanceOf(marketContract.address)).to.eq(1);
  });
});
