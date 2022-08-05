import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { Interface } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { TransactionRequest } from "@ethersproject/providers";

import { buildRequest } from "./utils/meta-transactions";

describe("CardMarketplace meta transactions", function () {
  const tokenId = 1;
  const listingId = 1;
  const price = ethers.utils.parseUnits("10", 18);

  let forwarderContract: Contract;
  let marketContract: Contract;
  let tokenContract: Contract;
  let cardContract: Contract;
  let adminWallet: SignerWithAddress;
  let seller: SignerWithAddress;
  let other: SignerWithAddress;

  beforeEach(async () => {
    const [dep, signer1, signer2] = await ethers.getSigners();
    adminWallet = dep;
    seller = signer1;
    other = signer2;

    // Deploy the forwarder
    const Forwarder = await ethers.getContractFactory("Forwarder");
    forwarderContract = await Forwarder.connect(adminWallet).deploy();
    await forwarderContract.deployed();

    // mUSDC
    const TestERC20 = await ethers.getContractFactory("TestERC20");
    tokenContract = await TestERC20.connect(adminWallet).deploy(price);
    await tokenContract.deployed();

    // Card
    const KudoCardSeason0 = await ethers.getContractFactory("KudoCardSeason0");
    cardContract = await KudoCardSeason0.connect(adminWallet).deploy();
    await cardContract.deployed();

    // Market
    const CardMarketplace = await ethers.getContractFactory("CardMarketplace");
    marketContract = await CardMarketplace.connect(adminWallet).deploy(
      cardContract.address,
      tokenContract.address,
      forwarderContract.address
    );
    await marketContract.deployed();

    // Mint NFT
    await cardContract
      .connect(adminWallet)
      .safeMint(seller.address, "some-token-uri");
    expect(await cardContract.balanceOf(seller.address)).to.eq(1);

    // Approve market to list
    await cardContract.connect(seller).approve(marketContract.address, tokenId);
  });

  describe("meta transactions", async () => {
    it("doesn't work if not sent from the forwarder address", async () => {
      // Passing the meta transaction data but not from the forwarder should fail
      const i: Interface = new Interface([
        "function list(uint256 tokenId, uint256 priceId)",
      ]);
      const functionSignature: string = i.getSighash("list");

      // Append the extra seller.address which is looked at in _msgSender if valid
      const transactionRequest: TransactionRequest = {
        to: marketContract.address,
        data: ethers.utils.hexConcat([
          functionSignature,
          ethers.utils.defaultAbiCoder.encode(
            ["uint256", "uint256", "address"],
            [tokenId, price, seller.address]
          ),
        ]),
      };

      await expect(
        other.sendTransaction(transactionRequest)
      ).to.be.revertedWith("Not card owner");

      // Nothing was transferred
      expect(await cardContract.ownerOf(tokenId)).to.eq(seller.address);
    });

    it("doesn't work with an invalid signature", async () => {
      const iface = new Interface([
        "function list(uint256 tokenId, uint256 price)",
      ]);

      const functionSignatureAndCalldata: string = iface.encodeFunctionData(
        "list",
        [tokenId, price]
      );

      const request = await buildRequest(
        seller.address,
        forwarderContract,
        marketContract.address,
        functionSignatureAndCalldata
      );

      // Incorrect nonce
      request.message.nonce = 999;

      // Note: This function is an experimental feature and may remove the _ at some point
      const signature: string = await seller._signTypedData(
        request.domain,
        request.types,
        request.message
      );

      await expect(
        forwarderContract
          .connect(adminWallet)
          .execute(request.message, signature)
      ).to.be.revertedWith(
        "MinimalForwarder: signature does not match request"
      );

      // Market listed NFT
      expect(await cardContract.ownerOf(tokenId)).to.eq(seller.address);
    });

    it("works with a valid signature from the forwarder address", async () => {
      const iface = new Interface([
        "function list(uint256 tokenId, uint256 price)",
      ]);

      const functionSignatureAndCalldata: string = iface.encodeFunctionData(
        "list",
        [tokenId, price]
      );

      const request = await buildRequest(
        seller.address,
        forwarderContract,
        marketContract.address,
        functionSignatureAndCalldata
      );

      // Note: This function is an experimental feature and may remove the _ at some point
      const signature: string = await seller._signTypedData(
        request.domain,
        request.types,
        request.message
      );

      await forwarderContract
        .connect(adminWallet)
        .execute(request.message, signature);

      // Market listed NFT
      expect(await cardContract.ownerOf(tokenId)).to.eq(marketContract.address);
    });
  });
});
