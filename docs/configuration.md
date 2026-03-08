# Configuration — Environment Variables and API Keys

This document describes all environment variables and API keys used by PraesagiumChain. The project uses a **single `.env` file** at the repository root for backend, frontend, and scripts.

For the full template, see [config/env.example](../config/env.example).

---

## Table of Contents

1. [Root `.env` (Backend)](#1-root-env-backend)
2. [Frontend Variables (`NEXT_PUBLIC_*`)](#2-frontend-variables-next_public)
3. [CRE (`cre/.env`)](#3-cre-creenv)
4. [API Keys and External Services](#4-api-keys-and-external-services)
5. [Quick Reference](#5-quick-reference)

---

## 1. Root `.env` (Backend)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL URL. Example: `postgresql://praesagium:praesagium@localhost:5432/praesagium` |
| `RPC_URL` / `SEPOLIA_RPC_URL` | Yes (indexer) | Sepolia or local RPC. Prefer `https://ethereum-sepolia-rpc.publicnode.com` to avoid Cloudflare 522. |
| `PREDICTION_MARKET_ADDRESS` | Yes (indexer) | Deployed PredictionMarket address. Same as `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS`. |
| `PORT` | No | Backend HTTP port (default `4000`). |
| `REDIS_URL` | No | When backend runs on host and Docker maps Redis to 6380: `redis://localhost:6380`. |
| `CLICKHOUSE_URL` | No | Optional analytics (e.g. `http://localhost:8123`). |
| `AI_PROVIDER` | No | `gemini`, `huggingface`, or `mock` (default). |
| `GEMINI_API_KEY` | No* | Required if `AI_PROVIDER=gemini`. Get from [Google AI Studio](https://aistudio.google.com/api-keys). |
| `HF_API_KEY` | No | Alternative to Gemini for sentiment. Get from [Hugging Face](https://huggingface.co/settings/tokens). |
| `PRIVATE_KEY` | Yes (deploy) | Wallet private key (no `0x` prefix) for deploying contracts. **Never commit.** |
| `API_BASE_URL` | No | Backend URL for scripts (default `http://localhost:4000`). |
| `ETHERSCAN_API_KEY` | No | For contract verification. Get from [Etherscan](https://etherscan.io/myapikey). |
| `FUNCTIONS_ROUTER` | No | Chainlink Functions Router. Only if using `deployWithFunctions.js`. |

**Docker:** [docker-compose.yml](../docker-compose.yml) maps Redis to **6380** on the host. Use `REDIS_URL=redis://localhost:6380`.

---

## 2. Frontend Variables (`NEXT_PUBLIC_*`)

All frontend variables live in the same root `.env`. Next.js loads them via `loadEnvConfig` in [frontend/next.config.js](../frontend/next.config.js).

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CHAIN_ID` | Yes | Chain ID for wallet: `31337` (local) or `11155111` (Sepolia). |
| `NEXT_PUBLIC_RPC_URL` | Yes | RPC URL for wallet (e.g. `http://127.0.0.1:8545` or Sepolia RPC). |
| `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS` | Yes | Same as `PREDICTION_MARKET_ADDRESS` (frontend). |
| `NEXT_PUBLIC_BLOCK_EXPLORER_URL` | No | Default `https://sepolia.etherscan.io`. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | No | For WalletConnect mobile support. Get from [cloud.walletconnect.com](https://cloud.walletconnect.com). |
| `NEXT_PUBLIC_PRIVATE_MARKET_ADDRESS` | No | For commit-reveal private markets. |
| `NEXT_PUBLIC_API_BASE_URL` | No | Leave unset in local dev so Next.js proxy forwards `/api/*` to backend. |

---

## 3. CRE (`cre/.env`)

For Chainlink CRE workflow simulation:

| Variable | Description |
|----------|-------------|
| `CRE_ETH_PRIVATE_KEY` | Dedicated wallet key for CRE (64 hex chars). Only needed for local CRE flows. |

---

## 4. API Keys and External Services

| Key | Purpose | Where to Get | Required? |
|-----|---------|--------------|-----------|
| `GEMINI_API_KEY` | AI sentiment (PHPE / predictions) | [Google AI Studio](https://aistudio.google.com/api-keys) | No; use `AI_PROVIDER=mock` to skip |
| `HF_API_KEY` | Hugging Face sentiment (alternative) | [Hugging Face](https://huggingface.co/settings/tokens) | No |
| `API_FOOTBALL_KEY` | Sports market resolution | [API-Football](https://www.api-football.com/) | No; only for sports markets |
| `FINNHUB_API_KEY` | Finnhub source (Signals page) | [Finnhub](https://finnhub.io/register) | No |
| `ETHERSCAN_API_KEY` | Contract verification | [Etherscan](https://etherscan.io/myapikey) | No |

**RPC (no API key needed):** You can use `NEXT_PUBLIC_RPC_URL=https://rpc.sepolia.org`. For fewer failures or rate limits, use [Alchemy](https://dashboard.alchemy.com/) or [Infura](https://infura.io/).

---

## 5. Quick Reference

### Local development (Hardhat)

```env
DATABASE_URL=postgresql://praesagium:praesagium@localhost:5432/praesagium
RPC_URL=http://127.0.0.1:8545
AI_PROVIDER=mock
PRIVATE_KEY=<your_key>
API_BASE_URL=http://localhost:4000

NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=<from_deploy>
```

### Sepolia (create market + bet)

```env
DATABASE_URL=postgresql://...
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
PREDICTION_MARKET_ADDRESS=<deployed>
PRIVATE_KEY=<your_key>
API_BASE_URL=http://localhost:4000

NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=<same_as_above>
NEXT_PUBLIC_BLOCK_EXPLORER_URL=https://sepolia.etherscan.io
```

### Checklist (Sepolia)

1. `docker compose up -d` (Postgres 5432, Redis 6380 on host).
2. Set `DATABASE_URL`, `RPC_URL`, `PREDICTION_MARKET_ADDRESS`, `NEXT_PUBLIC_*` in `.env`.
3. Set `REDIS_URL=redis://localhost:6380` if using Redis.
4. Run `npm run backend` and `cd frontend && npm run dev`.
5. Wallet on Sepolia with testnet ETH; connect and create/bet.

---

## Useful Links

- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Sepolia Etherscan](https://sepolia.etherscan.io)
- [Google AI Studio (Gemini)](https://aistudio.google.com/api-keys)
- [Alchemy](https://dashboard.alchemy.com/)
- [Infura](https://infura.io/)
- [Etherscan API](https://etherscan.io/myapikey)
