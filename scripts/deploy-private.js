/**
 * Deploy PrivatePredictionMarket to Sepolia (or any Hardhat network).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { network } from "hardhat";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();
  console.log("Deploying PrivatePredictionMarket...");
  console.log("  Deployer :", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("  Balance  :", ethers.formatEther(balance), "ETH");

  const resolver = deployer.address;
  console.log("  Resolver :", resolver);

  const Factory = await ethers.getContractFactory("PrivatePredictionMarket");
  const contract = await Factory.deploy(resolver);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\n✅  PrivatePredictionMarket deployed to:", address);

  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    const key = "NEXT_PUBLIC_PRIVATE_MARKET_ADDRESS";

    if (envContent.includes(key)) {
      envContent = envContent.replace(
        new RegExp(`^${key}=.*$`, "m"),
        `${key}=${address}`,
      );
    } else {
      envContent += `\n# PrivatePredictionMarket (commit-reveal)\n${key}=${address}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`\n📝  Updated .env with ${key}=${address}`);
  } else {
    console.log(
      `\n⚠  .env not found. Add manually: NEXT_PUBLIC_PRIVATE_MARKET_ADDRESS=${address}`,
    );
  }

  console.log("\nTo verify on Etherscan:");
  console.log(`  npx hardhat verify etherscan ${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
