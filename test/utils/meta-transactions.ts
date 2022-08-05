import { Contract } from "ethers";

export const buildRequest = async (
  fromAddress: string,
  forwarderContract: Contract,
  contractToCallAddress: string,
  functionSignatureAndCalldata: string
) => {
  const nonce = parseInt(await forwarderContract.getNonce(fromAddress));

  const message = {
    from: fromAddress,
    to: contractToCallAddress,
    value: 0, // Not used
    gas: 0, // Not used
    nonce: nonce,
    data: functionSignatureAndCalldata,
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
