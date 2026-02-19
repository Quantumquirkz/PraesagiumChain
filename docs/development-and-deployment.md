# PraesagiumChain — Development and Deployment

Unified guide for configuration, API, deployment, CRE simulation, demo, submission checklist, and contribution.

---

## 1. Backend

### 1.1 Overview

The backend is a **Rust (Axum)** REST API that:

- Serves CRUD for markets, predictions, AI sentiment, and reputation.
- Integrates the PHPE engine in-process (no CLI subprocess).
- Uses **PostgreSQL (Supabase)** for markets, predictions, and reputation.
- Runs an **event indexer** (optional) when `RPC_URL` and `PREDICTION_MARKET_ADDRESS` are set.

```mermaid
flowchart LR
    Client[Client] --> API[Axum API]
    API --> Market[MarketService]
    API --> Pred[PredictionService]
    API --> AI[AiService]
    Market --> DB[(PostgreSQL/Supabase)]
    Pred --> engine[Engine]
    AI --> DB
```

### 1.2 Environment variables

Copy `config/env.example` to `.env` at repo root. For CRE simulation, copy `cre/.env.example` to `cre/.env`.

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port | `4000` |
| `DATABASE_URL` | PostgreSQL connection (Supabase) | — |
| `RPC_URL` | Ethereum RPC (optional, for indexer) | — |
| `PREDICTION_MARKET_ADDRESS` | Contract address (optional) | — |
| `START_BLOCK` | Indexer start block | — |
| `CORS_ORIGINS` | Allowed origins (production) | — |
| `AI_PROVIDER` | `mock`, `huggingface`, `gemini` | `mock` |
| `HF_API_KEY`, `GEMINI_API_KEY` | AI API keys | — |
| `GEMINI_MODEL`, `HF_MODEL` | Models | `gemini-1.5-flash` / `cardiffnlp/...` |

**Supabase:** Prefer the **Session pooler** URI (Dashboard → Connect). On IPv4-only networks, direct connection may fail. Encode `#` in password as `%23`.

### 1.3 Build and run

```bash
cd backend-rust
cargo build --release
cargo run --release
# or from root: npm run backend
```

---

## 2. API Reference

Base URL configurable (e.g. `http://localhost:4000`). Use `Content-Type: application/json` for POST/PATCH.

### 2.1 Health and metrics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness |
| GET | `/api/metrics` | Prometheus-style metrics |

### 2.2 Markets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/markets` | List markets. Query: `page`, `limit`, `status`. |
| GET | `/api/markets/:id` | Single market by id |
| POST | `/api/markets` | Create market |
| PATCH | `/api/markets/:id/status` | Update status |
| POST | `/api/markets/:id/ai/predict` | AI prediction (body: `{ "text" }`) |

### 2.3 Report (external sources for CRE)

Return outcome 0 or 1:

| Method | Path | Query | Description |
|--------|------|-------|-------------|
| GET | `/api/weather/rained` | `lat`, `lon`, `date` | Open-Meteo precipitation |
| GET | `/api/price/above` | `symbol`, `threshold`, `source` | Price ≥ threshold |
| GET | `/api/sports/winner` | `fixture_id`, `winner_team` | Match winner |

### 2.4 AI and prediction

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/sentiment` | Body: `{ "text" }`. Returns `sentiment_score`, `probability`. |
| POST | `/api/predict/hybrid` | Hybrid: `time_series`, `sentiment_text`, `binance_symbol`, etc. |

---

## 3. Contract Deployment

### 3.1 Local (Hardhat)

```bash
npm run node          # Terminal 1: Hardhat node
npm run deploy        # Terminal 2: Local deployment
```

Copy addresses to `.env`: `PREDICTION_MARKET_ADDRESS`, `ORACLE_CONSUMER_ADDRESS`, `CRE_WORKFLOW_ADDRESS`. After local deploy, the script calls `setAuthorizedCallback(deployer)`.

### 3.2 Testnet (Sepolia / Polygon Amoy)

1. Configure `.env`: `PRIVATE_KEY`, `SEPOLIA_RPC_URL`, `ETHERSCAN_API_KEY` (or Polygon equivalent).
2. Get testnet ETH: [sepoliafaucet.com](https://sepoliafaucet.com), [faucet.polygon.technology](https://faucet.polygon.technology).
3. Deploy:
   ```bash
   npm run deploy:sepolia   # or deploy:polygon
   ```
4. Verify:
   ```bash
   npm run verify:sepolia
   ```
5. Add addresses to README and submission checklist (section 7).

### 3.3 Chainlink Functions (on-chain resolution)

1. `export FUNCTIONS_ROUTER=<Router address>`
2. `npx hardhat run scripts/deploy/deployWithFunctions.js --network sepolia`
3. Create subscription at [Chainlink Functions](https://docs.chain.link/chainlink-functions) and fund with LINK.
4. Call `setAuthorizedCallback(functionsRouterAddress)` after deploy.

---

## 4. CRE Simulation

### 4.1 Node (quick)

```bash
npm run node
npm run deploy
npm run backend
node scripts/simulateCRE.js
```

### 4.2 Official CRE CLI

```bash
cd cre/praesagium-resolver && bun install
cd .. && cre workflow simulate praesagium-resolver --target staging-settings
```

Select the cron trigger (option 1). Backend must be running.

### 4.3 Relevant scripts

| Script | Purpose |
|--------|---------|
| `npm run demo` / `scripts/demo/demoE2E.js` | Full E2E: create market → bet → advance time → resolve (AI) → claim |
| `scripts/simulateCRE.js` | CRE flow simulation (Report via backend) |
| `scripts/resolveFromBackend.js` | Fetches outcome from backend and calls `oracleCallback` |
| `scripts/deploy/deployLocal.js` | Local deployment (OracleConsumer as oracle) |
| `scripts/deploy/deployWithFunctions.js` | Deployment with Functions Consumer |

---

## 5. Project Verification

### 5.1 Automated tests

```bash
npm test              # Contracts (Hardhat): 5 tests
npm run test:backend  # Backend (Rust): 2 tests
npm run test:all      # Both
```

If they pass, the base code works.

### 5.2 Database

```bash
npm run db:push   # Requires: npx supabase link --project-ref <ref>
```

Or run `supabase/schema.sql` in Supabase SQL Editor.

---

## 6. E2E Demo and Video

### 6.1 Demo requirements

| Variable in `.env` | Purpose |
|-------------------|---------|
| `PREDICTION_MARKET_ADDRESS` | PredictionMarket contract (after deploy) |
| `ORACLE_CONSUMER_ADDRESS` | OracleConsumer contract (after deploy) |
| `CRE_WORKFLOW_ADDRESS` | Optional; deploy uses it internally |
| `RPC_URL` | `http://127.0.0.1:8545` (Hardhat local) |
| `API_BASE_URL` | `http://localhost:4000` (backend) |
| `PRIVATE_KEY` | Hardhat local key or your testnet wallet |
| `DATABASE_URL` | Supabase (backend) |

### 6.2 Steps to run the demo

**Terminal 1 — Hardhat node**
```bash
npm run node
```
Keep it running. If you see `EADDRINUSE: address already in use 127.0.0.1:8545`, the node is already active; do not start another.

**Terminal 2 — Backend**
```bash
npm run backend
```

**Terminal 3 — Deploy and demo**
```bash
npm run deploy
# Copy printed addresses to .env (or they may already be configured)
npm run demo
```

### 6.3 What the demo does

1. **Create market** — `createMarket(question, closeTime, resolveTime)`
2. **Place bet** — `placeBet(marketId, Yes, 0.001 ETH)`
3. **Advance time** — `evm_increaseTime` until past `resolveTime` (required so `resolveMarket` does not revert with `MarketNotClosed`)
4. **Get outcome** — Call backend `/api/ai/sentiment`
5. **Resolve on-chain** — `OracleConsumer.oracleCallback(marketId, outcome)` → CREWorkflow → `PredictionMarket.resolveMarket`
6. **Claim** — `claimPayout(marketId)`

### 6.4 Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `EADDRINUSE 127.0.0.1:8545` | Hardhat node already running | Do not start another; use the existing one |
| `Set in .env: PREDICTION_MARKET_ADDRESS...` | Missing variables | Add deploy addresses to `.env` |
| `CRE callback failed` | `block.timestamp < resolveTime` | Script advances time with `evm_increaseTime`; ensure you have the current version |
| Backend not responding | Backend not started | Run `npm run backend` in another terminal |

### 6.5 Video structure (3–5 min)

| Section | Duration | Content |
|---------|----------|---------|
| Intro | ~30s | Problem: trusted resolution. Solution: Chainlink CRE + AI. |
| Architecture | ~30s | Diagram: Client → Backend → CRE → Contracts |
| CRE simulation | ~1 min | `cre workflow simulate` with backend active |
| E2E demo | ~1.5 min | `npm run demo` |
| Chainlink components | ~30s | CREWorkflow, OracleConsumer, CRE workflow, sentiment script |
| Closing | ~20s | Repo, differentiators (PHPE uncertainty, multi-source CRE) |

### 6.6 API examples for video

```bash
# Sentiment
curl -X POST http://localhost:4000/api/ai/sentiment -H "Content-Type: application/json" \
  -d '{"text":"Bitcoin bullish"}'

# Hybrid
curl -X POST http://localhost:4000/api/predict/hybrid -H "Content-Type: application/json" \
  -d '{"sentiment_text":"ETH going up","use_chainlink_price":true}'
```

---

## 7. Submission Checklist (hackathon)

| Item | Estado |
|------|--------|
| README.md | ✅ |
| CRE workflow | ✅ |
| Contract addresses | ⬜ Fill after testnet deploy |
| Red blockchain | ⬜ Sepolia / Polygon Amoy |
| Scan URL (Etherscan, etc.) | ⬜ |
| Demo video 2–5 min | ⬜ |
| Public repo | ✅ |

**Winning ideas:** PHPE calibrated uncertainty, multi-source CRE, one clear vertical (e.g. “ETH > X$”), testnet + verification + Explorer links.

---

## 8. Pending and Next Steps

| Item | Status |
|------|--------|
| Backend, schema, migrations, tests | ✅ |
| Database on Supabase | ✅ `npx supabase db push` |
| Testnet deploy | ⬜ Requires your wallet and testnet ETH |
| Demo video / live link | ⬜ |
| Frontend | Out of scope |

**To apply schema to another project:** `npx supabase link --project-ref <ref>` and `npx supabase db push`, or run `supabase/schema.sql` in Supabase SQL Editor.

---

## 9. Contributing

- **Setup:** `npm install`, `cd backend-rust && cargo build`. Copy `config/env.example` to `.env`.
- **Style:** Solidity — OpenZeppelin conventions. Rust — `cargo fmt`, `cargo clippy`. Docs in English.
- **PRs:** Branch from `main`, focused changes, tests passing. Do not commit `.env`.

### External references

- [Chainlink Functions](https://docs.chain.link/chainlink-functions)
- [Chainlink Automation](https://docs.chain.link/chainlink-automation)
- [Chainlink CRE – Simulating Workflows](https://docs.chain.link/cre/guides/operations/simulating-workflows)
- [Supabase Docs](https://supabase.com/docs)
