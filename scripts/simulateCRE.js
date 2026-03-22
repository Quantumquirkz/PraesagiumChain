/**
 * Simulates the Chainlink CRE flow for PraesagiumChain.
 * Demonstrates: trigger -> fetch off-chain data (API) -> resolution.
 *
 * For real simulation with CRE CLI, see: https://docs.chain.link/cre
 * For integration: Chainlink Functions + OracleConsumer.
 */

const ethers = require("ethers");

const CRE_FLOW = `
1. User creates market (PredictionMarket.createMarket)
2. Users place bets (placeBet)
3. At resolveTime, someone requests settlement
4. Chainlink/CRE runs workflow off-chain:
   - Calls API (e.g. backend /api/ai/sentiment or /api/predict/hybrid)
   - Gets result (0=No, 1=Yes)
5. OracleConsumer receives callback with (marketId, outcome)
6. CREWorkflow.resolveFromOracle(marketId, outcome)
7. PredictionMarket.resolveMarket(marketId, outcome)
8. Users claim (claimPayout)
`;

async function simulate() {
  console.log("=== CRE flow simulation - PraesagiumChain ===\n");
  console.log("Flow:");
  console.log(CRE_FLOW);

  // Load inputs from scripts/inputs.json if present (to align with cre simulate --inputs)
  let textToAnalyze = "Bitcoin will reach 100k this year";
  try {
    const fs = require("fs");
    const path = require("path");
    const inputsPath = path.join(__dirname, "inputs.json");
    if (fs.existsSync(inputsPath)) {
      const inputs = JSON.parse(fs.readFileSync(inputsPath, "utf8"));
      if (inputs.text_to_analyze) textToAnalyze = inputs.text_to_analyze;
    }
  } catch (_) {}

  const API_BASE = process.env.API_BASE_URL || "http://localhost:4000";
  console.log("\n--- Step 4: Backend API call (Report) ---");
  console.log(`Base URL: ${API_BASE}`);
  console.log(`Text to analyze: ${textToAnalyze}`);

  try {
    const https = require("https");
    const http = require("http");
    const lib = API_BASE.startsWith("https") ? https : http;
    const url = new URL(`${API_BASE}/api/ai/sentiment`);
    const body = JSON.stringify({ text: textToAnalyze });
    const res = await new Promise((resolve, reject) => {
      const req = lib.request(
        { hostname: url.hostname, port: url.port || (url.protocol === "https:" ? 443 : 80), path: "/api/ai/sentiment", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
        (r) => { let d = ""; r.on("data", c => d += c); r.on("end", () => resolve({ ok: r.statusCode === 200, json: () => Promise.resolve(JSON.parse(d)) })); }
      );
      req.on("error", reject);
      req.write(body);
      req.end();
    });
    const data = await res.json();
    const prob = data.probability ?? 0.5;
    const outcome = prob >= 0.5 ? 1 : 0;
    console.log(`API response: ${JSON.stringify(data)}`);
    console.log(`Simulated outcome: ${outcome} (${outcome ? "Yes" : "No"})`);
    console.log("\nIn production: Chainlink sends this outcome to OracleConsumer.");
  } catch (e) {
    console.log("(Backend not available - run: cd backend && cargo run)");
  }

  console.log("\n--- Chainlink files ---");
  console.log("- contracts/CREWorkflow.sol");
  console.log("- contracts/OracleConsumer.sol");
  console.log("- contracts/PredictionMarket.sol");
  console.log("- backend/chainlink-functions/sentiment-analysis.js (Chainlink Functions)");
}

simulate().catch(console.error);
