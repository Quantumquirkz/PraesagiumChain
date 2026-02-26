/**
 * Deploy Private Prediction Market (Chainlink Confidential Compute use case)
 * Deploys: PrivatePredictionMarket, CREWorkflow, OracleConsumer
 */
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const PrivatePredictionMarket = await hre.ethers.getContractFactory("PrivatePredictionMarket");
  const CREWorkflow = await hre.ethers.getContractFactory("CREWorkflow");
  const OracleConsumer = await hre.ethers.getContractFactory("OracleConsumer");

  const ppm = await PrivatePredictionMarket.deploy(deployer.address);
  await ppm.waitForDeployment();
  const ppmAddr = await ppm.getAddress();
  console.log("PrivatePredictionMarket:", ppmAddr);

  const cre = await CREWorkflow.deploy(ppmAddr, hre.ethers.ZeroAddress);
  await cre.waitForDeployment();
  const creAddr = await cre.getAddress();
  console.log("CREWorkflow (Private):", creAddr);

  const oracle = await OracleConsumer.deploy(creAddr);
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();
  console.log("OracleConsumer (Private):", oracleAddr);

  await cre.setOracle(oracleAddr);
  await ppm.setResolver(creAddr);
  await oracle.setAuthorizedCallback(deployer.address);

  console.log("\nPrivate Prediction Market deployment complete. Add to .env:");
  console.log(`PRIVATE_PREDICTION_MARKET_ADDRESS=${ppmAddr}`);
  console.log(`PRIVATE_CRE_WORKFLOW_ADDRESS=${creAddr}`);
  console.log(`PRIVATE_ORACLE_CONSUMER_ADDRESS=${oracleAddr}`);
  console.log(`RPC_URL=http://127.0.0.1:8545`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
