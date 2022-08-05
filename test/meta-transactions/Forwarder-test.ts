import { expect } from "chai";
import { ethers } from "hardhat";
import { Interface } from "ethers/lib/utils";

import { buildRequest } from "../utils/meta-transactions";

describe("Forwarder", function () {
  describe("execute", async () => {
    it("works with a valid signature", async () => {
      const [deployer, kudoWallet, user1] = await ethers.getSigners();

      const Forwarder = await ethers.getContractFactory("Forwarder");
      const forwarderContract = await Forwarder.connect(deployer).deploy();
      await forwarderContract.deployed();

      const CardMarketplace = await ethers.getContractFactory(
        "CardMarketplace"
      );
      const marketContract = await CardMarketplace.connect(deployer).deploy(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        forwarderContract.address
      );
      await marketContract.deployed();

      expect(await forwarderContract.getNonce(user1.address)).to.eq(0);

      const iface = new Interface([
        "function safeMint(address to, string uri)",
      ]);

      const functionSignatureAndCalldata: string = iface.encodeFunctionData(
        "safeMint",
        [user1.address, "some.token.uri"]
      );

      let request = await buildRequest(
        user1.address,
        forwarderContract,
        marketContract.address,
        functionSignatureAndCalldata
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
        marketContract.address,
        functionSignatureAndCalldata
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

      const CardMarketplace = await ethers.getContractFactory(
        "CardMarketplace"
      );
      const marketContract = await CardMarketplace.connect(deployer).deploy(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        forwarderContract.address
      );
      await marketContract.deployed();

      expect(await forwarderContract.getNonce(user1.address)).to.eq(0);

      const request = await buildRequest(
        user1.address,
        forwarderContract,
        marketContract.address
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
