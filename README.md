# PraesagiumChain

Decentralized prediction market system that uses Chainlink CRE workflows to resolve markets with off-chain data. Integrates smart contracts (Solidity), Chainlink oracles, and a prediction model (Rust) for verifiable, trustless settlement.

## Authors

- **Jhuomar Boskoll Quintero**
- **Querube Yuneth Ariza Ríos**

## Repository Structure

```
praesagiumchain/
├── contracts/              # Smart contracts (Solidity)
│   ├── PredictionMarket.sol
│   ├── CREWorkflow.sol
│   ├── OracleConsumer.sol
│   └── interfaces/
├── backend-rust/          # REST API in Rust (Axum)
│   ├── src/
│   ├── migrations/
│   └── Cargo.toml
├── rust-engine/            # PHPE prediction engine
│   ├── src/
│   └── Cargo.toml
├── scripts/                # Deployment and test scripts
│   ├── deploy/
│   ├── test/
│   └── simulateCRE.js
├── docs/                   # Technical documentation
│   ├── architecture.md
│   ├── model_design.md
│   ├── backend_integration.md
│   └── ...
├── hardhat.config.js       # Hardhat configuration
├── package.json            # Project dependencies
└── README.md
```

## Main Components

- **`contracts/`** — Solidity smart contracts for prediction markets and CRE workflow
- **`backend-rust/`** — REST API in Rust (Axum) with direct PHPE engine integration
- **`rust-engine/`** — PHPE prediction engine (Praesagium Hybrid Predictive Engine)
- **`scripts/`** — Deployment and test scripts with Hardhat
- **`docs/`** — Complete technical documentation

## Quick Start

See the [complete documentation](./docs/README.md) for detailed guides.
