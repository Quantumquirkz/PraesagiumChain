import "dotenv/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";

const sepoliaRpc =
  process.env.SEPOLIA_RPC_URL ??
  "https://ethereum-sepolia-rpc.publicnode.com";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun",
    },
  },
  paths: {
    sources: "./contracts",
    tests: {
      mocha: "./tests/contracts",
    },
    cache: "./build/hardhat-cache",
    artifacts: "./build/hardhat-artifacts",
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
    },
    localhost: {
      type: "http",
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      type: "http",
      url: sepoliaRpc,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 60000,
    },
    polygon: {
      type: "http",
      url:
        process.env.POLYGON_RPC_URL ??
        "https://polygon-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    polygonAmoy: {
      type: "http",
      url:
        process.env.POLYGON_AMOY_RPC_URL ??
        "https://rpc-amoy.polygon.technology",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    mainnet: {
      type: "http",
      url:
        process.env.MAINNET_RPC_URL ??
        "https://ethereum.publicnode.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  verify: {
    etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY ?? "",
    },
  },
});
