import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { sign } from "crypto";
import { AbiCoder, Interface } from "ethers/lib/utils";
import hre, { ethers } from "hardhat";

describe("Forwarder", function () {
  describe("execute", async () => {
    it("doesn't work if not sent from the forwarder address", async () => {
      const [deployer, kudoWallet, user1] = await ethers.getSigners();

      console.log("deployer", deployer.address);
      console.log("kudoWallet", kudoWallet.address);
      console.log("user1", user1.address);

      const Forwarder = await ethers.getContractFactory("Forwarder");
      const forwarderContract = await Forwarder.connect(deployer).deploy();
      await forwarderContract.deployed();
      console.log("forwarder contract", forwarderContract.address);

      const KudoCardSeason0 = await ethers.getContractFactory(
        "KudoCardSeason0"
      );
      const cardContract = await KudoCardSeason0.connect(deployer).deploy(
        forwarderContract.address
      );
      await cardContract.deployed();
      console.log("card contract", cardContract.address);

      expect(await forwarderContract.getNonce(user1.address)).to.eq(0);

      console.log(
        "chainId",
        await (
          await ethers.getDefaultProvider().getNetwork()
        ).chainId
      );
      const request = await buildRequest(
        user1.address,
        forwarderContract.address,
        cardContract.address
      );

      // Note: This function is an experimental feature and may remove the _ at some point
      const signature: string = await user1._signTypedData(
        request.domain,
        request.types,
        request.message
      );

      const verifiedAddress = ethers.utils.verifyTypedData(
        request.domain,
        request.types,
        request.message,
        signature
      );
      console.log("Verif, user1", verifiedAddress, user1.address);
      expect(verifiedAddress).to.equal(user1.address); // works !

      console.log("test signature", signature);

      await forwarderContract
        .connect(kudoWallet)
        .execute(request.message, signature);

      expect(await forwarderContract.getNonce(user1.address)).to.eq(1);
    });
  });
});

const buildRequest = async (
  fromAddress: string,
  forwarderContractAddress: string,
  theContract: string
) => {
  const iface = new Interface(["function safeMint(address to, string uri)"]);

  const nftData: string = iface.encodeFunctionData("safeMint", [
    fromAddress,
    "some.token.uri",
  ]);

  console.log("encodedNFtData", nftData);

  // TODO
  const nonce = 0;

  const message = {
    from: fromAddress,
    to: theContract, // Not used
    value: 0, // Not used
    gas: 0, // Not used
    nonce: nonce, // TODO: Read this from the contract
    data: nftData,
  };

  return {
    domain: {
      name: "MinimalForwarder",
      version: "0.0.1",
      chainId: 31337, // (await ethers.getDefaultProvider().getNetwork()).chainId,
      verifyingContract: forwarderContractAddress,
      // salt: "0x0000000000000000000000000000000000000000000000000000000000013881", // Salt is mumbai's chainId 80001 in hex
    },
    types: {
      // EIP712Domain: [
      //   { name: "name", type: "string" },
      //   { name: "version", type: "string" },
      //   { name: "chainId", type: "uint256" },
      //   { name: "verifyingContract", type: "address" },
      // ],
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
    primaryType: "ForwardRequest",
    message: message,
  };
};
