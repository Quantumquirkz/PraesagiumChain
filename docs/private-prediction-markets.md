# Private Prediction Markets — Chainlink Confidential Compute

This document describes PraesagiumChain's **Private Prediction Markets** feature, designed to align with the Chainlink Prediction Markets use case: *"Private Prediction Markets using Chainlink Confidential Compute private transactions"*.

---

## 1. Overview

Private Prediction Markets enable:

1. **Privacy of positions** — Users commit hashed bet info; stakes are revealed only at settlement.
2. **Confidential resolution** — The CRE workflow processes resolution data (e.g. AI sentiment) in a privacy-preserving manner, compatible with Chainlink Confidential Compute (TEE-based execution).
3. **On-chain settlement** — Outcomes remain verifiable while sensitive inputs stay off public view.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  User (commit phase)                                                 │
│  commitBet(marketId, hash(outcome, amount, nonce))  →  no public     │
│  knowledge of position                                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  CRE Workflow (Confidential Compute / TEE)                           │
│  - Receives encrypted/private resolution input                       │
│  - Calls /api/ai/sentiment or /api/predict/hybrid                    │
│  - Computes outcome 0/1 in isolated environment                      │
│  - Submits signed report to OracleConsumer                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PrivatePredictionMarket.sol                                         │
│  - resolveMarket(marketId, outcome)  ← from OracleConsumer           │
│  - revealBet(...)  ← user reveals commitment, claims if winner       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Components

### 3.1 Smart Contract: `PrivatePredictionMarket.sol`

- **Commit-reveal bets**: `commitBet(marketId, commitment)` stores `keccak256(outcome, amount, nonce)`.
- **Reveal & claim**: `revealAndClaim(marketId, outcome, amount, nonce)` verifies commitment, checks winner, pays out.
- **Resolution**: Same pattern as `PredictionMarket` — only resolver (CRE/OracleConsumer) can call `resolveMarket`.
- **Privacy**: Until reveal, on-chain data exposes only the commitment hash.

### 3.2 CRE Workflow: `cre/praesagium-resolver-confidential/`

- Same logic as `praesagium-resolver` but structured for **Confidential Compute**:
  - Inputs (e.g. `text_to_analyze`) can be encrypted; in a TEE, decryption happens in isolation.
  - Output (outcome 0/1) is the only public result.
- **Simulation**: Works with plain HTTP today; production would use CRE's TEE execution when available.
- **Reference**: [Chainlink Privacy Standard](https://docs.chain.link/oracle-platform/privacy-standard) — *"privacy of transaction computations ... confidential computing via CRE"*.

### 3.3 Backend API

- **Create private market**: `POST /api/markets` with `market_type: "private"`, `details_hash`, `encrypted_uri`.
- **Resolution**: Unchanged; CRE calls `/api/ai/sentiment` or `/api/predict/hybrid`; backend does not need to know if the market is private.
- **Indexer**: Can index `PrivatePredictionMarket` events (without bet details until reveal).

---

## 4. Integration with Chainlink Confidential Compute

Chainlink Confidential Compute uses **TEEs (Trusted Execution Environments)** and **threshold cryptography** to:

- Run CRE workflows in isolated, attested environments.
- Keep resolution inputs (e.g. API keys, raw text) private.
- Emit only the outcome on-chain.

**PraesagiumChain's path**:

1. **Today**: CRE workflow runs as standard HTTP client; resolution is simulated. Commit-reveal provides position privacy.
2. **When CRE Confidential Compute is available**: Migrate `praesagium-resolver-confidential` to run inside a TEE; resolution inputs remain confidential.
3. **CCIP Private Transactions** (optional): For cross-chain private settlement; separate from core prediction flow.

---

## 5. Files

| File | Purpose |
|------|---------|
| `contracts/PrivatePredictionMarket.sol` | Commit-reveal private prediction market contract |
| `cre/praesagium-resolver-confidential/main.ts` | CRE workflow for confidential resolution |
| `scripts/deploy/deployPrivateMarket.js` | Deploy PrivatePredictionMarket |
| `backend-rust` | API supports `market_type: "private"` via existing `CreateMarketRequest` |

---

## 6. References

- [Chainlink Privacy Standard](https://docs.chain.link/oracle-platform/privacy-standard)
- [Chainlink Confidential Compute (Blog)](https://blog.chain.link/chainlink-confidential-compute/)
- [CCIP Private Transactions](https://blog.chain.link/ccip-private-transactions-blockchain-privacy-manager/)
- [CRE Simulating Workflows](https://docs.chain.link/cre/guides/operations/simulating-workflows)
