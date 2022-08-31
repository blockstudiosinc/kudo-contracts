import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";

describe("KudoCard royalties", function () {
  let contract: Contract;
  let admin: SignerWithAddress,
    user1: SignerWithAddress,
    royaltyWallet: SignerWithAddress;

  const tokenId = 1;

  beforeEach(async () => {
    const [deployer, signer1, signer2] = await ethers.getSigners();
    admin = deployer;
    user1 = signer1;
    royaltyWallet = signer2;

    const KudoCard = await ethers.getContractFactory("KudoCard");
    contract = await KudoCard.connect(deployer).deploy();
    await contract.deployed();

    await contract.connect(admin).safeMint(user1.address, "token-uri-1");
  });

  it("non-admins can't update the royalty information", async () => {
    await expect(
      contract.connect(user1).setDefaultRoyalty(royaltyWallet.address, 1000)
    ).to.be.revertedWith(
      `AccessControl: account ${user1.address.toLowerCase()} is missing role ${
        ethers.constants.AddressZero
      }`
    );
  });

  it("royalty can't be more than 10%", async () => {
    await expect(
      contract.connect(admin).setDefaultRoyalty(royaltyWallet.address, 2000)
    ).to.be.revertedWith("Fee too high");
  });

  it("admins can set the royalty information", async () => {
    // Default
    let info = await contract.royaltyInfo(tokenId, 10);
    expect(info[0]).to.eq(ethers.constants.AddressZero);
    expect(info[1]).to.eq(BigNumber.from(0));

    await expect(
      contract.connect(admin).setDefaultRoyalty(royaltyWallet.address, 1000)
    )
      .to.emit(contract, "RoyaltyUpdated")
      .withArgs(admin.address, royaltyWallet.address, 1000);

    info = await contract.royaltyInfo(tokenId, 10);
    expect(info[0]).to.eq(royaltyWallet.address);
    expect(info[1]).to.eq(BigNumber.from(1));
  });
});
