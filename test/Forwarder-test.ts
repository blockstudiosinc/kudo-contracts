import { expect } from "chai";
import { Contract } from "ethers";
import { Interface } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { Context } from "mocha";

describe("Forwarder", function () {
  describe("execute", async () => {
    it("works with a valid signature", async () => {
      const [deployer, kudoWallet, user1] = await ethers.getSigners();

      const Forwarder = await ethers.getContractFactory("Forwarder");
      const forwarderContract = await Forwarder.connect(deployer).deploy();
      await forwarderContract.deployed();

      const KudoCardSeason0 = await ethers.getContractFactory(
        "KudoCardSeason0"
      );
      const cardContract = await KudoCardSeason0.connect(deployer).deploy(
        forwarderContract.address
      );
      await cardContract.deployed();

      expect(await forwarderContract.getNonce(user1.address)).to.eq(0);

      let request = await buildRequest(
        user1.address,
        forwarderContract,
        cardContract.address
      );

      // Note: This function is an experimental feature and may remove the _ at some point
      let signature: string = await user1._signTypedData(
        request.domain,
        request.types,
        request.message
      );

      await forwarderContract
        .connect(kudoWallet)
        .execute(request.message, signature);

      expect(await forwarderContract.getNonce(user1.address)).to.eq(1);

      // Send another request
      request = await buildRequest(
        user1.address,
        forwarderContract,
        cardContract.address
      );

      // Note: This function is an experimental feature and may remove the _ at some point
      signature = await user1._signTypedData(
        request.domain,
        request.types,
        request.message
      );

      await forwarderContract
        .connect(kudoWallet)
        .execute(request.message, signature);

      expect(await forwarderContract.getNonce(user1.address)).to.eq(2);
    });

    it("doesn't work with an invalid signature", async () => {
      const [deployer, kudoWallet, user1] = await ethers.getSigners();

      const Forwarder = await ethers.getContractFactory("Forwarder");
      const forwarderContract = await Forwarder.connect(deployer).deploy();
      await forwarderContract.deployed();

      const KudoCardSeason0 = await ethers.getContractFactory(
        "KudoCardSeason0"
      );
      const cardContract = await KudoCardSeason0.connect(deployer).deploy(
        forwarderContract.address
      );
      await cardContract.deployed();

      expect(await forwarderContract.getNonce(user1.address)).to.eq(0);

      const request = await buildRequest(
        user1.address,
        forwarderContract,
        cardContract.address
      );

      request.message.nonce = 999999;

      const invalidSignature: string = await user1._signTypedData(
        request.domain,
        request.types,
        request.message
      );

      await expect(
        forwarderContract
          .connect(kudoWallet)
          .execute(request.message, invalidSignature)
      ).to.be.revertedWith(
        "MinimalForwarder: signature does not match request"
      );

      expect(await forwarderContract.getNonce(user1.address)).to.eq(0);
    });
  });
});

const buildRequest = async (
  fromAddress: string,
  forwarderContract: Contract,
  contractToCallAddress: string
) => {
  const iface = new Interface(["function safeMint(address to, string uri)"]);

  const nftData: string = iface.encodeFunctionData("safeMint", [
    fromAddress,
    "some.token.uri",
  ]);

  // TODO: Read this from the contract
  const nonce = parseInt(await forwarderContract.getNonce(fromAddress));

  const message = {
    from: fromAddress,
    to: contractToCallAddress,
    value: 0, // Not used
    gas: 0, // Not used
    nonce: nonce,
    data: nftData,
  };

  // Note: this is hardhat's chain ID. Will need to be dynamic with the netwok you're on.
  const chainId = 31337;

  return {
    // Note: this name and version has to match exactly with the constructor params in Forwarder.sol
    domain: {
      name: "MinimalForwarder",
      version: "0.0.1",
      chainId: chainId,
      verifyingContract: forwarderContract.address,
    },
    types: {
      ForwardRequest: [
        {
          name: "from",
          type: "address",
        },
        {
          name: "to",
          type: "address",
        },
        {
          name: "value",
          type: "uint256",
        },
        {
          name: "gas",
          type: "uint256",
        },
        {
          name: "nonce",
          type: "uint256",
        },
        {
          name: "data",
          type: "bytes",
        },
      ],
    },
    message: message,
  };
};
