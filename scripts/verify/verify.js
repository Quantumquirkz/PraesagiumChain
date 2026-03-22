/**
 * Verify deployed contracts on Etherscan/Polygonscan.
 * Requires: ETHERSCAN_API_KEY (or POLYGONSCAN_API_KEY), PRIVATE_KEY, and deployed addresses in .env
 *
 * Usage:
 *   npx hardhat run scripts/verify/verify.js --network sepolia
 *   npx hardhat run scripts/verify/verify.js --network polygonAmoy
 *
 * Env (after deploy):
 *   PREDICTION_MARKET_ADDRESS, CRE_WORKFLOW_ADDRESS, ORACLE_CONSUMER_ADDRESS
 *   DEPLOYER_ADDRESS (or we derive from PRIVATE_KEY)
 */
require("../lib/load-env").loadRootEnv();
const hre = require("hardhat");

async function main() {
  const network = hre.network.name;
  if (network === "hardhat" || network === "localhost") {
    console.log("Use a live network (e.g. --network sepolia) to verify.");
    return;
  }

  const pmAddr = process.env.PREDICTION_MARKET_ADDRESS;
  const creAddr = process.env.CRE_WORKFLOW_ADDRESS;
  const oracleAddr = process.env.ORACLE_CONSUMER_ADDRESS;
  let deployerAddr = process.env.DEPLOYER_ADDRESS;
  if (!deployerAddr && process.env.PRIVATE_KEY) {
    const [signer] = await hre.ethers.getSigners();
    deployerAddr = signer.address;
  }

  if (!pmAddr || !creAddr || !oracleAddr || !deployerAddr) {
    console.error("Set in .env: PREDICTION_MARKET_ADDRESS, CRE_WORKFLOW_ADDRESS, ORACLE_CONSUMER_ADDRESS, and DEPLOYER_ADDRESS (or PRIVATE_KEY)");
    process.exitCode = 1;
    return;
  }

  const contracts = [
    { name: "PredictionMarket", address: pmAddr, args: [deployerAddr] },
    { name: "CREWorkflow", address: creAddr, args: [pmAddr, deployerAddr] },
    { name: "OracleConsumer", address: oracleAddr, args: [creAddr] }
  ];

  for (const c of contracts) {
    try {
      await hre.run("verify:verify", { address: c.address, constructorArguments: c.args });
      console.log("Verified:", c.name, "at", c.address);
    } catch (e) {
      if (e.message && e.message.includes("Already Verified")) {
        console.log(c.name, "already verified at", c.address);
      } else {
        console.error("Failed to verify", c.name, e.message);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
