## Contracts — PraesagiumChain

This document summarizes the main smart contracts and how they interact. For full details, see the Solidity sources in [`contracts/`](../contracts/).

---

### 1. Contract overview

- **`PredictionMarket.sol`**  
  Core binary prediction market:
  - `createMarket(question, closeTime, resolveTime)` — creates a Yes/No market, emits `MarketCreated`.
  - `placeBet(marketId, outcome)` — places an ETH bet on Yes (`1`) or No (`2`), emits `BetPlaced`.
  - `resolveMarket(marketId, outcome)` — resolver-only; sets outcome and emits `MarketResolved`.
  - `claimPayout(marketId)` — lets winning participants withdraw their share of the pool, emits `PayoutClaimed`.

- **`CREWorkflow.sol`**  
  Bridge between off-chain CRE results and PredictionMarket:
  - `resolveFromOracle(marketId, outcome)` — callable only by the oracle consumer; forwards resolution to `PredictionMarket`.

- **`OracleConsumer.sol`**  
  Entry point for Chainlink CRE / Functions callbacks:
  - `oracleCallback(marketId, outcome)` — called by the Chainlink executor; forwards to `CREWorkflow`.
  - Access is restricted via an `authorizedCallback` address (router / executor).

- **`PrivatePredictionMarket.sol`**  
  Commit–reveal private markets:
  - `commitBet(marketId, commitment)` — stores a hash of `(outcome, amount, nonce)`.
  - `revealBet(marketId, outcome, amount, nonce)` — verifies the commitment and registers the stake.
  - `resolveMarket` / `claimPayout` work analogously to `PredictionMarket`, but over the committed pool.

- **`ConditionalMarket.sol`**  
  Markets that depend on outcomes of other markets (AND logic).

- **`TokenizedMarket.sol`**  
  ERC‑721 token that mints one NFT per market; used to represent and transfer market ownership.

- **`ReputationSystem.sol`**  
  Tracks creator reputation:
  - Records how many markets a creator has created / resolved.
  - Computes a score that can be queried on-chain or mirrored off-chain.

---

### 2. Market lifecycle (base markets)

```mermaid
flowchart LR
    create[createMarket] --> open[Open]
    open -->|placeBet| betting[Betting phase]
    betting -->|closeTime reached| locked[Locked]
    locked -->|CRE / oracle resolves| resolved[Resolved]
    resolved -->|claimPayout| paid[Paid out]
```

Resolution is driven by Chainlink CRE:

1. At `resolveTime`, the CRE workflow calls the backend (`/api/ai/sentiment`, `/api/price/above`, etc.).
2. The workflow computes an outcome (`0` = No, `1` = Yes).
3. CRE calls `OracleConsumer.oracleCallback(marketId, outcome)`.
4. `OracleConsumer` forwards to `CREWorkflow.resolveFromOracle`.
5. `CREWorkflow` calls `PredictionMarket.resolveMarket`.

---

### 3. Time and MEV

- **Closing and resolution** use `block.timestamp` (and related patterns). Validators can move timestamps slightly within protocol rules; for very short windows this can affect ordering or frontrunning. This is a common trade-off in on-chain markets; design markets with **reasonable `closeTime` / `resolveTime` spacing** and document expectations for users.
- **External resolution** (CRE / oracle) ultimately writes outcomes via the contracts; treat oracle trust and liveness as part of the security model.

---

### 4. ETH transfers and low-level calls

- Prefer **Checks-Effects-Interactions** and `ReentrancyGuard` on functions that send ETH or call external contracts.
- When using `call`/`send`, check success or use OpenZeppelin `Address.sendValue` patterns; ignoring failure can leave accounting inconsistent. Run Slither locally when changing payout paths ([operations.md](operations.md)).

### 5. NatSpec guidelines

Public and external functions in the contracts use (or should use) Solidity NatSpec to document:

- `@notice` — high-level description of what the function does.
- `@dev` — additional technical notes (invariants, gas considerations, edge cases).
- `@param` — description of each parameter (units, allowed ranges).
- `@return` — description of each return value when non-obvious.

When adding or modifying functions, keep NatSpec up to date so the contract interface is self‑documenting both on-chain (via explorers) and in IDEs.

