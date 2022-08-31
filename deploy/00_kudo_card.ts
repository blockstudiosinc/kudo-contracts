import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, Deployment } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const deployment: Deployment = await deploy("KudoCard", {
    from: deployer,
    args: [],
    log: true,
  });

  const KudoCard = await ethers.getContractFactory("KudoCard");
  const kudoCard = await KudoCard.attach(deployment.address);

  // Set the royalty info
  if (!process.env.ROYALTY_WALLET) {
    throw new Error("ROYALTY_WALLET not set");
  }

  if (!process.env.ROYALTY_AMOUNT_BASIS) {
    throw new Error("ROYALTY_AMOUNT_BASIS not set");
  }

  console.log(
    `Setting royalty wallet and amount basis: ${process.env.ROYALTY_WALLET}, ${process.env.ROYALTY_AMOUNT_BASIS}`
  );

  await kudoCard.setDefaultRoyalty(
    process.env.ROYALTY_WALLET,
    process.env.ROYALTY_AMOUNT_BASIS
  );

  // Set the admins
  console.log("Setting admin wallets...");

  const adminWallets = process.env.ADMIN_WALLETS?.split(",") || [];

  for (let i = 0; i < adminWallets.length; ++i) {
    const role = await kudoCard.DEFAULT_ADMIN_ROLE();
    const address: string = adminWallets[i];

    const hasRole: boolean = await kudoCard.hasRole(role, address);

    if (!hasRole) {
      console.log("Setting admin role for", address);

      const txn = await kudoCard.grantRole(role, address, {
        gasLimit: 300_000,
      });
      await txn.wait();
    } else {
      console.log("Admin role already set for", address);
    }
  }
};
export default func;
