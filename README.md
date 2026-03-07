# PraesagiumChain

<p align="center">
  <strong>Decentralized Prediction Markets — Trustless AI-Powered Resolution via Chainlink CRE</strong><br>
  PHPE Engine · Multi-Source Data · Solidity Smart Contracts · Rust Backend
</p>

<p align="center">
  <a href="https://github.com/quantumquirkz/PraesagiumChain/actions"><img src="https://img.shields.io/github/actions/workflow/status/quantumquirkz/PraesagiumChain/deploy.yml?branch=main&label=CI&style=flat-square" alt="CI" /></a>
  <img src="https://img.shields.io/badge/Solidity-0.8.24-363636?style=flat-square&logo=solidity" alt="Solidity" />
  <img src="https://img.shields.io/badge/Rust-1.70+-DEA584?style=flat-square&logo=rust" alt="Rust" />
  <img src="https://img.shields.io/badge/Chainlink-CRE-375BD2?style=flat-square&logo=chainlink" alt="Chainlink CRE" />
  <img src="https://img.shields.io/badge/Network-Sepolia-6F4CFF?style=flat-square" alt="Sepolia" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#prerequisites">Prerequisites</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#commands">Commands</a> •
  <a href="#api-reference">API</a> •
  <a href="#deployed-contracts">Contracts</a> •
  <a href="#testing">Testing</a> •
  <a href="#documentation">Docs</a>
</p>

---

## Overview

**PraesagiumChain** is a decentralized prediction market platform built for the [Chainlink Prediction Markets Hackathon](https://chain.link/community/hackathon). Users create binary (Yes/No) markets on real-world events — price movements, weather, sports outcomes, news sentiment — stake ETH, and markets are resolved trustlessly via the **Chainlink Runtime Environment (CRE)** using AI and live data feeds.

The platform goes beyond a simple oracle integration. Its core is the **PHPE (Praesagium Hybrid Predictive Engine)**, a Rust-based ML pipeline that fuses time-series predictions, AI sentiment (Gemini / Hugging Face), and live price data (Binance, Chainlink) into a single calibrated probability with an **uncertainty band** — something no other prediction market platform currently exposes to users.

The backend is a production-grade **Rust/Axum** REST API backed by PostgreSQL, with a built-in on-chain event indexer, rate limiting, and 7 external data source integrations. The smart contract layer includes standard markets, private commit-reveal markets (Confidential Compute), conditional markets, tokenized (ERC-721) markets, and an on-chain reputation system.

---

## What Makes PraesagiumChain Unique

| Differentiator | Description |
|----------------|-------------|
| **Calibrated Uncertainty (PHPE)** | Users see not just a probability but an **uncertainty band** (e.g. "65% ±12%") from a dedicated Bayesian + time-series engine — so they can gauge confidence before betting. |
| **Hybrid Prediction API** | Fuses 3 signals: PHPE time-series (35%) + AI sentiment (40%) + live price data (25%) into one calibrated probability via `/api/predict/hybrid`. |
| **Single CRE Layer for All Sources** | Resolution from AI sentiment, Chainlink Price Feeds, Binance, sports/weather APIs — all through one Chainlink CRE workflow. |
| **Private Prediction Markets (TEE)** | Commit-reveal bets with a dedicated CRE workflow for Confidential Compute resolution — positions are hidden until reveal. |
| **On-Chain Reputation System** | Market creators accumulate a verifiable reputation score based on prediction accuracy, visible on-chain and via API. |
| **Modular Contract Design** | Conditional, private, tokenized (NFT), and base markets share a common interface — easily extensible. |

---

## Architecture

### System Overview

```mermaid
flowchart TB
    subgraph clients [Clients]
        UI[Frontend / User]
        Wallet[Wallet / RPC]
    end

    subgraph backend [Backend - Rust / Axum - port 4000]
        API[REST API]
        PHPE[PHPE Engine]
        AISvc[AI Service]
        Hybrid[Hybrid Predictor]
        Indexer[Event Indexer]
        Cache[TTL Cache]
        Sources[Data Sources x7]
        API --> PHPE
        API --> AISvc
        API --> Hybrid
        API --> Sources
        Indexer --> API
    end

    subgraph chain [Blockchain - Sepolia]
        PM[PredictionMarket.sol]
        CRE[CREWorkflow.sol]
        OC[OracleConsumer.sol]
        Rep[ReputationSystem.sol]
        OC -->|resolveFromOracle| CRE
        CRE -->|resolveMarket| PM
        PM -->|onMarketCreated / Resolved| Rep
    end

    subgraph external [External Services]
        Gemini[Gemini AI]
        HF[Hugging Face]
        Binance[Binance API]
        CL[Chainlink Data Feed]
        News[Finnhub]
    end

    UI <-->|HTTP REST| API
    Wallet <-->|ethers / wagmi| chain
    AISvc --> Gemini
    AISvc --> HF
    Sources --> Binance
    Sources --> CL
    Sources --> News
    Indexer -.->|RPC events| PM
```

### CRE Workflow — Compute · Report · Evaluate

```mermaid
flowchart LR
    subgraph compute [Compute]
        A[User creates market] --> B[PredictionMarket.createMarket]
        B --> C[closeTime + resolveTime registered on-chain]
    end
    subgraph report [Report]
        D[CRON trigger at resolveTime] --> E[CRE workflow calls /api/ai/sentiment]
        E --> F[Gemini / HuggingFace returns probability]
        F --> G[Map to outcome 0 or 1]
    end
    subgraph evaluate [Evaluate]
        G --> H[OracleConsumer.oracleCallback]
        H --> I[CREWorkflow.resolveFromOracle]
        I --> J[PredictionMarket.resolveMarket]
        J --> K[Winners call claimPayout]
    end
    compute --> report --> evaluate
```

### Resolution Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant PM as PredictionMarket
    participant OC as OracleConsumer
    participant CRE as CREWorkflow
    participant CL as Chainlink CRE

    U->>PM: createMarket(question, closeTime, resolveTime)
    U->>PM: placeBet(marketId, Yes/No) + ETH
    Note over PM: closeTime reached — market locked
    CL->>OC: oracleCallback(marketId, outcome)
    OC->>CRE: resolveFromOracle(marketId, outcome)
    CRE->>PM: resolveMarket(marketId, outcome)
    Note over PM: Market resolved — payouts available
    U->>PM: claimPayout(marketId)
```

### Market Lifecycle

```mermaid
flowchart LR
    Create[createMarket] --> Open[Open]
    Open -->|placeBet| Betting[Betting phase]
    Betting -->|closeTime reached| Locked[Locked]
    Locked -->|CRE resolves| Resolved[Resolved]
    Resolved -->|claimPayout| Paid[Paid out]
```

### PHPE Pipeline

```mermaid
flowchart LR
    TS[Time series input] --> Norm[Normalize]
    Norm --> Causal[Causal DAG inference]
    Causal --> Temporal[Temporal encoder]
    Temporal --> Bayes[Bayesian head - MC dropout]
    Bayes --> Calib[Isotonic calibration]
    Calib --> Out[probability + uncertainty]
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Smart Contracts** | Solidity + OpenZeppelin + Chainlink | 0.8.24 / ^5.0.2 / ^1.0.0 |
| **Contract Tooling** | Hardhat | ^2.22.0 |
| **Backend** | Rust + Axum + Tokio | 1.70+ / 0.7 / 1.0 |
| **Prediction Engine** | PHPE (ndarray, MC dropout, isotonic calibration) | internal |
| **Database** | PostgreSQL via SQLx | 0.7 |
| **On-chain Indexer** | ethers-rs | 2.0 |
| **AI Providers** | Gemini API / Hugging Face Inference API | gemini-2.0-flash |
| **CRE Workflow** | TypeScript + @chainlink/cre-sdk | ^1.0.7 |
| **Frontend** | Next.js 14 + wagmi v2 + Tailwind CSS + lightweight-charts | 14.2.15 / 2.12 / 3.4 / 5.1 |

---

## Prerequisites

Before running the project, ensure you have the following installed:

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **npm** | 9+ | bundled with Node.js |
| **Rust** | 1.70+ | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| **Bun** *(CRE only)* | 1.2+ | `curl -fsSL https://bun.sh/install \| bash` |
| **CRE CLI** *(CRE only)* | latest | `curl -sSL https://cre.chain.link/install.sh \| bash` |
| **Git** | any | [git-scm.com](https://git-scm.com) |

**Accounts / Services required:**

- [Google AI Studio](https://aistudio.google.com/api-keys) — for `GEMINI_API_KEY` (optional, mock provider available)
- Ethereum wallet with [Sepolia ETH](https://sepoliafaucet.com) — for testnet deployment

---

## Quick Start

> **Guía detallada:** Para instalación paso a paso y **comandos para ejecutar** el proyecto (frontend, backend, Hardhat), ver [INSTALL.md](INSTALL.md).

### Development on Windows (WSL)

If you develop on **Windows**, always use a **WSL (Ubuntu)** terminal for project commands — not CMD or PowerShell. This avoids UNC path errors and the system not finding Node binaries.

- **Node and npm:** install them **inside WSL** (e.g. with [nvm](https://github.com/nvm-sh/nvm)); then `npm run dev` and `npm run backend` will find `next` and other binaries in `node_modules/.bin`.
- If you see *"next" not recognized* or messages mentioning CMD.EXE or UNC paths, open a new WSL terminal and check with `which node` and `which npm` that they point to WSL paths (e.g. `~/.nvm/versions/node/...`), not `/mnt/c/...`.

### Local Development (full stack)

**Step 1 — Clone and install dependencies**

```bash
git clone https://github.com/quantumquirkz/PraesagiumChain.git
cd PraesagiumChain

# Contracts + Hardhat tooling
npm install
npx hardhat compile

# Frontend (Next.js)
cd frontend
npm install
cd ..
```

**Step 2 — Configure environment**

```bash
# Backend + contracts
cp config/env.example .env

# Frontend
cp config/frontend.env.example frontend/.env.local
```

Edit `.env` with at minimum these values:

```env
DATABASE_URL=sqlite://praesagium.db
AI_PROVIDER=gemini          # or "mock" to skip AI key
GEMINI_API_KEY=your_key     # skip if AI_PROVIDER=mock
PRIVATE_KEY=your_hardhat_or_wallet_key
RPC_URL=http://127.0.0.1:8545
API_BASE_URL=http://localhost:4000
```

Edit `frontend/.env.local` with:

```env
# Optional: leave NEXT_PUBLIC_API_BASE_URL unset to use the Next.js proxy to the backend (recommended for local dev).
# Set it only if you need the browser to call the backend URL directly.
# NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0xf2397b5827860b361427240d1D1F6F89e9bF197f
NEXT_PUBLIC_BLOCK_EXPLORER_URL=https://sepolia.etherscan.io
```

**Step 3 — Apply database migrations**

The backend uses SQLite by default (zero-config for local development). Migrations run automatically on startup via SQLx.

```bash
# Backend will auto-migrate on first run; no separate step needed.
# To verify: check that praesagium.db is created (in the current working directory from which the backend was started; e.g. run `npm run backend` from repo root so the DB lives at the root).
```

**Step 4 — Start the local blockchain**

```bash
# Terminal 1
npm run node
```

**Step 5 — Start the backend**

```bash
# Terminal 2
npm run backend
# Backend starts on http://localhost:4000
# Health check: curl http://localhost:4000/health
```

**Step 6 — Deploy contracts**

```bash
# Terminal 3
npm run deploy
# Copy printed addresses to .env:
# PREDICTION_MARKET_ADDRESS=0x...
# ORACLE_CONSUMER_ADDRESS=0x...
# CRE_WORKFLOW_ADDRESS=0x...
```

**Step 7 — Start the frontend**

```bash
# Terminal 4
cd frontend
npm run dev
# Frontend starts on http://localhost:3000
```

**Step 8 — Run the E2E demo**

```bash
npm run demo
# Flow: create market → place bet → advance time → resolve via AI → claim payout
```

### CRE Workflow Simulation

**Option A — Node.js (quick)**

```bash
node scripts/simulateCRE.js
```

**Option B — Official Chainlink CRE CLI**

```bash
# Install CRE CLI first (see Prerequisites)
cd cre/praesagium-resolver
bun install          # or: npm install

cd ..
cp .env.example .env
# Set CRE_ETH_PRIVATE_KEY in cre/.env

cre workflow simulate praesagium-resolver --target staging-settings
# Select option 1 (cron-trigger) when prompted
# Backend must be running (npm run backend)
```

---

## Configuration

Copy `config/env.example` to `.env` at the repo root. For CRE simulation, copy `cre/.env.example` to `cre/.env`.  
**Checklist de keys y APIs:** [docs/keys-and-apis.md](docs/keys-and-apis.md).

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port for the backend | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | required |
| `DB_POOL_SIZE` | Connection pool size | `10` |
| `PREDICTION_CACHE_TTL` | Prediction cache TTL in seconds | `300` |
| `RATE_LIMIT_PER_SECOND` | Requests per second per IP | `300` |
| `RATE_LIMIT_BURST` | Burst size for rate limiting | `200` |
| `CORS_ORIGINS` | Comma-separated allowed origins (production) | all allowed |

### AI Providers

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_PROVIDER` | `gemini`, `huggingface`, or `mock` | `mock` |
| `GEMINI_API_KEY` | Google Gemini API key | — |
| `GEMINI_MODEL` | Gemini model name | `gemini-2.0-flash` |
| `HF_API_KEY` | Hugging Face API key | — |
| `HF_MODEL` | Hugging Face model | `cardiffnlp/twitter-roberta-base-sentiment` |

### Blockchain / Indexer

| Variable | Description | Default |
|----------|-------------|---------|
| `RPC_URL` | Ethereum RPC URL (for event indexer) | — |
| `PREDICTION_MARKET_ADDRESS` | Deployed contract address (backend). Must match `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS` in the frontend for the same network. | — |
| `START_BLOCK` | Block number to start indexing from | — |

### Hardhat / Testnet

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Deployer wallet private key (no `0x` prefix) |
| `SEPOLIA_RPC_URL` | Sepolia RPC URL (Alchemy recommended) |
| `ETHERSCAN_API_KEY` | For contract verification on Etherscan |
| `POLYGON_AMOY_RPC_URL` | Polygon Amoy RPC URL |
| `POLYGONSCAN_API_KEY` | For contract verification on Polygonscan |

### Post-deploy (after `npm run deploy`)

| Variable | Description |
|----------|-------------|
| `PREDICTION_MARKET_ADDRESS` | PredictionMarket contract address |
| `CRE_WORKFLOW_ADDRESS` | CREWorkflow contract address |
| `ORACLE_CONSUMER_ADDRESS` | OracleConsumer contract address |
| `API_BASE_URL` | Backend URL (e.g. `http://localhost:4000`) |

### Optional APIs

| Variable | Description |
|----------|-------------|
| `FINNHUB_API_KEY` | Finnhub stocks/crypto data |
| `FUNCTIONS_ROUTER` | Chainlink Functions Router address |

---

## Commands

### Core

| Command | Description |
|---------|-------------|
| `npm run node` | Start Hardhat local blockchain (port 8545) |
| `npm run backend` | Start Rust backend (port 4000) |
| `npm run demo` | Full E2E demo: create → bet → resolve → claim |

### Frontend (run from `frontend/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (port 3000) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

### Contracts

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile Solidity + sync CRE ABI |
| `npm run deploy` | Deploy to localhost (Hardhat node) |
| `npm run deploy:private` | Deploy PrivatePredictionMarket to localhost |
| `npm run deploy:sepolia` | Deploy to Sepolia testnet |
| `npm run deploy:polygon` | Deploy to Polygon Amoy testnet |
| `npm run verify:sepolia` | Verify contracts on Etherscan |
| `npm run verify:polygon` | Verify contracts on Polygonscan |

### Testing & Quality

| Command | Description |
|---------|-------------|
| `npm test` | Run Hardhat contract tests (5 tests) |
| `npm run test:backend` | Run Rust backend tests (2 tests) |
| `npm run test:all` | Run all tests (contracts + backend) |
| `npm run audit` | `npm audit` + `cargo audit` for dependency vulnerabilities |

### Database & Utilities

| Command | Description |
|---------|-------------|
| `npm run sync:cre-abi` | Sync OracleConsumer ABI to CRE workflow directory |

### CRE CLI

```bash
# Simulate standard market resolver
cd cre && cre workflow simulate praesagium-resolver --target staging-settings

# Simulate confidential market resolver
cd cre && cre workflow simulate praesagium-resolver-confidential --target staging-settings

# Broadcast on-chain (production)
cd cre && cre workflow simulate praesagium-resolver --target production-settings --broadcast
```

### Rust (direct)

```bash
cd backend-rust
cargo build --release        # Build optimized binary
cargo run --release          # Run backend directly
cargo test                   # Run backend tests
cargo clippy                 # Lint
cargo fmt                    # Format
```

---

## API Reference

Base URL: `http://localhost:4000` (local) or your deployed backend URL.
All POST/PATCH requests require `Content-Type: application/json`.

### Health & Metrics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check — returns `{ "ok": true }` |
| GET | `/api/metrics` | Prometheus-style metrics |

### Markets

| Method | Path | Query / Body | Description |
|--------|------|-------------|-------------|
| GET | `/api/markets` | `page`, `limit`, `status` | List markets (paginated) |
| GET | `/api/markets/stats` | — | Global stats (total, open, resolved) |
| GET | `/api/markets/:id` | — | Single market by ID |
| POST | `/api/markets` | `CreateMarketRequest` | Create market (mirror on-chain to DB) |
| PATCH | `/api/markets/:id/status` | `{ "status": "..." }` | Update market status |
| POST | `/api/markets/:id/prediction` | `PredictionView` | Store prediction for market |
| GET | `/api/markets/:id/predictions` | `limit` | List predictions for market |
| POST | `/api/markets/:id/ai/predict` | `{ "text": "..." }` | AI prediction for specific market |
| POST | `/api/markets/conditional` | `ConditionalMarketRequest` | Create conditional market |

### AI & Prediction

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/ai/sentiment` | `{ "text": "..." }` | Sentiment analysis → `{ probability, sentiment_score, provider }` |
| POST | `/api/predict` | `{ "time_series": [...] }` | PHPE time-series prediction |
| POST | `/api/predict/hybrid` | See below | Hybrid: PHPE + sentiment + price data |

**Hybrid prediction body:**

```json
{
  "time_series": [{ "timestamp": 1234567890, "value": 50000.5 }],
  "sentiment_text": "Bitcoin is bullish",
  "social_texts": ["Tweet 1", "Tweet 2"],
  "binance_symbol": "BTCUSDT",
  "use_chainlink_price": true,
  "market_id": 1
}
```

### Resolution Sources (for CRE)

| Method | Path | Query | Description |
|--------|------|-------|-------------|
| GET | `/api/price/above` | `symbol`, `threshold`, `source` | Returns `{ "outcome": 0 \| 1 }` — price ≥ threshold |
| GET | `/api/weather/rained` | `lat`, `lon`, `date` | Returns `{ "outcome": 0 \| 1 }` — precipitation check |
| GET | `/api/sports/winner` | `fixture_id`, `winner_team` | Returns `{ "outcome": 0 \| 1 }` — match winner |

### Reputation

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reputation/:address` | Creator reputation stats by Ethereum address |

### Data Sources

| Method | Path | Query | Description |
|--------|------|-------|-------------|
| GET | `/api/sources` | — | List all available data sources |
| GET | `/api/sources/fetch` | `source`, `symbol?`, `fsym?`, `tsym?`, `pair?`, `query?` | Fetch live data from a source |

**Source examples:**

```bash
# Binance 24h ticker
curl "http://localhost:4000/api/sources/fetch?source=binance&symbol=BTCUSDT"

# Chainlink ETH/USD price feed
curl "http://localhost:4000/api/sources/fetch?source=chainlink"

# CryptoCompare
curl "http://localhost:4000/api/sources/fetch?source=cryptocompare&fsym=BTC&tsym=USD"

```

**Sentiment + hybrid examples:**

```bash
# Sentiment analysis
curl -X POST http://localhost:4000/api/ai/sentiment \
  -H "Content-Type: application/json" \
  -d '{"text":"Bitcoin is going to reach 100k this year"}'

# Hybrid prediction (sentiment + Binance + Chainlink)
curl -X POST http://localhost:4000/api/predict/hybrid \
  -H "Content-Type: application/json" \
  -d '{"sentiment_text":"ETH bullish","binance_symbol":"ETHUSDT","use_chainlink_price":true}'
```

---

## Data Sources

| Source | Data | Requires Key |
|--------|------|:---:|
| **Binance** | 24h ticker, price change, volume | No |
| **Chainlink** | ETH/USD price feed proxy | No |
| **CryptoCompare** | Crypto prices, 24h change | No |
| **Kraken** | Crypto prices (public API) | No |
| **ExchangeRate API** | Forex EUR/USD | No |
| **Finnhub** | Stocks + crypto prices | Yes (`FINNHUB_API_KEY`) |
| **Open-Meteo** | Weather / precipitation | No |
| **CoinGecko** | Prices (price-above endpoint) | No |
| **API-Football** | Sports match results | No |

---

## Chainlink Integration

PraesagiumChain is built around the [Chainlink Runtime Environment (CRE)](https://chain.link/chainlink-runtime-environment) as the core orchestration layer.

| Component | File | Role |
|-----------|------|------|
| **CRE Workflow (standard)** | [`cre/praesagium-resolver/main.ts`](cre/praesagium-resolver/main.ts) | CRON → HTTP `/api/ai/sentiment` → outcome 0/1 → `oracleCallback` |
| **CRE Workflow (confidential)** | [`cre/praesagium-resolver-confidential/main.ts`](cre/praesagium-resolver-confidential/main.ts) | Same flow in TEE — for private markets |
| **OracleConsumer.sol** | [`contracts/OracleConsumer.sol`](contracts/OracleConsumer.sol) | Receives CRE callback; forwards to CREWorkflow |
| **CREWorkflow.sol** | [`contracts/CREWorkflow.sol`](contracts/CREWorkflow.sol) | Bridge: oracle result → `PredictionMarket.resolveMarket()` |
| **PredictionMarket.sol** | [`contracts/PredictionMarket.sol`](contracts/PredictionMarket.sol) | Binary markets, bets, resolution, payouts |
| **PrivatePredictionMarket.sol** | [`contracts/PrivatePredictionMarket.sol`](contracts/PrivatePredictionMarket.sol) | Commit-reveal markets (Confidential Compute) |

**CRE SDK used:** `@chainlink/cre-sdk ^1.0.7`

**Chainlink primitives used:**
- `CronCapability` — schedule-based workflow trigger
- `HTTPClient` — off-chain HTTP requests to backend
- `consensusIdenticalAggregation` — multi-node consensus on result
- `Runner` — workflow lifecycle management

**References:**
- [CRE Documentation](https://docs.chain.link/cre/getting-started/part-1-project-setup-ts)
- [CRE Simulating Workflows](https://docs.chain.link/cre/guides/operations/simulating-workflows)
- [Chainlink Prediction Market Demo Template](https://docs.chain.link/cre-templates/prediction-market-demo)

---

## Deployed Contracts

### Sepolia Testnet

| Contract | Address | Explorer |
|----------|---------|---------|
| PredictionMarket | `0xf2397b5827860b361427240d1D1F6F89e9bF197f` | [View on Etherscan](https://sepolia.etherscan.io/address/0xf2397b5827860b361427240d1D1F6F89e9bF197f) |
| CREWorkflow | `0x3724BD048C11f50e01900061D8D50022A7c890c7` | [View on Etherscan](https://sepolia.etherscan.io/address/0x3724BD048C11f50e01900061D8D50022A7c890c7) |
| OracleConsumer | `0x153D088Eabb57b021503Aa1192F511B14e8819D8` | [View on Etherscan](https://sepolia.etherscan.io/address/0x153D088Eabb57b021503Aa1192F511B14e8819D8) |

### Deploy to Testnet

```bash
# 1. Configure .env with PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY
# 2. Get Sepolia ETH from https://sepoliafaucet.com

npm run deploy:sepolia
npm run verify:sepolia
```

See [docs/deploy-testnet.md](docs/deploy-testnet.md) for a complete step-by-step guide.

---

## Project Structure

```
PraesagiumChain/
├── .github/
│   └── workflows/deploy.yml      # CI: contract tests + Rust tests + audits
├── config/
│   └── env.example               # Template → copy to root .env
├── contracts/
│   ├── PredictionMarket.sol      # Core: binary markets, bets, payouts
│   ├── CREWorkflow.sol           # Bridge: oracle result → resolveMarket
│   ├── OracleConsumer.sol        # Receives CRE/Chainlink callback
│   ├── PrivatePredictionMarket.sol  # Commit-reveal private markets
│   ├── TokenizedMarket.sol       # ERC-721 tokenized markets
│   ├── ConditionalMarket.sol     # Markets chained on other markets
│   ├── ReputationSystem.sol      # On-chain creator reputation
│   └── interfaces/               # IPredictionMarket, IReputationSystem
├── backend-rust/
│   ├── src/
│   │   ├── api/                  # Route handlers (markets, ai, hybrid, report, reputation, sources, metrics)
│   │   ├── services/             # Business logic + data sources (7 sources) + AI providers
│   │   │   ├── ai/               # Gemini, HuggingFace, Mock providers
│   │   │   └── sources/          # Binance, Chainlink, CryptoCompare, Kraken, ExchangeRate, Finnhub
│   │   ├── main.rs               # App entrypoint, router, service wiring
│   │   ├── config.rs             # Typed config from env
│   │   ├── db.rs                 # PostgreSQL pool + migrations
│   │   ├── models.rs             # Shared request/response types
│   │   └── error.rs              # Unified error type
│   ├── phpe/                     # PHPE prediction engine (standalone crate)
│   │   └── src/
│   │       ├── data/             # Normalization, feature extraction
│   │       ├── causal/           # Causal DAG inference
│   │       ├── temporal/         # Temporal encoding (sliding window, regime detection)
│   │       ├── bayesian/         # Bayesian head with MC dropout
│   │       └── calibration/      # Isotonic / temperature calibration
│   └── migrations/               # SQL migration files
├── frontend/                     # Next.js 14 App Router frontend
│   ├── app/                      # Pages (App Router)
│   │   ├── page.tsx              # Dashboard — market list + stats
│   │   ├── layout.tsx            # Root layout (Header, LiveTicker, Footer)
│   │   ├── globals.css           # CSS variables, design tokens, animations
│   │   ├── markets/create/       # Create market wizard (3-step, Sepolia-enforced)
│   │   ├── markets/[id]/         # Market detail + interactive chart + bet form
│   │   ├── positions/            # My positions + payout claiming
│   │   ├── about/                # About page
│   │   └── signals/              # Live signals dashboard (PHPE + hybrid)
│   ├── components/               # Reusable UI components
│   │   ├── ui/                   # shadcn/ui primitives (Button, Card, Dialog, etc.)
│   │   ├── logo.tsx              # Brand logo (hexagon + circles, theme-aware)
│   │   ├── market-card.tsx       # Market list item with YES/NO stake bar
│   │   ├── market-detail.tsx     # Full market view (CoinGecko-inspired layout)
│   │   ├── tv-chart.tsx          # Interactive candlestick chart (lightweight-charts v5)
│   │   ├── bet-form.tsx          # Yes/No bet form with payout estimation
│   │   ├── live-ticker.tsx       # Live price ticker bar
│   │   ├── countdown.tsx         # Countdown blocks (days/hours/min/sec)
│   │   ├── stats-cards.tsx       # Dashboard statistics cards
│   │   ├── header.tsx            # Navigation header with wallet + network guard
│   │   ├── footer.tsx            # API health status + explorer link
│   │   └── providers.tsx         # WagmiProvider + QueryClientProvider + ThemeProvider
│   ├── hooks/
│   │   ├── use-markets.ts        # React Query hook for market list + stats
│   │   ├── use-network-guard.ts  # Enforces Sepolia; reads chainId from window.ethereum
│   │   ├── use-place-bet.ts      # wagmi writeContract wrapper for placeBet
│   │   ├── use-ohlcv-history.ts  # Fetches OHLCV data for tv-chart
│   │   └── use-signal-fusion.ts  # Hybrid prediction signal aggregation
│   ├── lib/
│   │   ├── api.ts                # All backend API calls (fetch wrapper)
│   │   ├── wagmi.ts              # wagmi config (Sepolia, injected connector)
│   │   ├── constants.ts          # Contract addresses, OUTCOME enum, EXPECTED_CHAIN_ID
│   │   ├── utils.ts              # cn, formatEth, truncateAddress, formatRelativeTime
│   │   └── abis/                 # PredictionMarket ABI
│   ├── types/api.ts              # TypeScript types for API responses
│   ├── next.config.js            # Rewrites: /api/* → backend :4000; Turbopack aliases
│   ├── empty-module.js           # Stub for Turbopack (node-only modules in browser)
│   ├── tailwind.config.ts        # Custom design tokens (dark/light theme)
│   ├── tsconfig.json             # TypeScript config (@/* alias)
│   └── package.json              # Frontend dependencies
├── cre/
│   ├── praesagium-resolver/      # Standard market CRE workflow (TypeScript)
│   │   ├── main.ts               # CRON → HTTP → outcome → oracleCallback
│   │   ├── config.staging.json
│   │   └── config.production.json
│   └── praesagium-resolver-confidential/  # Private market CRE workflow (TEE)
├── scripts/
│   ├── deploy/                   # deployLocal.js, deployPrivateMarket.js, deployWithFunctions.js
│   ├── demo/demoE2E.js           # Full E2E demo script
│   ├── verify/verify.js          # Etherscan/Polygonscan verification
│   ├── simulateCRE.js            # Local CRE simulation
│   └── resolveFromBackend.js     # Resolve market via backend API
├── notebook/                     # Python simulation notebooks
├── docs/
│   ├── phpe-and-hybrid-prediction.md
│   ├── smart-contracts-and-database.md
│   └── frontend-project.md       # Frontend spec (Next.js 14, wagmi v2, Tailwind)
├── hardhat.config.js
├── package.json                  # Hardhat + contracts tooling
└── .env                          # gitignored — copy from config/env.example
```

---

## Testing

```bash
# Contract tests (Hardhat) — 5 tests
npm test

# Backend tests (Rust) — 2 tests
npm run test:backend

# All tests
npm run test:all

# Dependency audit
npm run audit
```

**What the tests cover:**

| Suite | Tests |
|-------|-------|
| Contract (Hardhat) | Market creation, bet placement, resolution, payout claiming, access control |
| Backend (Rust) | API endpoint responses, PHPE engine output validation |

---

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| *"next" not recognized* or CMD.EXE / UNC paths | Commands run in CMD/PowerShell with Windows Node | Use a **WSL (Ubuntu)** terminal and install Node inside WSL (e.g. with `nvm`). Check with `which node` / `which npm` that they point to WSL paths. |
| `EADDRINUSE 127.0.0.1:8545` | Hardhat node already running | Do not start another; use the existing terminal |
| `Address already in use (os error 98)` | Backend already running on port 4000 | Run `kill $(lsof -ti:4000)` then restart |
| `Set in .env: PREDICTION_MARKET_ADDRESS` | Missing post-deploy addresses | Copy printed addresses from `npm run deploy` to `.env` |
| `CRE callback failed` | `block.timestamp < resolveTime` | The demo script advances time with `evm_increaseTime`; ensure you have the latest version |
| `Backend not responding` | Backend not started | Run `npm run backend` in a separate terminal |
| `database is locked` | Corrupted SQLite DB (interrupted process) | Delete `backend-rust/praesagium.db*` and restart the backend |
| `no such table: markets` | Migrations not applied | Restart the backend; SQLx auto-migrates on startup |
| `Too Many Requests` | Rate limit exceeded | Increase `RATE_LIMIT_BURST` in `.env`; default is 200 |
| `cargo build` fails | Rust not installed or outdated | Run `rustup update stable` |
| `cre workflow simulate` fails | CRE CLI not installed or backend down | Install CRE CLI; ensure `npm run backend` is running |
| `Only resolver` revert | Wrong resolver address | Ensure `ORACLE_CONSUMER_ADDRESS` is set as resolver in `PredictionMarket` |
| Wrong network in MetaMask | Wallet on Mainnet or wrong chain | The app auto-detects and prompts to switch to Sepolia (chain ID 11155111) |
| **ChunkLoadError** / "Loading chunk ... failed" | Stale build cache or load timeout | Delete `frontend/.next`, then restart `npm run dev` from `frontend/` |
| **Markets not loading** / "Backend unreachable" | Backend not running or proxy not used | Start `npm run backend` from repo root. For local dev, leave `NEXT_PUBLIC_API_BASE_URL` unset to use the Next.js proxy. |
| `Cannot find module 'dotenv'` | Root dependencies not installed | Run `npm install` at the **repo root**. `run-backend.js` does not use dotenv; other scripts (demo, verify, hardhat) do and rely on root `node_modules`. |

Enable verbose backend logging:

```bash
RUST_LOG=praesagium_backend=debug,tower_http=debug npm run backend
```

---

## Frontend

The frontend is a **Next.js 14** application located in the [`frontend/`](frontend/) directory. It connects to the Rust backend at `localhost:4000` via a built-in proxy (configured in `next.config.js`) and interacts with the `PredictionMarket` contract on Sepolia via wagmi v2.

**To run:**

```bash
cd frontend
npm install        # first time only
npm run dev        # http://localhost:3000
```

**Features:**

- Wallet connection (MetaMask / injected, Sepolia testnet)
- Market dashboard with live stats, filters, and pagination
- Market detail with bet form, PHPE uncertainty visualization, and AI sentiment preview
- Create market wizard (3-step: question → timeline → on-chain deploy)
- My positions and payout claiming
- Creator reputation profiles with on-chain score visualization

**Stack:** Next.js 14 (App Router) · TypeScript · wagmi v2 · viem · Tailwind CSS · shadcn/ui · React Query · lightweight-charts (TradingView)

The full frontend specification — including all API endpoints, contract ABIs, TypeScript types, component structure, and UX requirements — is documented in [`docs/frontend-project.md`](docs/frontend-project.md).

---

## Recent Improvements

The following improvements were implemented after the initial release:

### UI/UX Overhaul
- **Pure dark/light theme** — dark mode uses `#000000` background; light mode uses `#ffffff`. Toggled via `next-themes`.
- **Interactive candlestick chart** — replaced Recharts with [lightweight-charts v5](https://tradingview.github.io/lightweight-charts/) (TradingView). Supports zoom, pan, multi-pane indicators (RSI, MACD, Bollinger Bands), and auto-follow mode that scrolls to the latest prediction as new data arrives.
- **CoinGecko-inspired market detail layout** — full-width chart with a sticky sidebar for the bet form, countdown, and creator info. Stats row (Total Pool, YES/NO odds, close/resolve dates) above the chart.
- **Network enforcement** — `useNetworkGuard` hook reads `chainId` directly from `window.ethereum` and subscribes to MetaMask's `chainChanged` event. Persistent banner on the Create Market page with a "Switch to Sepolia" button.
- **Navigation redesign** — pill-style active indicator, Lucide icons per nav item, drawer slide-in animation on mobile.
- **Empty state redesign** — illustrated onboarding steps with call-to-action buttons.
- **Bet form** — gradient YES/NO buttons, payout estimation, quick-amount pills.

### Codebase Cleanup (~1,622 lines removed)
- Deleted 5 dead frontend components: `ohlcv-chart.tsx`, `create-market-form.tsx`, `stakes-chart.tsx`, `network-switcher.tsx`, `resolution-source-badge.tsx`.
- Deleted unused hook `use-create-market.ts`.
- Removed stale npm dependencies: `@radix-ui/react-toast`, `recharts`.
- Removed redundant TypeScript type shims in `frontend/types/`.
- Removed unused Rust crates: `config`, `url`.
- Removed dead Rust code: `run_prediction_with_context()` in `prediction.rs`, unused `cache` field in `HybridPredictor`.
- Standardized ETH formatting: all display uses `formatEth` from `@/lib/utils`.

### Codebase Cleanup (latest)
- **Removed unused components:** `automation-status-badge.tsx`, `creator-reputation-badge.tsx`.
- **Removed unused exports/functions:** `formatCountdown` and `statusColor` from `lib/utils.ts`; `getSentiment` and `getSources` from `lib/api.ts`; `wagmiConfig` export from `lib/wagmi.ts` (only `config` is exported); unused indicators from `lib/ohlcv-utils.ts` (`computeStochastic`, `computeStochasticRSI`, `computeIchimoku`, `computeATR`, `computeOBV`, `computeBOP`, `formatTimeLabel`); unused `Countdown` component from `countdown.tsx` (kept `useCountdown`, `formatCountdownDisplay`, `CountdownBlocks`); `ResolutionSourceType` no longer exported from `resolution-source-picker.tsx`.
- **Config:** Removed `recharts` from `optimizePackageImports` in `next.config.js`; marked `NEXT_PUBLIC_AUTOMATION_RESOLVER_ADDRESS` as optional/reserved in `config/frontend.env.example`.
- **Backend:** Removed unused `trace` feature from `tower-http` in `backend-rust/Cargo.toml`.

### Backend Stability
- Migrated from PostgreSQL to **SQLite** for zero-config local development (`DATABASE_URL=sqlite://praesagium.db`).
- Increased default rate limits: `RATE_LIMIT_PER_SECOND=300`, `RATE_LIMIT_BURST=200`.

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/phpe-and-hybrid-prediction.md](docs/phpe-and-hybrid-prediction.md) | PHPE pipeline, hybrid fusion algorithm, AI providers, prediction API reference |
| [docs/smart-contracts-and-database.md](docs/smart-contracts-and-database.md) | All contracts (base, conditional, tokenized, reputation, CRE flow), DB schema, on-chain sync |
| [docs/frontend-project.md](docs/frontend-project.md) | Frontend specification: stack, pages, API usage, contract calls, types |
| [cre/README.md](cre/README.md) | CRE workflow setup, simulation, and CLI reference |

---

## Security

**Implemented:**

- `OracleConsumer.oracleCallback` restricted to `authorizedCallback` (set to Chainlink Functions Router or CRE executor in production)
- `CREWorkflow.resolveFromOracle` restricted to `onlyOracle`
- `PredictionMarket.claimPayout` uses Checks-Effects-Interactions pattern + `ReentrancyGuard`
- Backend: parameterized queries (SQLx), input validation on all endpoints, secrets in env only
- Rate limiting via `tower_governor` on all API routes
- CI: `npm audit` + `cargo audit` on every push to `main`

**Recommendations before mainnet:**

- Run [Slither](https://github.com/crytic/slither): `slither . --exclude-dependencies`
- Set `authorizedCallback` to the Chainlink Functions Router address, not an EOA
- Consider a professional audit for the contract suite
- Report vulnerabilities via GitHub Security Advisories (do not open public issues)

---

## Hackathon Submission

This project follows the [Chainlink Prediction Markets Hackathon](https://chain.link/community/hackathon) guidelines.

**Submission checklist:**

| Item | Status |
|------|--------|
| Public repository | ✅ |
| README with architecture and setup | ✅ |
| Chainlink CRE integration | ✅ |
| Smart contracts (Solidity) | ✅ |
| Backend + PHPE engine | ✅ |
| Deployed contracts (Sepolia) | ✅ |
| Etherscan verification | ✅ |
| E2E demo (`npm run demo`) | ✅ |
| Frontend (Next.js 14 + wagmi v2) | ✅ |
| Demo video (2–5 min) | ⬜ |
| Live frontend link | ⬜ Coming soon |

**Key differentiators for judges:**
- PHPE calibrated uncertainty (unique in the prediction market space)
- Multi-source CRE resolution (AI + price + weather + sports)
- Private markets with Confidential Compute
- Production-grade Rust backend with on-chain indexer

---

## Contributing

1. Fork the repository and create a branch: `git checkout -b feature/your-feature`
2. Install dependencies: `npm install && cd frontend && npm install && cd ../backend-rust && cargo build`
3. Copy `config/env.example` to `.env` and `frontend/.env.example` to `frontend/.env.local`; configure both
4. Make your changes; ensure tests pass: `npm run test:all`
5. Follow code style: Solidity (OpenZeppelin conventions), Rust (`cargo fmt && cargo clippy`), TypeScript (`npm run lint` in `frontend/`)
6. Open a pull request against `main` with a clear description
7. Do not commit `.env`, `frontend/.env.local`, or any secrets

---

## License & Authors

**License:** [MIT](LICENSE)

**Authors:**
- **Querube Yuneth Ariza Ríos**
- **Jhuomar Boskoll Quintero**

---

<p align="center">
  Built for the Chainlink ecosystem · Powered by <a href="https://chain.link/chainlink-runtime-environment">Chainlink CRE</a>
</p>
