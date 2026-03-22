/**
 * Deployment with Chainlink Functions Consumer (for testnets/mainnet).
 * Requires: FUNCTIONS_ROUTER in .env (Router address on the chosen network).
 * Chainlink Automation: AUTOMATION_REGISTRY for Sepolia (0x86EFBD0b6736Bed994962f9797049422A3A8E8Ad).
 */
import { network } from "hardhat";

const SEPOLIA_AUTOMATION_REGISTRY = "0x86EFBD0b6736Bed994962f9797049422A3A8E8Ad";

async function main() {
  const { ethers } = await network.connect();
  const functionsRouter = process.env.FUNCTIONS_ROUTER;
  if (!functionsRouter) {
    console.warn("FUNCTIONS_ROUTER not set. Deploying only PM + CRE + OracleConsumer + AutomationResolver.");
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No deployer account. Set PRIVATE_KEY in .env (wallet with testnet ETH). " +
        "For Sepolia: get ETH from https://sepoliafaucet.com",
    );
  }
  console.log("Deployer:", deployer.address);

  const net = await ethers.provider.getNetwork();
  const isSepolia = net.chainId === 11155111n;
  const automationRegistry =
    process.env.AUTOMATION_REGISTRY ||
    (isSepolia ? SEPOLIA_AUTOMATION_REGISTRY : deployer.address);

  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const CREWorkflow = await ethers.getContractFactory("CREWorkflow");
  const OracleConsumer = await ethers.getContractFactory("OracleConsumer");
  const AutomationResolver = await ethers.getContractFactory("AutomationResolver");

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

  const automationResolver = await AutomationResolver.deploy(
    pmAddr,
    oracleAddr,
    automationRegistry,
  );
  await automationResolver.waitForDeployment();
  const automationResolverAddr = await automationResolver.getAddress();
  console.log("AutomationResolver:", automationResolverAddr);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let tx = await pm.setResolver(creAddr);
  await tx.wait();
  await sleep(2000);

  if (functionsRouter) {
    const FunctionsConsumer = await ethers.getContractFactory(
      "PredictionMarketFunctionsConsumer",
    );
    const functionsConsumer = await FunctionsConsumer.deploy(functionsRouter, creAddr);
    await functionsConsumer.waitForDeployment();
    const functionsConsumerAddr = await functionsConsumer.getAddress();
    console.log("PredictionMarketFunctionsConsumer:", functionsConsumerAddr);

    await cre.setOracle(functionsConsumerAddr);
    await cre.setAuthorizedAutomation(oracleAddr);
    await oracle.setAuthorizedCallback(deployer.address);
    await oracle.setAuthorizedAutomation(automationResolverAddr);
    console.log(
      "CREWorkflow oracle set to Functions Consumer; authorizedAutomation set to OracleConsumer.",
    );
  } else {
    tx = await cre.setOracle(oracleAddr);
    await tx.wait();
    await sleep(2000);
    tx = await oracle.setAuthorizedCallback(deployer.address);
    await tx.wait();
    tx = await oracle.setAuthorizedAutomation(automationResolverAddr);
    await tx.wait();
    console.log("CREWorkflow oracle set to OracleConsumer.");
  }

  console.log("\nDeployment complete. Add to .env:");
  console.log(`PREDICTION_MARKET_ADDRESS=${pmAddr}`);
  console.log(`CRE_WORKFLOW_ADDRESS=${creAddr}`);
  console.log(`ORACLE_CONSUMER_ADDRESS=${oracleAddr}`);
  console.log(`AUTOMATION_RESOLVER_ADDRESS=${automationResolverAddr}`);
  if (process.env.RPC_URL) console.log(`RPC_URL=${process.env.RPC_URL}`);
  if (isSepolia) {
    console.log("\nTo register upkeep: npm run register:upkeep (requires LINK in deployer wallet)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
