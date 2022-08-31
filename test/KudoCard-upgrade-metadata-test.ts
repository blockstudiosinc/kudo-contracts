import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("KudoCard upgrade metadata", function () {
  let contract: Contract;
  let admin: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress;

  const tokenIds = [1, 3];
  const newTokenURIs = ["new-uri-1", "new-uri-3"];

  beforeEach(async () => {
    const [deployer, signer1, signer2] = await ethers.getSigners();
    admin = deployer;
    user1 = signer1;
    user2 = signer2;

    const KudoCard = await ethers.getContractFactory("KudoCard");
    contract = await KudoCard.connect(deployer).deploy();
    await contract.deployed();

    await contract.connect(admin).safeMint(user1.address, "token-uri-1");
    await contract.connect(admin).safeMint(user1.address, "token-uri-2");
    await contract.connect(admin).safeMint(user2.address, "token-uri-3");

    expect(await contract.balanceOf(user1.address)).to.eq(2);
    expect(await contract.balanceOf(user2.address)).to.eq(1);
  });

  describe("setTokenUris()", async () => {
    it("reverts if not MINTER_ROLE", async () => {
      await expect(
        contract.connect(user1).setTokenURIs(tokenIds, newTokenURIs)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes("MINTER_ROLE")
        )}`
      );

      // No change
      expect(await contract.tokenURI(1)).to.eq("ipfs://token-uri-1");
      expect(await contract.tokenURI(2)).to.eq("ipfs://token-uri-2");
      expect(await contract.tokenURI(3)).to.eq("ipfs://token-uri-3");
    });

    it("reverts if different amount of IDs or URIs is passed", async () => {
      await expect(
        contract.connect(admin).setTokenURIs([], [])
      ).to.be.revertedWith("Invalid data");

      await expect(
        contract.connect(admin).setTokenURIs([1], ["1", "2"])
      ).to.be.revertedWith("Data mismatch");

      // No change
      expect(await contract.tokenURI(1)).to.eq("ipfs://token-uri-1");
      expect(await contract.tokenURI(2)).to.eq("ipfs://token-uri-2");
      expect(await contract.tokenURI(3)).to.eq("ipfs://token-uri-3");
    });

    it("reverts if update is revoked", async () => {
      await contract.revokeSetTokenURI();

      await expect(
        contract.connect(admin).setTokenURIs(tokenIds, newTokenURIs)
      ).to.be.revertedWith("Revoked ability");

      // No change
      expect(await contract.tokenURI(1)).to.eq("ipfs://token-uri-1");
      expect(await contract.tokenURI(2)).to.eq("ipfs://token-uri-2");
      expect(await contract.tokenURI(3)).to.eq("ipfs://token-uri-3");
    });

    it("works if MINTER_ROLE and correct params", async () => {
      await expect(contract.connect(admin).setTokenURIs(tokenIds, newTokenURIs))
        .to.emit(contract, "TokenURIsUpdated")
        .withArgs(admin.address, tokenIds, newTokenURIs);

      // Changed
      expect(await contract.tokenURI(1)).to.eq("ipfs://new-uri-1");
      expect(await contract.tokenURI(3)).to.eq("ipfs://new-uri-3");

      // Old URIs no longer in use, new URIs in use
      expect(await contract.tokenURIs("token-uri-1")).to.eq(0);
      expect(await contract.tokenURIs("token-uri-3")).to.eq(0);

      expect(await contract.tokenURIs("new-uri-1")).to.eq(1);
      expect(await contract.tokenURIs("new-uri-3")).to.eq(3);

      // No change
      expect(await contract.tokenURI(2)).to.eq("ipfs://token-uri-2");
    });
  });

  describe("revokeSetTokenURI()", async () => {
    it("reverts if not DEFAULT_ADMIN_ROLE", async () => {
      expect(await contract.hasRevokedSetTokenURI()).to.eq(false);

      await expect(
        contract.connect(user1).revokeSetTokenURI()
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${
          ethers.constants.AddressZero
        }`
      );

      expect(await contract.hasRevokedSetTokenURI()).to.eq(false);
    });

    it("reverts if already revoked", async () => {
      expect(await contract.hasRevokedSetTokenURI()).to.eq(false);

      await contract.connect(admin).revokeSetTokenURI();
      expect(await contract.hasRevokedSetTokenURI()).to.eq(true);

      await expect(
        contract.connect(admin).revokeSetTokenURI()
      ).to.be.revertedWith("Already revoked");
    });

    it("works if DEFAULT_ADMIN_ROLE", async () => {
      expect(await contract.hasRevokedSetTokenURI()).to.eq(false);

      await expect(contract.connect(admin).revokeSetTokenURI())
        .to.emit(contract, "RevokedSetTokenURI")
        .withArgs(admin.address);

      expect(await contract.hasRevokedSetTokenURI()).to.eq(true);
    });
  });
});
