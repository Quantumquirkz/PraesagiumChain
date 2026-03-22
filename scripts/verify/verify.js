/**
 * Verify deployed contracts on Etherscan/Polygonscan.
 */
import { loadRootEnv } from "../lib/loadRootEnv.mjs";
import { network, tasks } from "hardhat";

loadRootEnv();

async function main() {
  const connection = await network.connect();
  const netName = connection.networkName;
  if (netName === "hardhat" || netName === "localhost") {
    console.log("Use a live network (e.g. --network sepolia) to verify.");
    return;
  }

  const { ethers } = connection;
  const pmAddr = process.env.PREDICTION_MARKET_ADDRESS;
  const creAddr = process.env.CRE_WORKFLOW_ADDRESS;
  const oracleAddr = process.env.ORACLE_CONSUMER_ADDRESS;
  let deployerAddr = process.env.DEPLOYER_ADDRESS;
  if (!deployerAddr && process.env.PRIVATE_KEY) {
    const [signer] = await ethers.getSigners();
    deployerAddr = signer.address;
  }

  if (!pmAddr || !creAddr || !oracleAddr || !deployerAddr) {
    console.error(
      "Set in .env: PREDICTION_MARKET_ADDRESS, CRE_WORKFLOW_ADDRESS, ORACLE_CONSUMER_ADDRESS, and DEPLOYER_ADDRESS (or PRIVATE_KEY)",
    );
    process.exitCode = 1;
    return;
  }

  const contracts = [
    { name: "PredictionMarket", address: pmAddr, args: [deployerAddr] },
    { name: "CREWorkflow", address: creAddr, args: [pmAddr, deployerAddr] },
    { name: "OracleConsumer", address: oracleAddr, args: [creAddr] },
  ];

  const verifyTask = await tasks.getTask(["verify", "etherscan"]);

  for (const c of contracts) {
    try {
      await verifyTask.run({
        address: c.address,
        constructorArgs: c.args,
      });
      console.log("Verified:", c.name, "at", c.address);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Already Verified")) {
        console.log(c.name, "already verified at", c.address);
      } else {
        console.error("Failed to verify", c.name, msg);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
