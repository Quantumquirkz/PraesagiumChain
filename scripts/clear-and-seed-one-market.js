/**
 * clear-and-seed-one-market.js
 *
 * 1. Borra todos los mercados del backend (DELETE /api/admin/clear-markets).
 * 2. Crea UN mercado on-chain (createMarket en el contrato).
 * 3. Registra ese mercado en el backend con on_chain_market_id.
 *
 * El mercado es algo random pero apostable: primera cifra hex del block hash.
 * Cierra en 7 días y resuelve en 10 días.
 *
 * Uso:
 *   Backend corriendo (y ENVIRONMENT distinto de production).
 *   npx hardhat run scripts/clear-and-seed-one-market.js --network localhost
 *   npx hardhat run scripts/clear-and-seed-one-market.js --network sepolia
 */

require("./lib/load-env").loadRootEnv();
const { ethers } = require("hardhat");

const BACKEND_URL = process.env.API_BASE_URL || process.env.BACKEND_URL || "http://localhost:4000";
const CONTRACT_ADDRESS =
  process.env.PREDICTION_MARKET_ADDRESS ||
  process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS ||
  "0xf2397b5827860b361427240d1D1F6F89e9bF197f";

const ABI = [
  "function createMarket(string calldata question, uint256 closeTime, uint256 resolveTime) external returns (uint256 marketId)",
  "event MarketCreated(uint256 indexed marketId, string question, uint256 closeTime, uint256 resolveTime, address creator)",
];

// Mercado random pero apostable: cierra en 7 días, resuelve en 10
const QUESTION = "Will the first hex digit of the next block hash be 0-7 (even)?";
const now = Math.floor(Date.now() / 1000);
const closeTime = now + 7 * 24 * 60 * 60;
const resolveTime = now + 10 * 24 * 60 * 60;

async function clearMarkets() {
  const res = await fetch(`${BACKEND_URL}/api/admin/clear-markets`, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`clear-markets failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  console.log("  ✓ Backend: cleared", data.deleted ?? 0, "markets");
}

async function registerInBackend(onChainId, creatorAddress) {
  const body = {
    question: QUESTION,
    close_time: closeTime,
    resolve_time: resolveTime,
    market_type: "base",
    creator: creatorAddress,
    on_chain_market_id: onChainId,
  };
  const res = await fetch(`${BACKEND_URL}/api/markets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) return res.json();
  if (res.status === 404) {
    const getRes = await fetch(`${BACKEND_URL}/api/markets/chain/${onChainId}`);
    if (getRes.ok) {
      const market = await getRes.json();
      console.log("   (POST 404 but market already exists via indexer, using it)");
      return market;
    }
  }
  const text = await res.text();
  throw new Error(`Backend POST failed: ${res.status} ${text.slice(0, 200)}`);
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   PraesagiumChain — Clear & seed one market (on-chain)       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  console.log("Backend:", BACKEND_URL);
  console.log("Contract:", CONTRACT_ADDRESS);
  console.log("Question:", QUESTION);
  console.log("");

  // 1. Clear backend
  console.log("1. Clearing all markets in backend…");
  try {
    await clearMarkets();
  } catch (e) {
    console.error("   ✗", e.message);
    console.error("   Make sure the backend is running and ENVIRONMENT is not production.");
    process.exit(1);
  }

  // 2. Create on-chain
  console.log("2. Creating market on-chain…");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, deployer);
  let onChainId;
  try {
    const tx = await contract.createMarket(QUESTION, BigInt(closeTime), BigInt(resolveTime), {
      gasLimit: 220_000,
    });
    const receipt = await tx.wait(1);
    const event = receipt.logs
      .map((log) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e?.name === "MarketCreated");
    onChainId = event ? Number(event.args.marketId) : null;
    if (!onChainId) throw new Error("No MarketCreated event in receipt");
    console.log("   ✓ Tx:", receipt.hash);
    console.log("   ✓ On-chain market ID:", onChainId);
  } catch (e) {
    console.error("   ✗", e.message || e);
    console.error("   For localhost: run 'npm run node' and ensure the contract is deployed.");
    process.exit(1);
  }

  // 3. Register in backend
  console.log("3. Registering market in backend…");
  const market = await registerInBackend(onChainId, deployer.address);
  console.log("   ✓ Backend market id:", market.id);
  console.log("");
  console.log("Done. You can open /markets/" + market.id + " to view and place bets.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
