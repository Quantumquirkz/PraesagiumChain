# PraesagiumChain — Architecture

This document describes the system architecture, smart contracts, Chainlink CRE workflow, PHPE prediction engine, repository layout, data flows, and security posture.

---

## 1. System Overview

PraesagiumChain is a decentralized prediction market system that combines:

- **Smart contracts (Solidity)** — On-chain market lifecycle, bets, and payouts.
- **Chainlink CRE** — Trustless resolution from off-chain data and AI.
- **PHPE (Praesagium Hybrid Predictive Engine)** — Calibrated probabilities and uncertainty in Rust.
- **Backend (Rust, Axum)** — REST API, engine integration, AI, Binance/Chainlink data sources.

```mermaid
flowchart LR
    A[User / Frontend] --> B[Backend API]
    A --> C[Smart Contracts]
    B --> D[PHPE / AI / DB]
    B --> E[Chain Indexer]
    C --> F[Chainlink Oracle]
    F --> C
```

---

## 2. Repository Structure

```text
praesagiumchain/
├── config/                 # Env templates, frontend setup notes
├── contracts/              # Solidity smart contracts
├── backend-rust/           # REST API, PHPE, AI
│   ├── phpe/               # Prediction engine
│   ├── scripts/ai/        # Chainlink Functions scripts
│   └── src/services/
│       ├── ai/             # Sentiment: Mock, Gemini, HuggingFace
│       ├── sources/        # Binance, Chainlink
│       └── hybrid.rs       # Fusion: engine + sentiment + price
├── scripts/                # Hardhat deploy & simulation
├── supabase/               # Postgres schema (Supabase)
├── docs/
└── README.md
```

**Conventions:** Documentation and comments in **English**; directories lowercase with hyphens; one main contract per file; interfaces under `contracts/interfaces/`. Configuration lives in `config/`; `.env` at repo root is gitignored.

---

## 3. Smart Contracts

### 3.1 Resolution Flow

Resolution is oracle-driven: Chainlink delivers an outcome (e.g. Yes=1 / No=0) to the consumer, which forwards it to CRE, which calls the market contract.

```mermaid
sequenceDiagram
    participant U as User
    participant PM as PredictionMarket
    participant CRE as CREWorkflow
    participant OC as OracleConsumer
    participant CL as Chainlink

    U->>PM: createMarket / placeBet
    Note over PM: closeTime → lock
    CL->>OC: fulfillRequest(result)
    OC->>CRE: resolveFromOracle(marketId, outcome)
    CRE->>PM: resolveMarket(marketId, outcome)
    U->>PM: claimPayout
```

### 3.2 Contract Roles

| Contract | Role |
|----------|------|
| **PredictionMarket.sol** | Binary markets: create, placeBet (Yes/No), resolveMarket, claimPayout. Only the configured resolver can resolve. |
| **CREWorkflow.sol** | Bridge: accepts resolution from the oracle and calls `PredictionMarket.resolveMarket()`. |
| **OracleConsumer.sol** | Receives Chainlink Functions/Any API callback; decodes outcome and forwards to CREWorkflow. |
| **ConditionalMarket.sol** | If-then markets: resolution depends on other markets (condition_contract, condition_market_id, expected_outcome). |
| **PrivateMarket.sol** | Access control: only `isParticipant(marketId, account)` can participate; private details via `detailsHash` / `encryptedURI`. |
| **TokenizedMarket.sol** | ERC-721 “Praesagium Market”: one NFT per market (tokenId = marketId); creator owns NFT; tradeable (e.g. OpenSea). |
| **ReputationSystem.sol** | Tracks creator stats and reputation; hooks `onMarketCreated` / `onMarketResolved`; authorized callers only. |

Features (AI, private, reputation, conditional, tokenized) are modular and can be enabled or disabled at the integration layer.

---

## 4. Chainlink CRE Workflow

Resolution uses Chainlink so that **off-chain data** drives on-chain outcome in a decentralized way.

### 4.1 Steps

1. **Market created** — `PredictionMarket.createMarket()` sets `closeTime` and `resolveTime`.
2. **Bets** — Users call `placeBet()`; stakes update `totalYesStake` / `totalNoStake`.
3. **Lock** — Near `closeTime`, market is locked (no more bets).
4. **Resolve** — At `resolveTime`, Chainlink Functions (or Any API) runs off-chain logic and obtains result (e.g. Yes=1 / No=0).
5. **Callback** — Result is sent to `OracleConsumer.fulfillRequest(...)` (or equivalent).
6. **On-chain resolve** — OracleConsumer → CREWorkflow → `PredictionMarket.resolveMarket(marketId, outcome)`.
7. **Payouts** — Users call `claimPayout()` to receive funds.

### 4.2 Chainlink Components

- **Chainlink Functions** — Run off-chain code (e.g. call API, sentiment script); return a value to the consumer.
- **Chainlink Automation** — Trigger at `resolveTime` (e.g. run AI analysis, then submit result).
- **CCIP** (future) — Cross-chain sync for multi-chain markets.

Only the configured **resolver** can resolve; resolution is final once set.

---

## 5. PHPE Prediction Engine

**PHPE (Praesagium Hybrid Predictive Engine)** produces calibrated probabilities and uncertainty for binary events.

### 5.1 Outputs

- `probability` ∈ [0, 1]
- `uncertainty` ∈ [0, 1] (epistemic proxy)
- `model_version`, `model_hash` (auditability)

### 5.2 Pipeline

```mermaid
flowchart LR
    A[Time series] --> B[Normalize]
    B --> C[Causal / latent]
    C --> D[Temporal encode]
    D --> E[Bayesian head]
    E --> F[Calibrate]
    F --> G[Probability + uncertainty]
```

- **Data layer** — Normalization and feature preparation.
- **Causal layer** — Optional DAG for domain structure (MVP).
- **Temporal encoder** — Time-series embedding.
- **Bayesian head** — Ensemble probability and uncertainty.
- **Calibration** — Temperature scaling (and optional isotonic) for reliable probabilities.

PHPE runs **off-chain** and is used in-process by the backend. Predictions can be stored in the `predictions` table and exposed via the API.

---

## 6. Data Flows

### 6.1 Market Lifecycle

```mermaid
flowchart TD
    Create[Create market] --> Open[Open]
    Open --> Bets[Place bets]
    Bets --> Lock[Lock near closeTime]
    Lock --> Resolve[Resolve at resolveTime]
    Resolve --> Payout[Claim payouts]
```

### 6.2 On-Chain vs Off-Chain

| On-chain | Off-chain |
|----------|-----------|
| Market creation, bets, resolution, payouts | PHPE predictions, AI sentiment, reputation aggregation |
| Contract state and events | Backend API, SQLite, event indexer |
| Oracle callback for resolution | Chainlink Functions / Automation, Gemini / Hugging Face |

---

## 7. Security Summary

- **Contracts** — Permissioned resolver; resolution immutable once set.
- **PHPE** — Deterministic, versioned, hash for traceability.
- **Backend** — Rust type safety, input validation, env-based secrets (e.g. `HF_API_KEY`, `GEMINI_API_KEY`).
- **AI** — API keys in env or Chainlink secrets; treat AI output as one input to resolution, not sole authority.

For API details, configuration, and feature guides, see **[docs/DEVELOPMENT.md](DEVELOPMENT.md)**.
