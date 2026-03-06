/**
 * Completa la configuración de contratos ya desplegados en Sepolia
 * (setResolver en PM, setOracle en CRE, setAuthorizedCallback en Oracle).
 *
 * Uso: PREDICTION_MARKET_ADDRESS, CRE_WORKFLOW_ADDRESS, ORACLE_CONSUMER_ADDRESS en .env
 *   npx hardhat run scripts/deploy/completeSepoliaSetup.js --network sepolia
 */
const hre = require("hardhat");

async function main() {
  const pmAddr = process.env.PREDICTION_MARKET_ADDRESS;
  const creAddr = process.env.CRE_WORKFLOW_ADDRESS;
  const oracleAddr = process.env.ORACLE_CONSUMER_ADDRESS;

  if (!pmAddr || !creAddr || !oracleAddr) {
    throw new Error(
      "Set PREDICTION_MARKET_ADDRESS, CRE_WORKFLOW_ADDRESS, ORACLE_CONSUMER_ADDRESS in .env"
    );
  }

  const [deployer] = await hre.ethers.getSigners();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const pm = await hre.ethers.getContractAt("PredictionMarket", pmAddr);
  const cre = await hre.ethers.getContractAt("CREWorkflow", creAddr);
  const oracle = await hre.ethers.getContractAt("OracleConsumer", oracleAddr);

  console.log("Completing setup for:", pmAddr, creAddr, oracleAddr);

  let tx = await pm.setResolver(creAddr);
  await tx.wait();
  console.log("  PredictionMarket.setResolver(cre) OK");
  await sleep(2000);

  tx = await cre.setOracle(oracleAddr);
  await tx.wait();
  console.log("  CREWorkflow.setOracle(oracle) OK");
  await sleep(2000);

  tx = await oracle.setAuthorizedCallback(deployer.address);
  await tx.wait();
  console.log("  OracleConsumer.setAuthorizedCallback(deployer) OK");

  console.log("\nSetup complete. Use these in .env and frontend/.env.local:");
  console.log("PREDICTION_MARKET_ADDRESS=" + pmAddr);
  console.log("CRE_WORKFLOW_ADDRESS=" + creAddr);
  console.log("ORACLE_CONSUMER_ADDRESS=" + oracleAddr);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
