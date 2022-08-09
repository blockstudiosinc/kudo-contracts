import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";

describe("CardMarketplace.list()", function () {
  const tokenId = 1;

  let marketContract: Contract;
  let cardContract: Contract;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  beforeEach(async () => {
    const [deployer, signer1, signer2, signer3] = await ethers.getSigners();
    user1 = signer1;
    user2 = signer2;
    user3 = signer3;

    // Card
    const KudoCardSeason0 = await ethers.getContractFactory("KudoCardSeason0");
    cardContract = await KudoCardSeason0.connect(deployer).deploy();
    await cardContract.deployed();

    // Market
    const CardMarketplace = await ethers.getContractFactory("CardMarketplace");
    marketContract = await CardMarketplace.connect(deployer).deploy(
      cardContract.address,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero
    );
    await marketContract.deployed();

    // Mint NFT
    await cardContract
      .connect(deployer)
      .safeMint(user1.address, "some-token-uri");

    await cardContract
      .connect(deployer)
      .safeMint(user2.address, "some-token-uri-2");
    expect(await cardContract.balanceOf(user2.address)).to.eq(1);

    await cardContract
      .connect(deployer)
      .safeMint(user1.address, "some-token-uri-3");
    expect(await cardContract.balanceOf(user1.address)).to.eq(2);

    // Approve the transfer
    await cardContract
      .connect(user1)
      .setApprovalForAll(marketContract.address, true);
    await cardContract
      .connect(user2)
      .setApprovalForAll(marketContract.address, true);

    // List the NFTs
    await marketContract.connect(user1).list(tokenId, 1000);
    await marketContract.connect(user2).list(2, 1000);
    await marketContract.connect(user1).list(3, 1000);
  });

  it("returns empty if the user has no listings", async () => {
    const result = await marketContract.getListings(user3.address);
    expect(result.length).to.eq(0);
  });

  it("returns the user's listings", async () => {
    const result = await marketContract.getListings(user1.address);
    expect(result.length).to.eq(2);

    const listing1 = result[0];
    expect(listing1.listingId).to.eq(BigNumber.from(1));
    expect(listing1.tokenId).to.eq(BigNumber.from(tokenId));
    expect(listing1.price).to.eq(BigNumber.from(1000));
    expect(listing1.seller).to.eq(user1.address);
    expect(listing1.isActive).to.eq(true);
    expect(listing1.isSold).to.eq(false);

    const listing2 = result[1];
    expect(listing2.listingId).to.eq(BigNumber.from(3));
    expect(listing2.tokenId).to.eq(BigNumber.from(3));
    expect(listing2.price).to.eq(BigNumber.from(1000));
    expect(listing2.seller).to.eq(user1.address);
    expect(listing2.isActive).to.eq(true);
    expect(listing2.isSold).to.eq(false);
  });
});
