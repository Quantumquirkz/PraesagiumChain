# Architecture — Contracts, Database, PHPE, and Frontend

Overview of architecture and **repository layout**. Implementation details live in the linked sources.

## Repository layout

| Directory | Role |
|-----------|------|
| [`contracts/`](../contracts/) | Solidity (Hardhat): `npm run compile`, `npm test` |
| [`test/`](../test/) | Hardhat contract tests (`paths.tests` in `hardhat.config.js`) |
| [`backend/`](../backend/) | Axum API, PHPE: `npm run backend`, `cargo test` |
| [`frontend/`](../frontend/) | Next.js: `cd frontend && npm run dev` |
| [`cre/`](../cre/) | CRE workflows (TypeScript) |
| [`scripts/`](../scripts/) | Deploy, demo — [scripts/README.md](../scripts/README.md) |
| [`docs/`](../docs/) | [Index](README.md), guides, ADR, [`startup/`](startup/) (strategy), [`research/notebook/`](research/notebook/) (optional) |
| [`deploy/k8s/`](../deploy/k8s/) | Optional Kubernetes (not needed locally) |
| Root | [`env.example`](../env.example) → copy to `.env`; `package.json`, Hardhat, `docker-compose.yml` |

One `.env` at repo root for backend, scripts, and frontend (Next loads via `loadEnvConfig`). Copy from [`env.example`](../env.example) at the repo root.

---

## Table of Contents

1. [Smart Contracts](#1-smart-contracts)
2. [Database Schema](#2-database-schema)
3. [On-Chain / Off-Chain Sync](#3-on-chain--off-chain-sync)
4. [PHPE and Hybrid Prediction](#4-phpe-and-hybrid-prediction)
5. [Frontend](#5-frontend)

---

## 1. Smart Contracts

**Location:** [`contracts/`](../contracts/)

### Contract Map

```mermaid
flowchart TB
    subgraph resolution [Oracle Resolution Layer]
        OC[OracleConsumer.sol]
        CRE[CREWorkflow.sol]
        OC -->|resolveFromOracle| CRE
    end

    subgraph core [Core Markets]
        PM[PredictionMarket.sol]
        Rep[ReputationSystem.sol]
        CRE -->|resolveMarket| PM
        PM -->|hooks| Rep
    end

    subgraph advanced [Advanced Market Types]
        PPM[PrivatePredictionMarket.sol]
        CM[ConditionalMarket.sol]
        TM[TokenizedMarket.sol]
    end
```

### Core: PredictionMarket.sol

- **createMarket(question, closeTime, resolveTime)** — Creates binary market; emits `MarketCreated`
- **placeBet(marketId, outcome)** — Places ETH bet on Yes(1) or No(2)
- **resolveMarket(marketId, outcome)** — Resolver only; requires `block.timestamp >= resolveTime`
- **claimPayout(marketId)** — Winners claim proportional share of pool
- **getMarket(marketId)** / **getUserStake(marketId, user)** — View functions

Market lifecycle: **Open** → **Locked** (closeTime) → **Resolved** (resolver) → **claimPayout**

### Oracle: OracleConsumer + CREWorkflow

- **OracleConsumer** receives `oracleCallback(marketId, rawOutcome)` from Chainlink CRE
- **CREWorkflow** implements `resolveFromOracle` → calls `PredictionMarket.resolveMarket`
- Only `authorizedCallback` can call `oracleCallback`; set to CRE executor or Functions Router

### Other Contracts

- **PrivatePredictionMarket** — Commit-reveal bets (TEE/Confidential Compute)
- **ConditionalMarket** — AND logic over other markets
- **TokenizedMarket** — ERC-721; mint NFT per market
- **ReputationSystem** — Tracks creator stats (created, resolved, score)

---

## 2. Database Schema

**Location:** [`backend/migrations_pg/`](../backend/migrations_pg/)

Migrations: `001_initial.sql`, `007_resolution_config.sql`, `008_private_market_access_keys.sql`

### Tables

| Table | Purpose |
|-------|---------|
| `markets` | Market metadata; `on_chain_market_id` syncs with contract |
| `predictions` | PHPE probability history per market |
| `conditional_conditions` | Conditions for conditional markets |
| `creator_reputation` | Off-chain mirror of ReputationSystem |
| `market_resolutions` | Resolution config (feed, threshold) |
| `private_market_access_keys` | Access keys for private markets |

The **EventIndexer** keeps the database in sync with on-chain events (`MarketCreated`, `MarketResolved`, etc.).

---

## 3. On-Chain / Off-Chain Sync

**EventIndexer:** [`backend/src/services/indexer.rs`](../backend/src/services/indexer.rs)

- Polls RPC for `MarketCreated`, `MarketResolved`, `BetPlaced`
- Inserts/updates `markets`, `creator_reputation`
- Requires `RPC_URL` and `PREDICTION_MARKET_ADDRESS` in `.env`

**Source of truth:** The blockchain. The database is a read-optimized cache.

---

## 4. PHPE and Hybrid Prediction

**PHPE (Praesagium Hybrid Predictive Engine):** [`backend/phpe/`](../backend/phpe/)

Pipeline: **Normalize** → **Causal infer** → **Temporal encode** → **Bayesian predict** → **Calibrate**

Output: `probability` ∈ [0, 1], `uncertainty` ∈ [0, 1] (epistemic band)

**Hybrid predictor:** [`backend/src/services/hybrid.rs`](../backend/src/services/hybrid.rs)

Fuses three signals:
- PHPE time-series (35%)
- AI sentiment — Gemini / Hugging Face (40%)
- Live price — Binance / Chainlink (25%)

Formula: weighted average with graceful degradation if a source fails.

**API:** `POST /api/predict` (PHPE only), `POST /api/predict/hybrid` (fused)

---

## 5. Frontend

**Location:** [`frontend/`](../frontend/)

Domain-oriented UI for markets lives under [`frontend/features/markets/`](../frontend/features/markets/) (components, hooks, and market skeletons); shared UI primitives remain under `frontend/components/` (e.g. `ui/`, layout chrome).

### Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Web3 | wagmi v2 + viem |
| Styling | Tailwind CSS |
| Components | Radix UI + shadcn/ui |
| State | TanStack React Query |
| Charts | lightweight-charts v5 (TradingView) |

### Key Pages

| Route | Purpose |
|-------|---------|
| `/` | Dashboard; market list, stats, filters |
| `/markets/[id]` | Market detail; bet form, predictions, chart |
| `/markets/create` | Create market (public/private) |
| `/markets/private` | Commit-reveal private markets |
| `/positions` | User positions; claim payouts |
| `/signals` | PHPE / data sources dashboard |
| `/about` | How it works |

### Environment

Single `.env` at repo root. Next.js loads via `loadEnvConfig` in `next.config.js`. Required: `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS`.

### Contract Integration

- ABIs in `frontend/lib/abis/`
- Wagmi hooks for read/write
- React Query for API cache

---

## Source Files Reference

- Contracts: [`contracts/`](../contracts/)
- Backend: [`backend/src/`](../backend/src/)
- PHPE: [`backend/phpe/`](../backend/phpe/)
- Frontend: [`frontend/`](../frontend/)
