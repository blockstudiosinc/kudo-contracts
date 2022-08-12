import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, Deployment } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  const deployment: Deployment = await deploy("KudoCardSeason0", {
    from: deployer,
    args: [],
    log: true,
  });

  // Set the admins
  const KudoCardSeason0 = await ethers.getContractFactory("KudoCardSeason0");
  const kudoCard = await KudoCardSeason0.attach(deployment.address);

  console.log("Setting admin wallets");

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
