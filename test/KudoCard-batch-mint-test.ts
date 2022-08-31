import { expect } from "chai";
import { ethers } from "hardhat";

describe("KudoCard", function () {
  describe("batchMint()", async () => {
    const tokenUris = ["uri-1", "uri-2", "uri-3"];

    it("MINTER_ROLE can mint a list of tokenURIs", async () => {
      const [deployer, user1] = await ethers.getSigners();

      const KudoCard = await ethers.getContractFactory("KudoCard");
      const contract = await KudoCard.connect(deployer).deploy();
      await contract.deployed();

      expect(await contract.balanceOf(user1.address)).to.eq(0);

      await expect(
        contract.connect(deployer).batchMint(user1.address, tokenUris)
      )
        .to.emit(contract, "BatchMinted")
        .withArgs(user1.address, [1, 2, 3], tokenUris);

      expect(await contract.balanceOf(user1.address)).to.eq(3);
    });

    it("can only be called by MINTER_ROLE", async () => {
      const [deployer, user1] = await ethers.getSigners();

      const KudoCard = await ethers.getContractFactory("KudoCard");
      const contract = await KudoCard.connect(deployer).deploy();
      await contract.deployed();

      expect(await contract.balanceOf(user1.address)).to.eq(0);

      await expect(
        contract.connect(user1).batchMint(user1.address, tokenUris)
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${ethers.utils.id(
          "MINTER_ROLE"
        )}`
      );

      expect(await contract.balanceOf(user1.address)).to.eq(0);
    });

    it("fails the batch if a tokenURI already exists", async () => {
      const [deployer, user1, user2] = await ethers.getSigners();

      const KudoCard = await ethers.getContractFactory("KudoCard");
      const contract = await KudoCard.connect(deployer).deploy();
      await contract.deployed();

      // One tokenUri already taken
      await contract.connect(deployer).safeMint(user2.address, tokenUris[0]);

      expect(await contract.balanceOf(user1.address)).to.eq(0);

      await expect(
        contract.connect(deployer).batchMint(user1.address, tokenUris)
      ).to.be.revertedWith("Already minted tokenURI");

      expect(await contract.balanceOf(user1.address)).to.eq(0);
    });
  });
});
