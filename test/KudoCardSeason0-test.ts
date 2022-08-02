import { TransactionRequest } from "@ethersproject/providers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract, Signer } from "ethers";
import { Interface } from "ethers/lib/utils";
import { ethers } from "hardhat";

describe("KudoCardSeason0", function () {
  let contract: Contract;
  let admin: SignerWithAddress,
    forwarder: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress;

  beforeEach(async () => {
    const [deployer, fwd, signer1, signer2] = await ethers.getSigners();
    admin = deployer;
    forwarder = fwd;
    user1 = signer1;
    user2 = signer2;

    const KudoCardSeason0 = await ethers.getContractFactory("KudoCardSeason0");
    contract = await KudoCardSeason0.connect(deployer).deploy();
    await contract.deployed();

    await contract.connect(deployer).updateTrustedForwarder(forwarder.address);
  });

  describe("safeMint()", async () => {
    it("it prevents duplicate URIs from being minted", async () => {
      await contract.safeMint(user1.address, "some-uri");

      await expect(
        contract.safeMint(user2.address, "some-uri")
      ).to.be.revertedWith("Already minted tokenURI");
    });
  });

  describe("meta transactions", async () => {
    it("doesn't work if not sent from the forwarder address", async () => {
      // Give user1 the NFT
      await contract.connect(admin).safeMint(user1.address, "some.uri");

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
      // Give user1 the NFT
      await contract.connect(admin).safeMint(user1.address, "some.uri");

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
