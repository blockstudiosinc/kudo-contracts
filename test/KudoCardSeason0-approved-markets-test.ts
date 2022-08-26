import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { experimentalAddHardhatNetworkMessageTraceHook } from "hardhat/config";

describe("KudoCardSeason0 approved markets", function () {
  let contract: Contract;
  let admin: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress;

  beforeEach(async () => {
    const [deployer, signer1, signer2] = await ethers.getSigners();
    admin = deployer;
    user1 = signer1;
    user2 = signer2;

    const KudoCardSeason0 = await ethers.getContractFactory("KudoCardSeason0");
    contract = await KudoCardSeason0.connect(deployer).deploy();
    await contract.deployed();
  });

  describe("setApprovedMarket()", async () => {
    it("reverts for non-admins", async () => {
      expect(await contract.approvedMarkets(user1.address)).to.eq(false);

      await expect(
        contract.connect(user1).setApprovedMarket(user1.address, true)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${
          ethers.constants.AddressZero
        }`
      );
    });

    it("allows admins to update the approved markets", async () => {
      expect(await contract.approvedMarkets(user1.address)).to.eq(false);

      await expect(
        contract.connect(admin).setApprovedMarket(user1.address, true)
      )
        .to.emit(contract, "ApprovedMarketUpdated")
        .withArgs(admin.address, user1.address, true);

      expect(await contract.approvedMarkets(user1.address)).to.eq(true);

      await contract.connect(admin).setApprovedMarket(user1.address, false);
      expect(await contract.approvedMarkets(user1.address)).to.eq(false);

      await contract.connect(admin).setApprovedMarket(user2.address, true);
      expect(await contract.approvedMarkets(user2.address)).to.eq(true);
    });

    it("allows admins to revoke the ability", async () => {
      expect(await contract.hasRevokedUpdateApprovedMarkets()).to.eq(false);

      await expect(contract.connect(admin).revokeUpdateApprovedMarkets())
        .to.emit(contract, "RevokedUpdateApprovedMarkets")
        .withArgs(admin.address);

      expect(await contract.hasRevokedUpdateApprovedMarkets()).to.eq(true);

      await expect(
        contract.connect(admin).setApprovedMarket(user1.address, false)
      ).to.be.revertedWith("Ability revoked");
    });

    it("reverts if the ability is already revoked", async () => {
      await contract.connect(admin).revokeUpdateApprovedMarkets();

      await expect(
        contract.connect(admin).revokeUpdateApprovedMarkets()
      ).to.be.revertedWith("Already revoked");
    });

    it("doesn't allow non-admins to revoke the ability", async () => {
      await expect(
        contract.connect(user1).revokeUpdateApprovedMarkets()
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${
          ethers.constants.AddressZero
        }`
      );
    });
  });
});
