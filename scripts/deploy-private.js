/**
 * Deploy PrivatePredictionMarket to Sepolia (or any Hardhat network).
 *
 * Usage:
 *   npx hardhat run scripts/deploy-private.js --network sepolia
 *   npx hardhat run scripts/deploy-private.js --network localhost
 *
 * After deployment, copy the printed address into frontend/.env.local:
 *   NEXT_PUBLIC_PRIVATE_MARKET_ADDRESS=<address>
 *
 * Env (required for Sepolia):
 *   PRIVATE_KEY   — deployer private key (without 0x prefix)
 *   SEPOLIA_RPC   — Sepolia RPC URL (Alchemy / Infura)
 */
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying PrivatePredictionMarket...");
  console.log("  Deployer :", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("  Balance  :", ethers.formatEther(balance), "ETH");

  // The constructor takes a resolver address.
  // We use the deployer as the initial resolver so the contract is functional
  // immediately. It can be updated later via setResolver().
  const resolver = deployer.address;
  console.log("  Resolver :", resolver);

  const Factory = await ethers.getContractFactory("PrivatePredictionMarket");
  const contract = await Factory.deploy(resolver);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\n✅  PrivatePredictionMarket deployed to:", address);

  // ── Optionally write address to frontend/.env.local ──────────────────────
  const envPath = path.resolve(__dirname, "../frontend/.env.local");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");

    const key = "NEXT_PUBLIC_PRIVATE_MARKET_ADDRESS";
    if (envContent.includes(key)) {
      // Replace existing value
      envContent = envContent.replace(
        new RegExp(`^${key}=.*$`, "m"),
        `${key}=${address}`
      );
    } else {
      // Append new line
      envContent += `\n# PrivatePredictionMarket (commit-reveal)\n${key}=${address}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`\n📝  Updated frontend/.env.local with ${key}=${address}`);
  } else {
    console.log(
      `\n⚠  frontend/.env.local not found. Add manually:\n   NEXT_PUBLIC_PRIVATE_MARKET_ADDRESS=${address}`
    );
  }

  // ── Print verification command ────────────────────────────────────────────
  console.log("\nTo verify on Etherscan:");
  console.log(
    `  npx hardhat verify --network sepolia ${address}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
