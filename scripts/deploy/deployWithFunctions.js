/**
 * Deployment with Chainlink Functions Consumer (for testnets/mainnet).
 * Requires: FUNCTIONS_ROUTER in .env (Router address on the chosen network).
 *
 * Usage:
 *   npx hardhat run scripts/deploy/deployWithFunctions.js --network polygon
 *   npx hardhat run scripts/deploy/deployWithFunctions.js --network sepolia
 */
const hre = require("hardhat");

async function main() {
  const functionsRouter = process.env.FUNCTIONS_ROUTER;
  if (!functionsRouter) {
    console.warn("FUNCTIONS_ROUTER not set. Deploying only PM + CRE + OracleConsumer (local mode).");
  }

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No deployer account. Set PRIVATE_KEY in .env (wallet with testnet ETH). " +
      "For Sepolia: get ETH from https://sepoliafaucet.com"
    );
  }
  console.log("Deployer:", deployer.address);

  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const CREWorkflow = await hre.ethers.getContractFactory("CREWorkflow");
  const OracleConsumer = await hre.ethers.getContractFactory("OracleConsumer");

  const pm = await PredictionMarket.deploy(deployer.address);
  await pm.waitForDeployment();
  const pmAddr = await pm.getAddress();
  console.log("PredictionMarket:", pmAddr);

  const cre = await CREWorkflow.deploy(pmAddr, deployer.address);
  await cre.waitForDeployment();
  const creAddr = await cre.getAddress();
  console.log("CREWorkflow:", creAddr);

  const oracle = await OracleConsumer.deploy(creAddr);
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();
  console.log("OracleConsumer:", oracleAddr);

  await pm.setResolver(creAddr);

  if (functionsRouter) {
    const FunctionsConsumer = await hre.ethers.getContractFactory("PredictionMarketFunctionsConsumer");
    const functionsConsumer = await FunctionsConsumer.deploy(functionsRouter, creAddr);
    await functionsConsumer.waitForDeployment();
    const functionsConsumerAddr = await functionsConsumer.getAddress();
    console.log("PredictionMarketFunctionsConsumer:", functionsConsumerAddr);

    await cre.setOracle(functionsConsumerAddr);
    console.log("CREWorkflow oracle set to Functions Consumer.");
  } else {
    await cre.setOracle(oracleAddr);
    await oracle.setAuthorizedCallback(deployer.address);
    console.log("CREWorkflow oracle set to OracleConsumer (local).");
  }

  console.log("\nDeployment complete. Add to .env:");
  console.log(`PREDICTION_MARKET_ADDRESS=${pmAddr}`);
  console.log(`CRE_WORKFLOW_ADDRESS=${await cre.getAddress()}`);
  console.log(`ORACLE_CONSUMER_ADDRESS=${oracleAddr}`);
  if (process.env.RPC_URL) console.log(`RPC_URL=${process.env.RPC_URL}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
