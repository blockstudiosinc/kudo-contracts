import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("KudoCardSeason0", function () {
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

  describe("safeMint()", async () => {
    it("prevents duplicate URIs from being minted", async () => {
      await contract.connect(admin).safeMint(user1.address, "some-uri");

      await expect(
        contract.connect(admin).safeMint(user2.address, "some-uri")
      ).to.be.revertedWith("Already minted tokenURI");
    });

    it("prevents non-MINTER_ROLE's from minting", async () => {
      await expect(
        contract.connect(user1).safeMint(user1.address, "some-uri")
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes("MINTER_ROLE")
        )}`
      );
    });
  });
});
