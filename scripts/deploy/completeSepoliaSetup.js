/**
 * Completa la configuración de contratos ya desplegados en Sepolia
 */
import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const pmAddr = process.env.PREDICTION_MARKET_ADDRESS;
  const creAddr = process.env.CRE_WORKFLOW_ADDRESS;
  const oracleAddr = process.env.ORACLE_CONSUMER_ADDRESS;

  if (!pmAddr || !creAddr || !oracleAddr) {
    throw new Error(
      "Set PREDICTION_MARKET_ADDRESS, CRE_WORKFLOW_ADDRESS, ORACLE_CONSUMER_ADDRESS in .env",
    );
  }

  const [deployer] = await ethers.getSigners();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const pm = await ethers.getContractAt("PredictionMarket", pmAddr);
  const cre = await ethers.getContractAt("CREWorkflow", creAddr);
  const oracle = await ethers.getContractAt("OracleConsumer", oracleAddr);

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

  console.log("\nSetup complete. Add to .env (single file for backend + frontend):");
  console.log("PREDICTION_MARKET_ADDRESS=" + pmAddr);
  console.log("CRE_WORKFLOW_ADDRESS=" + creAddr);
  console.log("ORACLE_CONSUMER_ADDRESS=" + oracleAddr);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
