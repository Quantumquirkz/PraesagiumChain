# PraesagiumChain — Development guide

This document covers the backend API, configuration, setup (backend, frontend, Supabase), CRE simulation, testnet deploy and verification, demo verticals, Chainlink Automation, and contributing.

---

## 1. Backend overview

The backend is a **Rust (Axum)** REST API that:

- Serves market CRUD, predictions, AI sentiment, and reputation.
- Integrates the prediction engine in-process (no CLI subprocess).
- Uses **PostgreSQL (Supabase)** for markets, predictions, conditional conditions, and creator reputation.
- Can run an **event indexer** (optional) when `RPC_URL` and `PREDICTION_MARKET_ADDRESS` are set.

```mermaid
flowchart LR
    Client[Client] --> API[Axum API]
    API --> Market[MarketService]
    API --> Pred[PredictionService]
    API --> AI[AiService]
    API --> Rep[ReputationService]
    Market --> DB[(PostgreSQL/Supabase)]
    Pred --> engine[engine]
    Rep --> DB
```

---

## 2. Configuration

### 2.1 Environment variables

Copy `config/env.example` to `.env` at the repo root.

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `4000` |
| `DATABASE_URL` | **PostgreSQL** connection string (Supabase URI) | `postgres://localhost/praesagium` |
| `RPC_URL` | Ethereum RPC (optional, for indexer) | — |
| `PREDICTION_MARKET_ADDRESS` | PredictionMarket contract address (optional) | — |
| `START_BLOCK` | Indexer start block (optional) | — |
| `CORS_ORIGINS` | Comma-separated allowed origins (production). If unset, allows all. | — |
| `AI_PROVIDER` | `mock`, `huggingface`, or `gemini` | `mock` |
| `HF_API_KEY` | Hugging Face API key (for `huggingface`) | — |
| `HF_MODEL` | Hugging Face model id | `cardiffnlp/twitter-roberta-base-sentiment-latest` |
| `GEMINI_API_KEY` | Google Gemini API key (for `gemini`) | — |
| `GEMINI_MODEL` | Gemini model id | `gemini-1.5-flash` |

**Migrations:** Tables are created automatically on startup (`db.migrate()`). No separate migration step is required.

**Indexer:** The event indexer (on-chain market sync) runs only when **both** `RPC_URL` and `PREDICTION_MARKET_ADDRESS` are set and non-empty. Leave them unset or empty to run the backend without the indexer. Do not set them to empty strings if the backend is running—use valid values or omit the variables.

### 2.2 Supabase and DATABASE_URL

The backend connects to PostgreSQL via `DATABASE_URL`. With **Supabase**:

- **Direct connection** (`db.PROJECT_REF.supabase.co:5432`) is **IPv6-only**. On IPv4-only networks (e.g. many WSL setups) you will see “Network is unreachable” or “no IPv4 address”. The backend tries to resolve the host to IPv4 when possible; if the host has no IPv4, use the Session pooler instead.
- **Session pooler** (recommended for IPv4): In Supabase Dashboard → **Connect** → **Session pooler**, copy the URI. Format: `postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres`. The **region** in the host (e.g. `us-west-2`) must match your project (see Project Settings or the Connect dialog). Wrong region causes “Tenant or user not found”. In the URI, encode `#` in the password as `%23`.

Schema: either run the backend once (migrations run on startup) or apply `supabase/schema.sql` via Dashboard SQL Editor or `npx supabase db push` (see [PENDIENTES.md](PENDIENTES.md)).

### 2.3 Backend build and run

```bash
cd backend-rust
cargo build --release
cargo run --release
```

---

## 3. API reference

Base URL is configurable (e.g. `http://localhost:4000`). Use `Content-Type: application/json` for POST/PATCH bodies. Errors return 4xx/5xx and may include a JSON body.

### 3.1 Health and metrics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check. |
| GET | `/api/metrics` | Backend metrics (e.g. Prometheus-style). |

### 3.2 Markets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/markets` | List markets. Query: `page`, `limit`, `status`. Returns paginated `MarketView[]`. |
| GET | `/api/markets/stats` | Aggregate stats. |
| GET | `/api/markets/:id` | Single market by id. |
| POST | `/api/markets` | Create market. Body: `CreateMarketRequest`. Returns 201 + `MarketView`. |
| POST | `/api/markets/conditional` | Create conditional market. |
| PATCH | `/api/markets/:id/status` | Update status. Body: `{ "status", "outcome" }` (outcome required if status is Resolved). |
| POST | `/api/markets/:id/prediction` | Set prediction (probability, uncertainty, model_version, model_hash). |
| GET | `/api/markets/:id/predictions` | List predictions for market. |
| POST | `/api/markets/:id/ai/predict` | Run AI sentiment on body `{ "text" }` and store as prediction. |

### 3.3 Report (external sources for CRE)

These endpoints return a single **outcome** (0 or 1) for the Report step.

| Method | Path | Query | Description |
|--------|------|-------|-------------|
| GET | `/api/weather/rained` | `lat`, `lon`, `date` (YYYY-MM-DD) | Open-Meteo: outcome = 1 if precipitation_sum > 0, else 0. |
| GET | `/api/price/above` | `symbol`, `threshold`, optional `source=binance\|coingecko` | outcome = 1 if price ≥ threshold, else 0. |
| GET | `/api/sports/winner` | `fixture_id`, `winner_team` (with `API_FOOTBALL_KEY`); or `winner_team`, `demo_outcome=0\|1` for testing | outcome = 1 if winner_team won, else 0. |

All return `{ "outcome": 0 }` or `{ "outcome": 1 }`.

### 3.4 AI and predict

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/sentiment` | Body: `{ "text" }`. Returns `provider`, `sentiment_score` (-1..1), `probability` (0..1). |
| POST | `/api/predict` | Body: `{ "time_series": TimeSeriesSample, "market_id": number \| null }`. Runs engine. Returns `{ prediction, market_id }`. |
| POST | `/api/predict/hybrid` | Hybrid: `time_series`, `sentiment_text` or `social_texts`, `binance_symbol` or `use_chainlink_price: true`. Returns `probability`, optional `uncertainty`. |

### 3.5 Reputation

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reputation/:address` | Creator reputation. Returns `CreatorReputation`. |

**TimeSeriesSample:** `{ "timestamps": number[], "features": [ { "values": number[] }, ... ] }` — each feature row length must equal `timestamps.length`.

---

## 4. Data shapes (TypeScript-friendly)

```ts
interface MarketView {
  id: number;
  question: string;
  close_time: number;
  resolve_time: number;
  status: string;
  outcome?: string;
  total_yes_stake: number;
  total_no_stake: number;
  creator?: string;
  market_type: string;
  metadata?: string;
  details_hash?: string;
  encrypted_uri?: string;
  latest_prediction?: PredictionView;
}

interface PredictionView {
  probability: number;
  uncertainty?: number;
  model_version?: string;
  timestamp: number;
}

interface CreateMarketRequest {
  question: string;
  close_time: number;
  resolve_time: number;
  creator?: string;
  market_type?: string;
  metadata?: string;
  details_hash?: string;
  encrypted_uri?: string;
}

interface CreatorReputation {
  creator_address: string;
  markets_created: number;
  markets_resolved: number;
  correct_predictions: number;
  reputation_score: number;
  updated_at: number;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
```

---

## 5. Frontend and Supabase setup

- **Frontend env:** Create `frontend/.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`. Use `config/frontend.env.example` as reference.
- **Supabase:** The backend uses **PostgreSQL only** (Supabase or any Postgres). Set `DATABASE_URL` to your Supabase connection URI. Prefer the **Session pooler** URI from Dashboard → Connect → Session pooler when on IPv4-only networks. See § 2.2 above. To apply the schema: run the backend (migrations on startup), or run `supabase/schema.sql` in Supabase Dashboard → SQL Editor, or `npx supabase db push`.
- **Contracts:** Read state via RPC/ethers/viem; writes (create market, bet, resolve, claim) from user wallet. Deploy addresses and ABIs in env or `contracts/artifacts`. See [architecture.md](architecture.md) for contract roles.

---

## 6. Feature guides (AI, tokenized, private, reputation)

- **AI:** `POST /api/ai/sentiment` and `POST /api/markets/:id/ai/predict`; config via `AI_PROVIDER`, `GEMINI_API_KEY`, etc. Chainlink: deploy a consumer that runs sentiment (e.g. script in `backend-rust/scripts/ai/`); script returns 0 or 1.
- **Tokenized markets:** `TokenizedMarket.sol` mints an ERC-721 per market (tokenId = marketId) to the creator. Same market logic; NFT is tradeable (e.g. OpenSea).
- **Private markets:** Only `isParticipant(marketId, account)` can participate. Backend supports `market_type: "private"`, `details_hash`, `encrypted_uri`.
- **Reputation:** `ReputationSystem.sol` on-chain; backend table `creator_reputation` and `GET /api/reputation/:address`.

---

## 7. CRE flow simulation and deployment

### 7.1 Node simulation (quick)

No Chainlink CRE CLI required. Simulates the **Report** step by calling the backend.

1. Deploy contracts locally: `npx hardhat run scripts/deploy/deployLocal.js --network localhost`
2. (Optional) Start the backend: `cp config/env.example .env` then `cd backend-rust && cargo run`
3. Simulate: `node scripts/simulateCRE.js`  
   If `scripts/inputs.json` exists, it uses `text_to_analyze` and optionally `api_base_url`.

In production, the outcome would be sent by Chainlink to `OracleConsumer.oracleCallback(marketId, outcome)`.

### 7.2 Chainlink CRE CLI (official workflow)

- Install [CRE CLI](https://docs.chain.link/cre/getting-started/cli-installation), run `cre login`, set RPC in `project.yaml`.
- Initialize: `cre init` (e.g. Golang template, name `praesagium-resolver`).
- Configure the workflow to call your API (`/api/ai/sentiment` or `/api/predict/hybrid`), obtain outcome 0 or 1, then call `OracleConsumer.oracleCallback(marketId, outcome)` or the Functions Consumer.
- Simulate: `cre workflow simulate <workflow-name> --target staging-settings`. You can pass payload from `scripts/inputs.json` with `--http-payload @./scripts/inputs.json`.
- See [Simulating Workflows](https://docs.chain.link/cre/guides/operations/simulating-workflows).

### 7.3 Chainlink Functions (on-chain resolution)

1. Deploy with Functions Router: `export FUNCTIONS_ROUTER=<Router address>` then `npx hardhat run scripts/deploy/deployWithFunctions.js --network sepolia`
2. Create a subscription at [Chainlink Functions](https://docs.chain.link/chainlink-functions) and fund with LINK.
3. Call `PredictionMarketFunctionsConsumer.sendResolutionRequest(marketId, sourceCode, args, subscriptionId, donId)`; the Router will call back and the Consumer forwards to CREWorkflow.

### 7.4 Relevant files

| File | Purpose |
|------|---------|
| `scripts/simulateCRE.js` | Node simulation of the CRE flow (Report via backend). |
| `scripts/inputs.json` | Example inputs for simulation. |
| `scripts/deploy/deployLocal.js` | Local deployment (OracleConsumer as oracle). |
| `scripts/deploy/deployWithFunctions.js` | Deployment with PredictionMarketFunctionsConsumer (FUNCTIONS_ROUTER). |
| `scripts/resolveFromBackend.js` | Fetch outcome from backend and call `OracleConsumer.oracleCallback(marketId, outcome)`. |

---

## 8. Deploy and verify on testnet

Required for hackathon submissions.

### 8.1 Environment

Copy `config/env.example` to `.env`. Set at least:

- `PRIVATE_KEY` — Deployer wallet. **Use a testnet-only wallet.**
- `SEPOLIA_RPC_URL` — Optional; default `https://rpc.sepolia.org`. Or Alchemy/Infura.
- `ETHERSCAN_API_KEY` — From [etherscan.io/myapikey](https://etherscan.io/myapikey) (for verification).

For Polygon Amoy use `POLYGON_AMOY_RPC_URL` and `POLYGONSCAN_API_KEY`.

### 8.2 Testnet ETH

- **Sepolia:** [sepoliafaucet.com](https://sepoliafaucet.com), [Alchemy Sepolia Faucet](https://www.alchemy.com/faucets/ethereum-sepolia), or [Google Cloud Faucet](https://cloud.google.com/application/dashboard).
- **Polygon Amoy:** [faucet.polygon.technology](https://faucet.polygon.technology) (select Amoy).

### 8.3 Deploy

```bash
npm install
npx hardhat compile
npm run deploy:sepolia
# or: npx hardhat run scripts/deploy/deployWithFunctions.js --network sepolia
```

Save the printed addresses and add to `.env`: `PREDICTION_MARKET_ADDRESS`, `CRE_WORKFLOW_ADDRESS`, `ORACLE_CONSUMER_ADDRESS`. Optional: `DEPLOYER_ADDRESS`.

### 8.4 Verify contracts

```bash
npm run verify:sepolia
# or: npx hardhat run scripts/verify/verify.js --network sepolia
```

For Polygon Amoy use `npm run verify:polygon` and `POLYGONSCAN_API_KEY`. Then add the explorer links to README and [submission.md](submission.md).

---

## 9. Demo vertical (E2E without frontend)

For the hackathon demo video or for judges to run the flow with curl and scripts.

### 9.1 Vertical 1: Sentiment (AI + CRE)

1. Start local chain: `npm run node`. In another terminal: `npm run deploy`. Set `ORACLE_CONSUMER_ADDRESS` in `.env`.
2. Create market and place a bet (Hardhat console or test script). Note market id (e.g. 1).
3. Start backend: `npm run backend`. Get outcome: `curl -s -X POST http://localhost:4000/api/ai/sentiment -H "Content-Type: application/json" -d '{"text":"Bitcoin will reach 100k this year"}'`
4. Resolve on-chain: `node scripts/resolveFromBackend.js --market-id 1 --text "Bitcoin will reach 100k this year"`
5. Claim: `PredictionMarket.claimPayout(1)` from wallet.

### 9.2 Vertical 2: Price (Chainlink / Binance + CRE)

1–2. Same: start node, deploy, create market, place bet.
3. Backend outcome: `curl -s "http://localhost:4000/api/price/above?symbol=ETH&threshold=3000&source=binance"`
4. Resolve: `node scripts/resolveFromBackend.js --market-id 1 --source price --symbol ETH --threshold 3000`
5. Claim: `claimPayout(marketId)`.

### 9.3 Inputs file

`scripts/inputs.json` is used by `simulateCRE.js` and `resolveFromBackend.js` when you do not pass flags: `market_id`, `text_to_analyze`, `api_base_url`. Example in repo.

---

## 10. Chainlink Automation (resolution at resolveTime)

To trigger resolution **automatically** when `resolveTime` is reached:

- **Option A — Off-chain keeper:** Run `scripts/resolveFromBackend.js` from a cron or scheduler. The script fetches the outcome from your backend and sends `OracleConsumer.oracleCallback(marketId, outcome)`. Document as “resolution triggered at resolveTime via keeper script and backend.”
- **Option B — Chainlink Automation (Upkeep):** Register an Upkeep on [Chainlink Automation](https://automation.chain.link/) (e.g. Sepolia). Use a time-based or checker trigger; in perform, obtain the outcome (e.g. via HTTP task or Functions) and submit the result on-chain, or trigger an off-chain job that runs the keeper script.

Flow: resolveTime reached → Automation/Keeper → fetch outcome (backend or Functions) → `OracleConsumer.oracleCallback(marketId, outcome)` → CREWorkflow → PredictionMarket.resolveMarket → users claimPayout.

---

## 11. External data sources (Report)

| Source | Use | Where |
|--------|-----|--------|
| **Backend `/api/ai/sentiment`** | Sentiment on text (Gemini/Hugging Face); returns probability → outcome 0/1. | `scripts/simulateCRE.js`; Chainlink Functions can call a similar API. |
| **Backend `/api/predict/hybrid`** | Combines time series, Binance/Chainlink price and sentiment. | Hybrid integration. |
| **Script `sentiment-analysis.js`** | Keyword-based sentiment for Chainlink Functions; returns 0 or 1. | `backend-rust/scripts/ai/sentiment-analysis.js`. |
| **External APIs (weather, sports)** | `/api/weather/rained`, `/api/price/above`, `/api/sports/winner`. | Report endpoints; can be used from Functions or backend. |

---

## 12. Production and indexer

### 12.1 CORS and rate limiting

- **CORS:** Set `CORS_ORIGINS` to a comma-separated list of allowed origins (e.g. `https://yourapp.vercel.app,http://localhost:3000`). If unset, the backend allows all origins (suitable only for development).
- **Rate limiting:** The backend does not implement rate limiting by default. For production, put the API behind a reverse proxy (e.g. nginx, Cloudflare) or a gateway that enforces rate limits, or add a rate-limiting middleware (e.g. `tower_governor` or similar) and document the chosen approach.

### 12.2 Event indexer

When `RPC_URL` and `PREDICTION_MARKET_ADDRESS` are set, the backend starts an **event indexer** that:

- Listens for `MarketCreated` and `MarketResolved` events from the PredictionMarket contract.
- Inserts or updates markets in the database (by `on_chain_market_id`).
- Updates market status to Resolved and updates creator reputation when `MarketResolved` is seen.

Optional `START_BLOCK` limits scanning to blocks ≥ that number; if unset, indexing starts from the current block (no backfill).

---

## 13. Contributing

- **Setup:** Clone repo; `npm install` and `cd backend-rust && cargo build`. Copy `config/env.example` to `.env` and fill values. Run `npx hardhat compile` and `cargo run` as needed.
- **Code style:** Solidity — OpenZeppelin conventions, one contract per file. Rust — `cargo fmt`, `cargo clippy`. Docs — English, Markdown.
- **Pull requests:** Branch from `main`; keep changes focused; ensure tests pass. Never commit `.env`; use `config/env.example` as reference.

---

## 14. External references

- [Chainlink Functions](https://docs.chain.link/chainlink-functions) — Off-chain execution, return value to consumer.
- [Chainlink Automation](https://docs.chain.link/chainlink-automation) — Scheduled tasks (e.g. resolve at resolveTime).
- [Chainlink CRE – Simulating Workflows](https://docs.chain.link/cre/guides/operations/simulating-workflows) — CRE CLI simulation.
- [Supabase Docs](https://supabase.com/docs) — Auth, Realtime, Database.

For system architecture and contracts, see [architecture.md](architecture.md).
