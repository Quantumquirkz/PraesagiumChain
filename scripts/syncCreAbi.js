#!/usr/bin/env node
/**
 * Syncs OracleConsumer ABI from Hardhat artifacts to cre/contracts/evm/src/abi/.
 * Run after npm run compile to keep CRE workflow ABI in sync.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const artifactPath = path.join(root, "artifacts/contracts/OracleConsumer.sol/OracleConsumer.json");
const destPath = path.join(root, "cre/contracts/evm/src/abi/OracleConsumer.abi");

if (!fs.existsSync(artifactPath)) {
  console.error("Run npm run compile first. Artifact not found:", artifactPath);
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const fn = artifact.abi.find((x) => x.type === "function" && x.name === "oracleCallback");
if (!fn) {
  console.error("oracleCallback not found in OracleConsumer ABI");
  process.exit(1);
}

const destDir = path.dirname(destPath);
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}
fs.writeFileSync(destPath, JSON.stringify([fn], null, 2));
console.log("Synced OracleConsumer.abi to", destPath);
