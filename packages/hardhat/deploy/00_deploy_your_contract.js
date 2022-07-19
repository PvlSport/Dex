
const { ethers } = require("hardhat");

const localChainId = "31337";

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  await deploy("Realcees", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
        // args: [ "Hello", ethers.utils.parseEther("1.5") ],
    log: true,
  });

  // Getting a previously deployed contract
  const realcees = await ethers.getContract("Realcees", deployer);

  await deploy("DEX", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    args: [realcees.address],
    log: true,
    waitConfirmations: 5,
  });
  
  const dex = await ethers.getContract("DEX", deployer);
  await realcees.approve(dex.address, ethers.utils.parseEther("0.2"));
  await realcees.transfer("0xB810b728E44df56eAf4Da93DDd08168B3660753f", ethers.utils.parseEther("5"));

  await dex.init(ethers.utils.parseEther("0.2"), {
    value: ethers.utils.parseEther("0.2"),
    gasLimit: 200000,
  });

};
module.exports.tags = ["Realcees", "DEX"];
