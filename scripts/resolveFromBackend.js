/**
 * Resolve a market by fetching the outcome from the backend API and sending it on-chain.
 * Use for demos, cron jobs, or as the "Perform" step of a Chainlink Automation keeper.
 *
 * Idempotent: if the market is already resolved on-chain, skips the tx (optional, requires PREDICTION_MARKET_ADDRESS).
 * Retries the transaction up to 3 times with exponential backoff on failure.
 *
 * Usage:
 *   node scripts/resolveFromBackend.js --market-id 1
 *   node scripts/resolveFromBackend.js --market-id 1 --text "Bitcoin will go up"
 *   node scripts/resolveFromBackend.js --market-id 1 --source price --symbol BTCUSDT --threshold 50000
 *   node scripts/resolveFromBackend.js --market-id 1 --source crypto_news --symbol BTC --threshold 0.6
 *
 * Env: PRIVATE_KEY, RPC_URL (or default localhost:8545), ORACLE_CONSUMER_ADDRESS, API_BASE_URL (default http://localhost:4000)
 * Optional: PREDICTION_MARKET_ADDRESS — if set, skips tx when market is already resolved (idempotency).
 */
require("dotenv").config();
const path = require("path");
const fs = require("fs");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { marketId: null, source: "sentiment", text: null, symbol: null, threshold: null, priceSource: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--market-id" && args[i + 1]) out.marketId = parseInt(args[i + 1], 10);
    if (args[i] === "--source" && args[i + 1]) out.source = args[i + 1];
    if (args[i] === "--text" && args[i + 1]) out.text = args[i + 1];
    if (args[i] === "--symbol" && args[i + 1]) out.symbol = args[i + 1];
    if (args[i] === "--threshold" && args[i + 1]) out.threshold = parseFloat(args[i + 1]);
    if (args[i] === "--price-source" && args[i + 1]) out.priceSource = args[i + 1];
  }
  return out;
}

async function fetchOutcomeFromApi(apiBase, opts) {
  const http = require("http");
  const https = require("https");
  const lib = apiBase.startsWith("https") ? https : http;
  const url = new URL(apiBase);

  let pathname, body, method = "GET";
  if (opts.source === "price" && opts.symbol != null) {
    pathname = `/api/price/above?symbol=${encodeURIComponent(opts.symbol)}`;
    if (opts.threshold != null) pathname += `&threshold=${opts.threshold}`;
    if (opts.priceSource) pathname += `&source=${encodeURIComponent(opts.priceSource)}`;
  } else if (opts.source === "crypto_news" && opts.symbol != null) {
    pathname = `/api/crypto/news-sentiment?symbol=${encodeURIComponent(opts.symbol)}`;
    if (opts.threshold != null) pathname += `&threshold=${opts.threshold}`;
  } else {
    pathname = "/api/ai/sentiment";
    method = "POST";
    body = JSON.stringify({ text: opts.text || "Neutral" });
  }

  const reqOpts = {
    hostname: url.hostname,
    port: url.port || (url.protocol === "https:" ? 443 : 80),
    path: pathname + (body ? "" : ""),
    method,
    headers: body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {}
  };

  return new Promise((resolve, reject) => {
    const req = lib.request(reqOpts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try {
          const data = JSON.parse(d);
          const prob = data.probability ?? data.outcome;
          const outcome = typeof prob === "number" ? (prob >= 0.5 ? 1 : 0) : (data.outcome === 1 ? 1 : 0);
          resolve(outcome);
        } catch (e) {
          reject(new Error("Invalid API response: " + d));
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const args = parseArgs();
  let marketId = args.marketId;
  let textToAnalyze = args.text;

  const inputsPath = path.join(__dirname, "inputs.json");
  if (fs.existsSync(inputsPath)) {
    const inputs = JSON.parse(fs.readFileSync(inputsPath, "utf8"));
    if (marketId == null && inputs.market_id != null) marketId = inputs.market_id;
    if (!textToAnalyze && inputs.text_to_analyze) textToAnalyze = inputs.text_to_analyze;
  }

  if (marketId == null || isNaN(marketId)) {
    console.error("Missing --market-id. Example: node scripts/resolveFromBackend.js --market-id 1");
    process.exit(1);
  }

  const apiBase = process.env.API_BASE_URL || "http://localhost:4000";
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  const oracleAddr = process.env.ORACLE_CONSUMER_ADDRESS;
  const pk = process.env.PRIVATE_KEY;

  if (!oracleAddr || !pk) {
    console.error("Set ORACLE_CONSUMER_ADDRESS and PRIVATE_KEY in .env");
    process.exit(1);
  }

  console.log("Fetching outcome from backend:", apiBase);
  const outcome = await fetchOutcomeFromApi(apiBase, {
    source: args.source,
    text: textToAnalyze,
    symbol: args.symbol,
    threshold: args.threshold,
    priceSource: args.priceSource
  });
  console.log("Outcome:", outcome, outcome === 1 ? "(Yes)" : "(No)");

  const ethers = require("ethers");
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);

  const pmAddress = process.env.PREDICTION_MARKET_ADDRESS;
  if (pmAddress) {
    const pmAbi = ["function getMarket(uint256) view returns (uint256 id, string question, uint256 closeTime, uint256 resolveTime, uint8 status, uint8 outcome, uint256 totalYesStake, uint256 totalNoStake)"];
    const pm = new ethers.Contract(pmAddress, pmAbi, provider);
    const market = await pm.getMarket(marketId);
    if (market && Number(market.status) === 2) {
      console.log("Market", marketId, "already resolved on-chain. Skipping (idempotent).");
      return;
    }
  }

  const abi = [
    "function oracleCallback(uint256 marketId, uint8 rawOutcome) external"
  ];
  const oracle = new ethers.Contract(oracleAddr, abi, wallet);

  const maxRetries = 3;
  let lastErr;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const tx = await oracle.oracleCallback(marketId, outcome);
      console.log("Tx hash:", tx.hash);
      await tx.wait();
      console.log("Market", marketId, "resolved on-chain.");
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn("Tx failed (attempt", attempt + 1, "):", err.message || err, "- retrying in", delay, "ms");
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  console.error("Failed to resolve after", maxRetries, "attempts:", lastErr?.message || lastErr);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
