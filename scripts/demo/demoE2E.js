/**
 * End-to-end demo for hackathon video (no UI).
 * Usage: node scripts/demo/demoE2E.js
 */
import http from "node:http";
import https from "node:https";
import { loadRootEnv } from "../lib/loadRootEnv.mjs";
import { network } from "hardhat";

loadRootEnv();

const PM_ABI = [
  "function createMarket(string question, uint256 closeTime, uint256 resolveTime) returns (uint256)",
  "function placeBet(uint256 marketId, uint8 outcome) payable",
  "function claimPayout(uint256 marketId)",
  "event MarketCreated(uint256 indexed marketId, string question, uint256 closeTime, uint256 resolveTime, address creator)",
];

const ORACLE_ABI = ["function oracleCallback(uint256 marketId, uint8 rawOutcome) external"];

async function fetchOutcome(apiBase, text) {
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
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
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
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const { ethers, networkHelpers } = await network.connect();
  const pmAddr = process.env.PREDICTION_MARKET_ADDRESS;
  const oracleAddr = process.env.ORACLE_CONSUMER_ADDRESS;
  const apiBase = process.env.API_BASE_URL || "http://localhost:4000";

  if (!pmAddr || !oracleAddr) {
    console.error("Set in .env: PREDICTION_MARKET_ADDRESS, ORACLE_CONSUMER_ADDRESS");
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();
  const pm = new ethers.Contract(pmAddr, PM_ABI, signer);
  const oracle = new ethers.Contract(oracleAddr, ORACLE_ABI, signer);

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
  const iface = new ethers.Interface(PM_ABI);
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
  await (await pm.placeBet(marketId, 1, { value: ethers.parseEther("0.001") })).wait();
  console.log("   Bet placed.");

  console.log("3. Advancing time to resolveTime and resolving...");
  await networkHelpers.time.increase(resolveTime - now + 1);
  await networkHelpers.mine();

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
