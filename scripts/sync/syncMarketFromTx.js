/**
 * Sync a market from an on-chain transaction into the backend database.
 */
import { loadRootEnv } from "../lib/loadRootEnv.mjs";
import { network } from "hardhat";

loadRootEnv();

const MARKET_CREATED = "MarketCreated(uint256,string,uint256,uint256,address)";

async function main() {
  const { ethers } = await network.connect();
  const MARKET_CREATED_TOPIC = ethers.id(MARKET_CREATED);

  const txHash =
    process.env.SYNC_TX_HASH ||
    process.argv.find((a) => a.startsWith("0x") && a.length === 66);
  if (!txHash) {
    console.error(
      "Usage: SYNC_TX_HASH=0x... npx hardhat run scripts/sync/syncMarketFromTx.js --network sepolia",
    );
    process.exit(1);
  }

  const pmAddr = process.env.PREDICTION_MARKET_ADDRESS;
  const apiBase = process.env.API_BASE_URL || "http://localhost:4000";

  if (!pmAddr) {
    console.error("Set PREDICTION_MARKET_ADDRESS in .env");
    process.exit(1);
  }

  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  if (!receipt) {
    console.error("Transaction not found. Check the tx hash and RPC.");
    process.exit(1);
  }

  const log = receipt.logs.find(
    (l) =>
      l.topics[0] === MARKET_CREATED_TOPIC &&
      l.address.toLowerCase() === pmAddr.toLowerCase(),
  );
  if (!log) {
    console.error(
      "MarketCreated event not found. Ensure the tx created a market on the configured contract.",
    );
    process.exit(1);
  }

  const marketId = BigInt(log.topics[1]);
  const creator = "0x" + log.topics[2].slice(26);
  const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
    ["string", "uint256", "uint256"],
    log.data,
  );
  const [question, closeTime, resolveTime] = decoded;

  const body = JSON.stringify({
    question,
    close_time: Number(closeTime),
    resolve_time: Number(resolveTime),
    creator,
    market_type: "base",
    on_chain_market_id: Number(marketId),
  });

  const res = await fetch(`${apiBase}/api/markets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  const market = await res.json();
  console.log("Market synced successfully:");
  console.log("  ID:", market.id);
  console.log("  On-chain ID:", market.on_chain_market_id);
  console.log("  Question:", market.question);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
