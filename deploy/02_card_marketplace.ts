import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, Deployment } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const cardDeployment: Deployment = await hre.deployments.get("KudoCard");
  const forwarder: Deployment = await hre.deployments.get("Forwarder");

  const mUSDC = process.env.MUSDC_ADDRESS;

  console.log("mUSDC address:", mUSDC);

  const deployment: Deployment = await deploy("CardMarketplace", {
    from: deployer,
    args: [cardDeployment.address, mUSDC, forwarder.address],
    log: true,
  });

  // Approve the marketplace
  console.log("Approving marketplace");

  const KudoCard = await ethers.getContractFactory("KudoCard");
  const kudoCard = await KudoCard.attach(cardDeployment.address);
  await kudoCard.setApprovedMarket(deployment.address, true);
};
export default func;
