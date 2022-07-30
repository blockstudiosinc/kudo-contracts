import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERC2771ContextUpdatable", function () {
  describe("updateTrustedForwarder", async () => {
    it("works for admins", async () => {
      const [deployer, forwarder, newForwarder] = await ethers.getSigners();

      const KudoCardSeason0 = await ethers.getContractFactory(
        "KudoCardSeason0"
      );
      const contract = await KudoCardSeason0.connect(deployer).deploy(
        forwarder.address
      );
      await contract.deployed();

      expect(await contract.trustedForwarder()).to.eq(forwarder.address);

      await expect(
        contract.connect(deployer).updateTrustedForwarder(newForwarder.address)
      )
        .to.emit(contract, "ForwarderUpdated")
        .withArgs(newForwarder.address);

      expect(await contract.trustedForwarder()).to.eq(newForwarder.address);
    });

    it("doesn't update to the same address or address 0", async () => {
      const [deployer, forwarder] = await ethers.getSigners();

      const KudoCardSeason0 = await ethers.getContractFactory(
        "KudoCardSeason0"
      );
      const contract = await KudoCardSeason0.connect(deployer).deploy(
        forwarder.address
      );
      await contract.deployed();

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
      const [deployer, forwarder, newForwarder, user1] =
        await ethers.getSigners();

      const KudoCardSeason0 = await ethers.getContractFactory(
        "KudoCardSeason0"
      );
      const contract = await KudoCardSeason0.connect(deployer).deploy(
        forwarder.address
      );
      await contract.deployed();

      expect(await contract.trustedForwarder()).to.eq(forwarder.address);

      await expect(
        contract.connect(user1).updateTrustedForwarder(newForwarder.address)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${
          ethers.constants.HashZero
        }`
      );

      expect(await contract.trustedForwarder()).to.eq(forwarder.address);
    });
  });
});
