import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, Deployment } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const kudoCard: Deployment = await hre.deployments.get("KudoCardSeason0");
  const forwarder: Deployment = await hre.deployments.get("Forwarder");

  // TODO: Make this dynamic for prod/testnet
  const mUSDC = "0x566368d78dbdec50f04b588e152de3cec0d5889f";

  await deploy("CardMarketplace", {
    from: deployer,
    args: [kudoCard.address, mUSDC, forwarder.address],
    log: true,
  });
};
export default func;
