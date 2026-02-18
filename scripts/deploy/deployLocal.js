const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
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

  await cre.setOracle(oracleAddr);
  await pm.setResolver(creAddr);

  console.log("\nDeployment complete. Add to .env:");
  console.log(`PREDICTION_MARKET_ADDRESS=${pmAddr}`);
  console.log(`RPC_URL=http://127.0.0.1:8545`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
