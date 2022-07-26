import {
  TransactionReceipt,
  TransactionRequest,
} from "@ethersproject/providers";
import { expect } from "chai";
import { Interface } from "ethers/lib/utils";
import { ethers } from "hardhat";

describe("KudoCardSeason0", function () {
  describe("meta transactions", async () => {
    it("works", async () => {
      const [deployer, forwarder, user1, user2] = await ethers.getSigners();

      console.log("deployer", deployer.address);
      console.log("forwarder", forwarder.address);
      console.log("user1", user1.address);
      console.log("user2", user2.address);

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

      await forwarder.sendTransaction(transactionRequest);

      // Assert it was transferred to user2
      expect(await contract.ownerOf(tokenId)).to.eq(user2.address);
    });
  });

  // it("Should return the new greeting once it's changed", async function () {
  //   const Greeter = await ethers.getContractFactory("Greeter");
  //   const greeter = await Greeter.deploy("Hello, world!");
  //   await greeter.deployed();

  //   expect(await greeter.greet()).to.equal("Hello, world!");

  //   const setGreetingTx = await greeter.setGreeting("Hola, mundo!");

  //   // wait until the transaction is mined
  //   await setGreetingTx.wait();

  //   expect(await greeter.greet()).to.equal("Hola, mundo!");
  // });
});
