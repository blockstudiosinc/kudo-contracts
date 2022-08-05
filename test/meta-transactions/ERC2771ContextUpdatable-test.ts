import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("ERC2771ContextUpdatable", function () {
  let contract: Contract;

  let deployer: SignerWithAddress;
  let forwarder: SignerWithAddress;
  let newForwarder: SignerWithAddress;
  let nonAdmin: SignerWithAddress;

  beforeEach(async () => {
    const [dep, fwd, newFwd, u] = await ethers.getSigners();

    deployer = dep;
    forwarder = fwd;
    newForwarder = newFwd;
    nonAdmin = u;

    const CardMarketplace = await ethers.getContractFactory("CardMarketplace");
    contract = await CardMarketplace.connect(deployer).deploy(
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero
    );
    await contract.deployed();
  });

  describe("updateTrustedForwarder", async () => {
    it("works for admins", async () => {
      await contract
        .connect(deployer)
        .updateTrustedForwarder(forwarder.address);

      expect(await contract.trustedForwarder()).to.eq(forwarder.address);

      await expect(
        contract.connect(deployer).updateTrustedForwarder(newForwarder.address)
      )
        .to.emit(contract, "ForwarderUpdated")
        .withArgs(newForwarder.address);

      expect(await contract.trustedForwarder()).to.eq(newForwarder.address);
    });

    it("doesn't update to the same address or address 0", async () => {
      await contract
        .connect(deployer)
        .updateTrustedForwarder(forwarder.address);

      expect(await contract.trustedForwarder()).to.eq(forwarder.address);

      await expect(
        contract
          .connect(deployer)
          .updateTrustedForwarder(ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid forwarder address");

      await expect(
        contract.connect(deployer).updateTrustedForwarder(forwarder.address)
      ).to.be.revertedWith("Already the forwarder");

      expect(await contract.trustedForwarder()).to.eq(forwarder.address);
    });

    it("doesn't work for non-admins", async () => {
      await contract
        .connect(deployer)
        .updateTrustedForwarder(forwarder.address);

      expect(await contract.trustedForwarder()).to.eq(forwarder.address);

      await expect(
        contract.connect(nonAdmin).updateTrustedForwarder(newForwarder.address)
      ).to.be.revertedWith(
        `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${
          ethers.constants.HashZero
        }`
      );

      expect(await contract.trustedForwarder()).to.eq(forwarder.address);
    });
  });
});
