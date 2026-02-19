/**
 * End-to-end demo for hackathon video (no UI).
 * Flow: create market → place bet → resolve (via backend + oracleCallback) → claim.
 *
 * Prerequisites:
 * - Terminal 1: npm run node (Hardhat local node)
 * - Terminal 2: npm run deploy (then add addresses to .env)
 * - Terminal 3: npm run backend (for AI sentiment; optional: use AI_PROVIDER=mock)
 *
 * Usage: node scripts/demo/demoE2E.js
 *
 * Env: PREDICTION_MARKET_ADDRESS, ORACLE_CONSUMER_ADDRESS (from deploy). Uses same signer as deploy (localhost).
 */
require("dotenv").config();
const hre = require("hardhat");

const PM_ABI = [
  "function createMarket(string question, uint256 closeTime, uint256 resolveTime) returns (uint256)",
  "function placeBet(uint256 marketId, uint8 outcome) payable",
  "function claimPayout(uint256 marketId)",
  "event MarketCreated(uint256 indexed marketId, string question, uint256 closeTime, uint256 resolveTime, address creator)"
];

const ORACLE_ABI = ["function oracleCallback(uint256 marketId, uint8 rawOutcome) external"];

async function fetchOutcome(apiBase, text) {
  const http = require("http");
  const https = require("https");
  const lib = apiBase.startsWith("https") ? https : http;
  const url = new URL(apiBase);
  const body = JSON.stringify({ text: text || "Bitcoin will reach 100k this year" });
  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: "/api/ai/sentiment",
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try {
            const data = JSON.parse(d);
            const prob = data.probability ?? 0.5;
            resolve(prob >= 0.5 ? 1 : 0);
          } catch (e) {
            reject(new Error("Invalid API response: " + d));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const pmAddr = process.env.PREDICTION_MARKET_ADDRESS;
  const oracleAddr = process.env.ORACLE_CONSUMER_ADDRESS;
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const apiBase = process.env.API_BASE_URL || "http://localhost:4000";

  if (!pmAddr || !oracleAddr) {
    console.error("Set in .env: PREDICTION_MARKET_ADDRESS, ORACLE_CONSUMER_ADDRESS");
    process.exit(1);
  }

  const [signer] = await hre.ethers.getSigners();
  const pm = new hre.ethers.Contract(pmAddr, PM_ABI, signer);
  const oracle = new hre.ethers.Contract(oracleAddr, ORACLE_ABI, signer);

  const now = Math.floor(Date.now() / 1000);
  const closeTime = now + 3600;
  const resolveTime = now + 7200;
  const question = "Will Bitcoin exceed $50,000 by end of 2026?";
  const textToAnalyze = "Bitcoin will reach 100k this year";

  console.log("=== PraesagiumChain E2E Demo (no UI) ===\n");

  console.log("1. Creating market...");
  const tx1 = await pm.createMarket(question, closeTime, resolveTime);
  const receipt1 = await tx1.wait();
  let marketId = 1;
  const iface = new hre.ethers.Interface(PM_ABI);
  for (const log of receipt1.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      if (parsed && parsed.name === "MarketCreated") {
        marketId = Number(parsed.args[0]);
        break;
      }
    } catch (_) {}
  }
  console.log("   Market created, ID:", marketId);

  console.log("2. Placing bet (Yes, 0.001 ETH)...");
  await (await pm.placeBet(marketId, 1, { value: hre.ethers.parseEther("0.001") })).wait();
  console.log("   Bet placed.");

  console.log("3. Resolving (fetching outcome from backend /api/ai/sentiment)...");
  let outcome;
  try {
    outcome = await fetchOutcome(apiBase, textToAnalyze);
    console.log("   Outcome from AI:", outcome, outcome === 1 ? "(Yes)" : "(No)");
  } catch (e) {
    console.error("   Backend not reachable. Run: npm run backend");
    console.error("   Or set AI_PROVIDER=mock and ensure backend is up.");
    process.exit(1);
  }
  const tx3 = await oracle.oracleCallback(marketId, outcome);
  await tx3.wait();
  console.log("   Market resolved on-chain. Tx:", tx3.hash);

  console.log("4. Claiming payout...");
  await (await pm.claimPayout(marketId)).wait();
  console.log("   Payout claimed.");

  console.log("\n=== Demo complete ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
