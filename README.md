# PraesagiumChain

Decentralized prediction markets powered by **Chainlink CRE**, AI (Gemini), multi-source data (Binance, Chainlink, X, Reddit), and Solidity smart contracts.

---

## Overview

PraesagiumChain implements trustless market resolution via Chainlink: off-chain data and AI sentiment drive on-chain outcomes through the CRE (Request & Execution) workflow. The backend fuses time-series predictions (PHPE), sentiment analysis, and price feeds into a single hybrid API.

```mermaid
flowchart TB
    subgraph Client["Clients"]
        UI[Frontend / User]
    end

    subgraph Backend["Backend (Rust / Axum)"]
        API[REST API]
        PHPE[PHPE Engine]
        AI[AI Service]
        REP[Reputation]
        IDX[Event Indexer]
        API --> PHPE
        API --> AI
        API --> REP
        API --> IDX
    end

    subgraph Chain["Blockchain"]
        PM[PredictionMarket]
        CRE[CREWorkflow]
        OC[OracleConsumer]
        PM --> CRE
        OC --> CRE
        CRE --> PM
    end

    subgraph External["External"]
        CL[Chainlink Functions / Automation]
        HF[Gemini / Hugging Face]
    end

    UI <-->|HTTP| API
    UI <-->|Wallet / RPC| Chain
    CL --> OC
    API --> HF
    IDX -.->|RPC| PM
```

---

## Chainlink Integration

This project follows [Chainlink Prediction Markets](https://chain.link/community/hackathon) guidelines:

- **AI-powered settlement** — Gemini / Hugging Face for sentiment; outcome (0/1) fed to CRE.
- **Event-driven resolution** — OracleConsumer → CREWorkflow → `resolveMarket`.
- **CRE Workflow** as the on-chain orchestration layer.
- **Blockchain + external API + LLM** — Backend calls Binance, Chainlink proxy, and AI services.

| Component | Purpose |
|-----------|---------|
| `contracts/CREWorkflow.sol` | CRE orchestration; receives oracle outcome, resolves market |
| `contracts/OracleConsumer.sol` | Chainlink callback → CREWorkflow |
| `contracts/PredictionMarket.sol` | Binary markets (Yes/No), bets, payouts |
| `scripts/deploy/deployLocal.js` | Deploy PM, CRE, OracleConsumer |
| `scripts/simulateCRE.js` | CRE flow simulation |
| `backend-rust/src/services/sources/chainlink.rs` | Chainlink price source (e.g. ETH/USD) |

---

## Data Sources

| Source | Role |
|--------|------|
| **Binance** | 24h price (BTCUSDT, ETHUSDT, etc.) |
| **Chainlink** | ETH/USD proxy (production Data Feed) |
| **X / Reddit** | Text → AI sentiment (Gemini) |
| **PHPE** | Time-series prediction engine |

---

## Quick Start

**Contracts**

```bash
npm install && npx hardhat compile
npx hardhat run scripts/deploy/deployLocal.js --network localhost
node scripts/simulateCRE.js
```

**Backend**

```bash
cp config/env.example .env   # fill values
cd backend-rust && cargo run
```

**Frontend & Supabase** — See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for env vars, Supabase schema, and API base URL.

---

## API (Backend)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/ai/sentiment` | Sentiment (Gemini) |
| POST | `/api/predict` | PHPE prediction from time series |
| POST | `/api/predict/hybrid` | Hybrid: series + sentiment + Binance/Chainlink |

**Example — hybrid (sentiment + Binance)**

```bash
curl -X POST http://localhost:4000/api/predict/hybrid \
  -H "Content-Type: application/json" \
  -d '{"sentiment_text":"Bitcoin going up","binance_symbol":"BTCUSDT"}'
```

**Example — hybrid (social + Chainlink price)**

```bash
curl -X POST http://localhost:4000/api/predict/hybrid \
  -H "Content-Type: application/json" \
  -d '{"social_texts":["Bitcoin bullish from X"],"use_chainlink_price":true,"market_id":1}'
```

---

## Documentation

| Document | Contents |
|----------|----------|
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | System architecture, smart contracts, CRE workflow, PHPE engine, data flows, security. |
| **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** | API reference, configuration, setup (backend, frontend, Supabase), contributing, feature guides. |

---

## Authors

- **Jhuomar Boskoll Quintero**
- **Querube Yuneth Ariza Ríos**
