/**
 * Register Chainlink Automation upkeep for AutomationResolver.
 * Requires: AUTOMATION_RESOLVER_ADDRESS, AUTOMATION_REGISTRY, LINK_TOKEN in .env.
 * Deployer must have LINK for upkeep funding.
 *
 * Usage:
 *   npx hardhat run scripts/registerUpkeep.js --network sepolia
 */
require("./lib/load-env").loadRootEnv();
const hre = require("hardhat");

// Sepolia addresses
const SEPOLIA_AUTOMATION_REGISTRY = "0x86EFBD0b6736Bed994962f9797049422A3A8E8Ad";
const SEPOLIA_REGISTRAR = "0xb0E49c5D0d05cbc241d68c05BC5BA1d1B7B72976";
const SEPOLIA_LINK_TOKEN = "0x779877A7B0D9E8603169DdbD7836e478b4624789";

async function main() {
  const resolverAddr = process.env.AUTOMATION_RESOLVER_ADDRESS;
  if (!resolverAddr) {
    throw new Error("AUTOMATION_RESOLVER_ADDRESS not set. Deploy contracts first.");
  }

  const network = await hre.ethers.provider.getNetwork();
  const isSepolia = network.chainId === 11155111n;

  const registry = process.env.AUTOMATION_REGISTRY || (isSepolia ? SEPOLIA_AUTOMATION_REGISTRY : null);
  const registrar = process.env.AUTOMATION_REGISTRAR || (isSepolia ? SEPOLIA_REGISTRAR : null);
  const linkTokenAddr = process.env.LINK_TOKEN || (isSepolia ? SEPOLIA_LINK_TOKEN : null);

  if (!registry || !registrar || !linkTokenAddr) {
    throw new Error("Chainlink Automation addresses not configured. Set AUTOMATION_REGISTRY, AUTOMATION_REGISTRAR, LINK_TOKEN for your network.");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("AutomationResolver:", resolverAddr);
  console.log("Registry:", registry);

  const linkToken = await hre.ethers.getContractAt(
    ["function approve(address spender, uint256 amount) returns (bool)", "function balanceOf(address account) view returns (uint256)"],
    linkTokenAddr
  );

  const amount = hre.ethers.parseEther("1"); // 1 LINK for upkeep
  const balance = await linkToken.balanceOf(deployer.address);
  if (balance < amount) {
    console.warn(`LINK balance: ${hre.ethers.formatEther(balance)}. Need at least 1 LINK. Get from https://faucets.chain.link/`);
    process.exitCode = 1;
    return;
  }

  const registrarAbi = [
    "function registerUpkeep((string name, bytes encryptedEmail, address upkeepContract, uint32 gasLimit, address adminAddress, uint8 triggerType, bytes checkData, bytes triggerConfig, bytes offchainConfig, uint96 amount)) external returns (uint256 upkeepID)"
  ];

  const RegistrationParams = {
    name: "PraesagiumChain Price Market Resolver",
    encryptedEmail: "0x",
    upkeepContract: resolverAddr,
    gasLimit: 500000,
    adminAddress: deployer.address,
    triggerType: 0, // Conditional
    checkData: "0x",
    triggerConfig: "0x",
    offchainConfig: "0x",
    amount: amount
  };

  const approveTx = await linkToken.approve(registrar, amount);
  await approveTx.wait();
  console.log("LINK approved for registrar.");

  const registrarContract = await hre.ethers.getContractAt(registrarAbi, registrar);
  const tx = await registrarContract.registerUpkeep(RegistrationParams);
  const receipt = await tx.wait();

  const event = receipt.logs.find(
    (l) => l.topics[0] === hre.ethers.id("UpkeepRegistered(uint256,address,uint32,address,bytes,bytes)")
  );
  const upkeepId = event ? BigInt(event.topics[1]) : 0n;

  console.log("Upkeep registered. Upkeep ID:", upkeepId.toString());
  console.log("\nAdd to .env:");
  console.log(`AUTOMATION_UPKEEP_ID=${upkeepId}`);
  console.log("\nMonitor at: https://automation.chain.link/sepolia");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
