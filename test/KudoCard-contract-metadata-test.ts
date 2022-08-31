import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("KudoCard contract metadata", function () {
  const url: string = "https://some.url";

  let contract: Contract;
  let admin: SignerWithAddress, user1: SignerWithAddress;

  beforeEach(async () => {
    const [deployer, signer1] = await ethers.getSigners();
    admin = deployer;
    user1 = signer1;

    const KudoCard = await ethers.getContractFactory("KudoCard");
    contract = await KudoCard.connect(deployer).deploy();
    await contract.deployed();
  });

  it("non-admins can't update the metadata", async () => {
    await expect(
      contract.connect(user1).setContractMetadataURL(url)
    ).to.be.revertedWith(
      `AccessControl: account ${user1.address.toLowerCase()} is missing role ${
        ethers.constants.AddressZero
      }`
    );
  });

  it("admins can set the contract metadata information", async () => {
    expect(await contract.contractURI()).to.eq("");

    await expect(contract.connect(admin).setContractMetadataURL(url))
      .to.emit(contract, "ContractMetadataURLUpdated")
      .withArgs(admin.address, url);

    expect(await contract.contractURI()).to.eq(url);

    await expect(
      contract.connect(admin).setContractMetadataURL(url)
    ).to.be.revertedWith("No change");
  });
});
