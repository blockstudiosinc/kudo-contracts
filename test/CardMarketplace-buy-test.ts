import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("CardMarketplace.buy()", function () {
  const tokenId = 1;
  const listingId = 1;
  const price = ethers.utils.parseUnits("10", 18);

  let marketContract: Contract;
  let tokenContract: Contract;
  let cardContract: Contract;
  let deployer: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;

  beforeEach(async () => {
    const [dep, signer1, signer2] = await ethers.getSigners();
    deployer = dep;
    seller = signer1;
    buyer = signer2;

    // mUSDC
    const TestERC20 = await ethers.getContractFactory("TestERC20");
    tokenContract = await TestERC20.connect(deployer).deploy(price);
    await tokenContract.deployed();

    // Card
    const KudoCardSeason0 = await ethers.getContractFactory("KudoCardSeason0");
    cardContract = await KudoCardSeason0.connect(deployer).deploy();
    await cardContract.deployed();

    // Market
    const CardMarketplace = await ethers.getContractFactory("CardMarketplace");
    marketContract = await CardMarketplace.connect(deployer).deploy(
      cardContract.address,
      tokenContract.address,
      ethers.constants.AddressZero
    );
    await marketContract.deployed();

    // Mint NFT
    await cardContract
      .connect(deployer)
      .safeMint(seller.address, "some-token-uri");
    expect(await cardContract.balanceOf(seller.address)).to.eq(1);

    // Approve contract to list
    await cardContract.connect(seller).approve(marketContract.address, tokenId);

    // List NFT
    await marketContract.connect(seller).list(tokenId, price);
    expect((await marketContract.listings(listingId)).isActive).to.eq(true);
  });

  it("reverts if the listing doesn't exist", async () => {
    await expect(marketContract.connect(buyer).buy(999)).to.be.revertedWith(
      "Invalid listing"
    );
  });

  it("reverts if the listing isn't active", async () => {
    await marketContract.connect(seller).delist(listingId);

    await expect(
      marketContract.connect(buyer).buy(listingId)
    ).to.be.revertedWith("Invalid listing");
  });

  it("reverts if the user buying is the seller", async () => {
    await expect(
      marketContract.connect(seller).buy(listingId)
    ).to.be.revertedWith("Buyer is seller");
  });

  it("reverts if the listing is already sold", async () => {
    // Give the buyer some mUSDC
    await tokenContract.connect(deployer).transfer(buyer.address, price);

    // Approve the marketplace to spend your mUSDC
    await tokenContract.connect(buyer).approve(marketContract.address, price);

    // Buy
    await marketContract.connect(buyer).buy(listingId);

    // Try to buy again
    await expect(
      marketContract.connect(buyer).buy(listingId)
    ).to.be.revertedWith("Invalid listing");
  });

  it("allows a user to buy", async () => {
    // Give the buyer some mUSDC
    await tokenContract.connect(deployer).transfer(buyer.address, price);

    // Approve the marketplace to spend your mUSDC
    await tokenContract.connect(buyer).approve(marketContract.address, price);

    // Buy
    await expect(() =>
      marketContract.connect(buyer).buy(listingId)
    ).to.changeTokenBalances(
      tokenContract,
      [seller, buyer],
      [price, `-${price}`]
    );

    // TODO can we also do these matchers?
    // .to.emit(marketContract, "CardSold")
    // .withArgs(listingId, seller.address, buyer.address, price);

    expect((await marketContract.listings(listingId)).isActive).to.eq(false);
    expect((await marketContract.listings(listingId)).isSold).to.eq(true);

    // Buyer owns NFT now
    expect(await cardContract.balanceOf(marketContract.address)).to.eq(0);
    expect(await cardContract.balanceOf(buyer.address)).to.eq(1);
  });
});
