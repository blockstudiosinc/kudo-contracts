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
  let royaltyWallet: SignerWithAddress;

  beforeEach(async () => {
    const [dep, signer1, signer2, signer3] = await ethers.getSigners();
    deployer = dep;
    seller = signer1;
    buyer = signer2;
    royaltyWallet = signer3;

    // mUSDC
    const TestERC20 = await ethers.getContractFactory("TestERC20");
    tokenContract = await TestERC20.connect(deployer).deploy(price);
    await tokenContract.deployed();

    // Card
    const KudoCardSeason0 = await ethers.getContractFactory("KudoCardSeason0");
    cardContract = await KudoCardSeason0.connect(deployer).deploy();
    await cardContract.deployed();

    // Set the royalty
    await cardContract
      .connect(deployer)
      .setDefaultRoyalty(royaltyWallet.address, 1000); // 10%

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
      .safeMint(seller.address, "some-token-uri");
    expect(await cardContract.balanceOf(seller.address)).to.eq(1);

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

  it("reverts if the buyer hasn't approved the market to spend their token", async () => {
    // Give the buyer some mUSDC, but not enough
    await tokenContract.connect(deployer).transfer(buyer.address, price);

    await expect(
      marketContract.connect(buyer).buy(listingId)
    ).to.be.revertedWith("ERC20: insufficient allowance");
  });

  it("reverts if the buy doesn't have enough to buy", async () => {
    // Give the buyer some mUSDC, but not enough
    await tokenContract.connect(deployer).transfer(buyer.address, price.div(2));

    // Approve the marketplace to spend your mUSDC
    await tokenContract.connect(buyer).approve(marketContract.address, price);

    await expect(
      marketContract.connect(buyer).buy(listingId)
    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
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
      [seller, buyer, royaltyWallet],
      // Seller gets 90%, buyer pays 100%, royalty 10%
      [price.mul(9).div(10), `-${price}`, price.mul(1).div(10)]
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

  it("allows a user to buy with no royalty", async () => {
    // Set the royalty
    await cardContract
      .connect(deployer)
      .setDefaultRoyalty(royaltyWallet.address, 0);

    // Give the buyer some mUSDC
    await tokenContract.connect(deployer).transfer(buyer.address, price);

    // Approve the marketplace to spend your mUSDC
    await tokenContract.connect(buyer).approve(marketContract.address, price);

    // Buy
    await expect(() =>
      marketContract.connect(buyer).buy(listingId)
    ).to.changeTokenBalances(
      tokenContract,
      [seller, buyer, royaltyWallet],
      [price, `-${price}`, 0]
    );

    expect((await marketContract.listings(listingId)).isActive).to.eq(false);
    expect((await marketContract.listings(listingId)).isSold).to.eq(true);

    // Buyer owns NFT now
    expect(await cardContract.balanceOf(marketContract.address)).to.eq(0);
    expect(await cardContract.balanceOf(buyer.address)).to.eq(1);
  });
});
