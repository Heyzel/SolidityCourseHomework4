require("@nomiclabs/hardhat-waffle");
require("hardhat-deploy-ethers");
require("@nomiclabs/hardhat-etherscan");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-deploy");
require("hardhat-gas-trackooor");
require("solidity-coverage");
require("dotenv").config();

module.exports = {
  solidity: "0.8.3",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
        blockNumber: 14390029,
      },
    },
  },
  etherscan: {
    apiKey:{
      rinkeby: process.env.API_KEY,
    }
  },
  namedAccounts: {
    deployer: 0,
    feeRecipient: 1,
    buyer: 2,
    seller: 3,
  },
  paths:{
    deploy: 'deploy',
    deployments: 'deployments',
  }
};
