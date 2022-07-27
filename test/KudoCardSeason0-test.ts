import { TransactionRequest } from "@ethersproject/providers";
import { expect } from "chai";
import { Interface } from "ethers/lib/utils";
import { ethers } from "hardhat";

describe("KudoCardSeason0", function () {
  describe("meta transactions", async () => {
    it("doesn't work if not sent from the forwarder address", async () => {
      const [deployer, forwarder, user1, user2] = await ethers.getSigners();

      const KudoCardSeason0 = await ethers.getContractFactory(
        "KudoCardSeason0"
      );
      const contract = await KudoCardSeason0.connect(deployer).deploy(
        forwarder.address
      );
      await contract.deployed();

      // Give user1 the NFT
      await contract.connect(deployer).safeMint(user1.address, "some.uri");

      const tokenId = 0;

      // Meta-tx transfer it
      const i: Interface = new Interface([
        "function transferFrom(address from,address to,uint256 tokenId)",
      ]);
      const functionSignature: string = i.getSighash("transferFrom");

      // Append the extra user1.address which is looked at in _msgSender to find the actual signer
      const transactionRequest: TransactionRequest = {
        to: contract.address,
        data: ethers.utils.hexConcat([
          functionSignature,
          ethers.utils.defaultAbiCoder.encode(
            ["address", "address", "uint256", "address"],
            [user1.address, user2.address, tokenId, user1.address]
          ),
        ]),
      };

      // Not sending from the forwarder address, shouldn't work.
      await expect(
        user2.sendTransaction(transactionRequest)
      ).to.be.revertedWith("ERC721: caller is not token owner nor approved");

      // Assert nothing was transferred
      expect(await contract.ownerOf(tokenId)).to.eq(user1.address);
    });

    it("works from the forwarder address", async () => {
      const [deployer, forwarder, user1, user2] = await ethers.getSigners();

      const KudoCardSeason0 = await ethers.getContractFactory(
        "KudoCardSeason0"
      );
      const contract = await KudoCardSeason0.connect(deployer).deploy(
        forwarder.address
      );
      await contract.deployed();

      // Give user1 the NFT
      await contract.connect(deployer).safeMint(user1.address, "some.uri");

      const tokenId = 0;

      // Meta-tx transfer it
      const i: Interface = new Interface([
        "function transferFrom(address from,address to,uint256 tokenId)",
      ]);
      const functionSignature: string = i.getSighash("transferFrom");

      // Append the extra user1.address which is looked at in _msgSender to find the actual signer
      const transactionRequest: TransactionRequest = {
        to: contract.address,
        data: ethers.utils.hexConcat([
          functionSignature,
          ethers.utils.defaultAbiCoder.encode(
            ["address", "address", "uint256", "address"],
            [user1.address, user2.address, tokenId, user1.address]
          ),
        ]),
      };

      // Shouldn't use any gas from user1
      await expect(() =>
        forwarder.sendTransaction(transactionRequest)
      ).to.changeEtherBalance(user1, 0);

      // Assert it was transferred to user2
      expect(await contract.ownerOf(tokenId)).to.eq(user2.address);
    });
  });
});
