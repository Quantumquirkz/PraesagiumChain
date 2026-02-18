/**
 * Simula el flujo CRE de Chainlink para PraesagiumChain.
 * Demuestra: trigger -> fetch datos off-chain (API) -> resolución.
 *
 * Para simulación real con CRE CLI, ver: https://docs.chain.link/cre
 * Para integración: Chainlink Functions + OracleConsumer.
 */

const ethers = require("ethers");

const CRE_FLOW = `
1. Usuario crea mercado (PredictionMarket.createMarket)
2. Usuarios apuestan (placeBet)
3. Al resolveTime, alguien solicita settlement
4. Chainlink/CRE ejecuta workflow off-chain:
   - Llama API (ej: backend /api/ai/sentiment o /api/predict/hybrid)
   - Obtiene resultado (0=No, 1=Yes)
5. OracleConsumer recibe callback con (marketId, outcome)
6. CREWorkflow.resolveFromOracle(marketId, outcome)
7. PredictionMarket.resolveMarket(marketId, outcome)
8. Usuarios reclaman (claimPayout)
`;

async function simulate() {
  console.log("=== Simulación flujo CRE - PraesagiumChain ===\n");
  console.log("Flujo:");
  console.log(CRE_FLOW);

  // Simular llamada a API backend para obtener outcome
  const API_BASE = process.env.API_BASE_URL || "http://localhost:4000";
  console.log("\n--- Paso 4: Llamada a API backend ---");
  console.log(`Base URL: ${API_BASE}`);

  try {
    const https = require("https");
    const http = require("http");
    const lib = API_BASE.startsWith("https") ? https : http;
    const url = new URL(`${API_BASE}/api/ai/sentiment`);
    const body = JSON.stringify({ text: "Bitcoin will reach 100k this year" });
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
    console.log(`Respuesta API: ${JSON.stringify(data)}`);
    console.log(`Outcome simulado: ${outcome} (${outcome ? "Yes" : "No"})`);
    console.log("\nEn producción: Chainlink envía este outcome a OracleConsumer.");
  } catch (e) {
    console.log("(Backend no disponible - ejecuta: cd backend-rust && cargo run)");
  }

  console.log("\n--- Archivos Chainlink ---");
  console.log("- contracts/CREWorkflow.sol");
  console.log("- contracts/OracleConsumer.sol");
  console.log("- contracts/PredictionMarket.sol");
  console.log("- backend-rust/scripts/ai/sentiment-analysis.js (Chainlink Functions)");
}

simulate().catch(console.error);
