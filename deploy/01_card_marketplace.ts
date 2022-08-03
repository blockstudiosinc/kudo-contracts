import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, Deployment } from "hardhat-deploy/types";
import { KudoCardSeason0 } from "../typechain";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const kudoCard: Deployment = await hre.deployments.get("KudoCardSeason0");

  const mUSDC = "0x566368d78dbdec50f04b588e152de3cec0d5889f";

  await deploy("CardMarketplace", {
    from: deployer,
    args: [kudoCard.address, mUSDC],
    log: true,
  });
};
export default func;
