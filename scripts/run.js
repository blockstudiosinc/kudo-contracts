const hre = require("hardhat");
const main = async () => {
  const nftContractFactory = await hre.ethers.getContractFactory('Kudo');
  const nftContract = await nftContractFactory.deploy(1);
  await nftContract.deployed(1);
  console.log("Contract deployed to:", nftContract.address);
};

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

runMain();