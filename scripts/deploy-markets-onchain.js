/**
 * deploy-markets-onchain.js
 *
 * 1. Reads all base/ai markets from the backend
 * 2. Creates each on the PredictionMarket contract on Sepolia
 * 3. Registers the market in the backend with the correct on_chain_market_id
 *
 * Assumption: For markets without on_chain_market_id, the script uses the backend ID (m.id)
 * to check if it already exists on-chain (getMarket(m.id)). This is valid when markets
 * are created in the same order (backend first, then this script). If on-chain markets
 * are created by another path (e.g. frontend), IDs may not match; in that case use
 * on_chain_market_id in the backend when it already exists.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-markets-onchain.js --network sepolia
 */

import { loadRootEnv } from "./lib/loadRootEnv.mjs";
import { network } from "hardhat";

loadRootEnv();

const BACKEND_URL = process.env.API_BASE_URL || process.env.BACKEND_URL || "http://localhost:4000";
const CONTRACT_ADDRESS =
  process.env.PREDICTION_MARKET_ADDRESS ||
  process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS ||
  "0xf2397b5827860b361427240d1D1F6F89e9bF197f";

const DEPLOYABLE_TYPES = ["base", "ai"];

const ABI = [
  "function createMarket(string calldata question, uint256 closeTime, uint256 resolveTime) external returns (uint256 marketId)",
  "event MarketCreated(uint256 indexed marketId, string question, uint256 closeTime, uint256 resolveTime, address creator)",
  "function getMarket(uint256 marketId) external view returns (tuple(uint256 id, string question, uint256 closeTime, uint256 resolveTime, uint8 status, uint8 outcome, uint256 totalYesStake, uint256 totalNoStake))",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchAllMarkets() {
  const limit = 200;
  let page = 1;
  let all = [];
  while (true) {
    const res = await fetch(`${BACKEND_URL}/api/markets?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error(`Backend ${res.status}`);
    const { items, total } = await res.json();
    all = all.concat(items);
    if (all.length >= total || items.length === 0) break;
    page++;
  }
  return all;
}

async function registerInBackend(market, onChainId, creatorAddress) {
  // Parsear metadata existente para preservarla
  let metadata = {};
  try { metadata = market.metadata ? JSON.parse(market.metadata) : {}; } catch {}

  const body = {
    question: market.question,
    close_time: market.close_time,
    resolve_time: market.resolve_time,
    market_type: market.market_type,
    creator: creatorAddress,
    metadata: JSON.stringify(metadata),
    on_chain_market_id: onChainId,
  };

  const res = await fetch(`${BACKEND_URL}/api/markets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend POST failed: ${res.status} ${text.slice(0, 100)}`);
  }
  return res.json();
}

async function main() {
  const { ethers } = await network.connect();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   PraesagiumChain — Deploy Markets On-Chain (Sepolia)        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer : ${deployer.address}`);
  console.log(`Balance  : ${ethers.formatEther(balance)} ETH`);
  console.log(`Contract : ${CONTRACT_ADDRESS}\n`);

  if (balance < ethers.parseEther("0.05")) {
    console.error("⚠  Balance too low. At least 0.05 ETH is needed for gas.");
    process.exit(1);
  }

  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, deployer);

  // Fetch markets from backend
  console.log("Fetching markets from backend…");
  const allMarkets = await fetchAllMarkets();
  const deployable = allMarkets.filter((m) =>
    DEPLOYABLE_TYPES.includes(m.market_type) && m.status === "Open"
  );
  const skippedTypes = allMarkets.filter((m) => !DEPLOYABLE_TYPES.includes(m.market_type));

  console.log(`Total backend        : ${allMarkets.length}`);
  console.log(`Deployables (base/ai): ${deployable.length}`);
  console.log(`Skipped (private/conditional): ${skippedTypes.length}\n`);

  // Check which already have on_chain_market_id assigned
  const now = Math.floor(Date.now() / 1000);
  const toCreate = [];
  const alreadySynced = [];
  const expiredSkip = [];

  for (const m of deployable) {
    if (m.close_time <= now) {
      expiredSkip.push(m);
      continue;
    }
    if (m.resolve_time <= m.close_time) {
      expiredSkip.push(m);
      continue;
    }
    // If backend already has on_chain_market_id, consider already deployed if it exists on chain
    const chainIdToCheck = m.on_chain_market_id ?? m.id;
    try {
      await contract.getFunction("getMarket")(BigInt(chainIdToCheck));
      alreadySynced.push(m);
    } catch {
      toCreate.push(m);
    }
  }

  console.log(`✓ Already on-chain (ID matches) : ${alreadySynced.length}`);
  console.log(`⊘ Expired (skip)               : ${expiredSkip.length}`);
  console.log(`→ To deploy                   : ${toCreate.length}\n`);

  if (toCreate.length === 0) {
    console.log("✓ All deployable markets are already on-chain.");
    return;
  }

  // Estimar costo
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits("10", "gwei");
  const estCost = 180_000n * gasPrice * BigInt(toCreate.length);
  console.log(`Gas price estimado : ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
  console.log(`Costo total est.   : ~${ethers.formatEther(estCost)} ETH`);
  console.log(`Iniciando deploy de ${toCreate.length} mercados…\n`);

  const results = { ok: 0, fail: 0, skipped: expiredSkip.length + skippedTypes.length };
  const deployedMap = []; // { backendId, onChainId, question }

  for (let i = 0; i < toCreate.length; i++) {
    const m = toCreate[i];
    const prefix = `[${String(i + 1).padStart(3)}/${toCreate.length}]`;

    try {
      // 1. Crear on-chain
      const tx = await contract.createMarket(
        m.question,
        BigInt(m.close_time),
        BigInt(m.resolve_time),
        { gasLimit: 220_000 }
      );

      process.stdout.write(`  ⏳ ${prefix} Enviando tx… ${m.question.slice(0, 40)}\r`);
      const receipt = await tx.wait(1);

      // Extraer ID asignado por el contrato
      const event = receipt.logs
        .map((log) => { try { return contract.interface.parseLog(log); } catch { return null; } })
        .find((e) => e?.name === "MarketCreated");

      const onChainId = event ? Number(event.args.marketId) : null;
      if (!onChainId) throw new Error("No MarketCreated event found in receipt");

      // 2. Registrar en el backend con el on_chain_market_id correcto
      const backendMarket = await registerInBackend(m, onChainId, deployer.address);

      console.log(
        `  ✓ ${prefix} backend#${m.id} → chain#${onChainId} (new backend#${backendMarket.id}) ${m.market_type.toUpperCase().padEnd(5)} ${m.question.slice(0, 45)}`
      );
      deployedMap.push({ backendId: m.id, onChainId, newBackendId: backendMarket.id });
      results.ok++;

      await sleep(400); // pausa entre txs para no saturar el nodo
    } catch (err) {
      const msg = err?.shortMessage || err?.reason || err?.message || String(err);
      console.error(`  ✗ ${prefix} #${m.id} FAILED: ${msg.slice(0, 90)}`);
      results.fail++;
      await sleep(600);
    }
  }

  // Resumen
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log(
    `║  ✓ Deployed : ${String(results.ok).padEnd(4)}  ✗ Failed : ${String(results.fail).padEnd(4)}  ⊘ Skipped : ${String(results.skipped).padEnd(4)} ║`
  );
  console.log("╚══════════════════════════════════════════════════════════════╝");

  if (deployedMap.length > 0) {
    console.log(`\n✓ ${deployedMap.length} mercados ahora tienen on_chain_market_id en el backend.`);
    console.log("  Los IDs on-chain asignados por el contrato son:");
    deployedMap.slice(0, 10).forEach(({ backendId, onChainId, newBackendId }) => {
      console.log(`    backend#${backendId} → chain#${onChainId} (nuevo registro backend#${newBackendId})`);
    });
    if (deployedMap.length > 10) console.log(`    … y ${deployedMap.length - 10} más`);
  }

  if (results.fail > 0) {
    console.log(`\nTip: Ejecuta el script de nuevo para reintentar los ${results.fail} fallidos.`);
  }
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
