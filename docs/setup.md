# PraesagiumChain — Step-by-Step Setup Guide

This document is the **canonical setup guide** for the full stack (prerequisites, env, infrastructure, contracts, backend, frontend). All instructions are in English.

If you use **Windows**, also read **[INSTALL.md](INSTALL.md)** for WSL-only details (Cursor terminal profile, verifying Linux Node, `install-all.sh` quirks).

---

## For another person / new developer

If you are joining the project or need to run it on a new machine:

1. **Prerequisites** — Install **Node.js 20** (matches CI), Rust 1.70+, Docker (for PostgreSQL). On Windows, use **WSL2 (Ubuntu)** for all commands (see [INSTALL.md](INSTALL.md) if anything fails with Windows Node).
2. **Single `.env`** — The whole stack (backend, frontend, scripts) uses one `.env` file at the repo root. Copy from `env.example` at the repo root.
3. **Four terminals** — You need: (1) Hardhat node, (2) backend, (3) one-time deploy, (4) frontend. See [Summary: Minimal Commands](#summary-minimal-commands-to-run-the-project) at the bottom.
4. **Docker permission denied** — On Linux/WSL, if `./scripts/docker-up.sh` fails with permission denied, run `sudo ./scripts/docker-up.sh`.
5. **Frontend chunk errors** — If you see `Cannot find module './xxxx.js'` or chunk load failures, delete the build cache and restart: `cd frontend && rm -rf .next && npm run dev`.

For architecture and folder layout, see [architecture.md](architecture.md). For env vars and deploy, see [configuration.md](configuration.md) and [deploy.md](deploy.md).

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone and Install Dependencies](#2-clone-and-install-dependencies)
3. [Configure Environment](#3-configure-environment)
4. [Start Infrastructure (PostgreSQL, Redis, ClickHouse)](#4-start-infrastructure-postgresql-redis-clickhouse)
5. [Compile Contracts](#5-compile-contracts)
6. [Start Local Blockchain (for development)](#6-start-local-blockchain-for-development)
7. [Deploy Contracts](#7-deploy-contracts)
8. [Start Backend](#8-start-backend)
9. [Start Frontend](#9-start-frontend)
10. [Run Tests](#10-run-tests)
11. [Optional: Deploy to Sepolia Testnet](#11-optional-deploy-to-sepolia-testnet)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

Before you begin, install the following tools on your system:

| Tool | Minimum Version | Installation |
|------|-----------------|--------------|
| **Node.js** | 18.x or 20.x | Download from [nodejs.org](https://nodejs.org) or use [nvm](https://github.com/nvm-sh/nvm): `nvm install 20` |
| **npm** | 9+ | Bundled with Node.js |
| **Rust** | 1.70+ | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| **Docker** | 20+ | [docker.com](https://docker.com) — for PostgreSQL, Redis, ClickHouse |
| **Docker Compose** | 2+ | Usually bundled with Docker Desktop |
| **Git** | Any | [git-scm.com](https://git-scm.com) |

**Optional (for CRE workflow simulation):**

- **Bun** 1.2+: `curl -fsSL https://bun.sh/install | bash`
- **CRE CLI**: `curl -sSL https://cre.chain.link/install.sh | bash`

**Accounts you may need:**

- Optional: [Google AI Studio](https://aistudio.google.com/apikey) for `GEMINI_API_KEY` if you set `AI_PROVIDER=gemini` (default backend AI is **mock**, no key).
- Ethereum wallet with [Sepolia ETH](https://sepoliafaucet.com) — for testnet deployment and betting

**Windows users:** Use WSL2 (Ubuntu) for all commands. Do not use CMD or PowerShell; the project expects a Unix-like environment.

---

## 2. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/quantumquirkz/PraesagiumChain.git
cd PraesagiumChain

# Install root dependencies (Hardhat, Chainlink, OpenZeppelin, dotenv)
npm install

# Install frontend dependencies (Next.js, wagmi, Tailwind, etc.)
npm install
```

**Important:** The project uses **Hardhat 2.x**. If you previously ran `npm audit fix --force` and upgraded to Hardhat 3, revert with:

```bash
npm install hardhat@2 @nomicfoundation/hardhat-toolbox@5
```

---

## 3. Configure Environment

The project uses a **single `.env` file** at the repository root for both backend and frontend.

```bash
# Copy the template
cp env.example .env

# Edit .env with your favorite editor
nano .env   # or: code .env, vim .env, etc.
```

### Minimum required variables (local development)

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://praesagium:praesagium@localhost:5433/praesagium` | PostgreSQL connection string (Docker maps host port 5433) |
| `RPC_URL` | `http://127.0.0.1:8545` | Hardhat local node (or Sepolia RPC for testnet) |
| `AI_PROVIDER` | `mock` (default), `gemini`, or `huggingface` | Use `mock` for no external AI key; `gemini`/`huggingface` need the matching keys in `.env` |
| `GEMINI_API_KEY` / `HF_API_KEY` | As needed | See [configuration.md](configuration.md) |
| `PRIVATE_KEY` | Your wallet private key (without `0x`) | For deploying contracts and running the demo |
| `API_BASE_URL` | `http://localhost:4000` | Backend URL for scripts |

### Frontend variables (required for the UI)

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_CHAIN_ID` | `31337` (local) or `11155111` (Sepolia) | Chain ID for the wallet |
| `NEXT_PUBLIC_RPC_URL` | `http://127.0.0.1:8545` or Sepolia RPC | RPC URL for the wallet |
| `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS` | Contract address | Filled after deploy (see Step 7) |
| `NEXT_PUBLIC_BLOCK_EXPLORER_URL` | `https://sepolia.etherscan.io` | Block explorer URL |

### Optional variables

- `REDIS_URL` — e.g. `redis://localhost:6380` (Docker maps Redis to port 6380)
- `CLICKHOUSE_URL` — e.g. `http://localhost:8123` (for analytics)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — For mobile wallet support via WalletConnect (get from [cloud.walletconnect.com](https://cloud.walletconnect.com))

See [env.example](../env.example) and [configuration.md](configuration.md) for all options.

---

## 4. Start Infrastructure (PostgreSQL, Redis, ClickHouse)

Use Docker Compose to run the database stack:

```bash
./scripts/docker-up.sh
# Or manually: docker compose up -d
```

If you see "permission denied" connecting to the Docker daemon (e.g. on Linux/WSL), run with sudo: `sudo ./scripts/docker-up.sh`.

This starts:

- **PostgreSQL** on host port `5433` (user: `praesagium`, password: `praesagium`, db: `praesagium`)
- **Redis** on host port `6380` (mapped from container port 6379)
- **ClickHouse** on ports `8123` (HTTP) and `9000` (native)

Verify services:

```bash
docker compose ps
```

You should see `postgres`, `redis`, and `clickhouse` running.

**If you prefer local PostgreSQL** (without Docker), create a database and user matching the `DATABASE_URL` in `.env`.

**Backend inside Docker** (same Compose network as Postgres/Redis/ClickHouse): use hostnames `postgres`, `redis`, and `clickhouse` in your URLs. See [`deploy/.env.docker.example`](../deploy/.env.docker.example).

---

## 5. Compile Contracts

```bash
npm run compile
```

This compiles Solidity contracts and syncs the CRE ABI. You should see output like:

```
Compiled 15 Solidity files successfully
```

---

## 6. Start Local Blockchain (for development)

Open a **dedicated terminal** and leave it running:

```bash
npm run node
```

This starts a Hardhat local node at `http://127.0.0.1:8545` with 10 funded accounts.

---

## 7. Deploy Contracts

In a **new terminal**, deploy contracts to the local node:

```bash
npm run deploy
```

The script prints deployed addresses. **Copy them into your `.env`:**

```env
PREDICTION_MARKET_ADDRESS=0x...
CRE_WORKFLOW_ADDRESS=0x...
ORACLE_CONSUMER_ADDRESS=0x...
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0x...   # Same as PREDICTION_MARKET_ADDRESS
```

---

## 8. Start Backend

In another terminal:

```bash
npm run backend
```

The Rust backend starts on `http://localhost:4000`. Verify with:

```bash
curl http://localhost:4000/health
```

You should get a healthy response. Migrations run automatically on startup.

---

## 9. Start Frontend

In another terminal:

```bash
cd frontend && npm run dev
```

The Next.js app runs at `http://localhost:3000`. Open it in your browser and connect your wallet (e.g. MetaMask) to the local Hardhat network (Chain ID 31337).

---

## 10. Run Tests

### Contract tests (Hardhat)

```bash
npm test
```

### Backend tests (Rust)

Requires PostgreSQL (e.g. `docker compose up -d`):

```bash
npm run test:backend
```

Or directly:

```bash
cd backend && cargo test
```

### Run all tests

```bash
npm run test:all
```

### Backend Clippy (lint)

```bash
cd backend && cargo clippy -- -D warnings
```

### Frontend lint

```bash
cd frontend && npm run lint
```

### Security audits (optional)

```bash
# npm
npm run audit

# Rust (requires: cargo install cargo-audit)
cd backend && cargo audit
```

---

## 11. Optional: Deploy to Sepolia Testnet

1. **Get Sepolia ETH** from a [faucet](https://sepoliafaucet.com).
2. **Set in `.env`:**

   ```env
   SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
   PRIVATE_KEY=your_wallet_private_key
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

3. **Deploy:**

   ```bash
   npm run deploy:sepolia
   ```

4. **Copy printed addresses** to `.env` and `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS`.
5. **Update frontend `.env` vars** for Sepolia:

   ```env
   NEXT_PUBLIC_CHAIN_ID=11155111
   NEXT_PUBLIC_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
   NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=<deployed_address>
   ```

See [deploy.md](deploy.md) for full details.

---

## 12. Troubleshooting

### "Cannot find module 'hardhat/internal/cli/bootstrap.js'"

Use Hardhat 2.x. Revert with:

```bash
npm install hardhat@2 @nomicfoundation/hardhat-toolbox@5
```

### "Hardhat only supports ESM projects"

You are on Hardhat 3.x. Revert to Hardhat 2 (see above).

### "Address already in use" (port 4000)

Another process is using port 4000. Kill it or change `PORT` in `.env`.

On Linux/WSL:

```bash
fuser -k 4000/tcp
```

On macOS:

```bash
lsof -ti:4000 | xargs kill -9
```

### "DATABASE_URL not set" or migration errors

Ensure PostgreSQL is running (`docker compose up -d`) and `DATABASE_URL` in `.env` matches the Docker credentials.

### Frontend build fails with "NEXT_PUBLIC_* is undefined"

Ensure `.env` exists at the repo root and contains `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_RPC_URL`, and `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS`.

### "Cannot find module './xxxx.js'" or ChunkLoadError (Next.js)

The Next.js build cache (`.next`) can get out of sync after pull/merge or interrupted builds. Fix:

```bash
cd frontend
rm -rf .next
npm run dev
```

Do not commit the `.next` folder; it is gitignored.

### Stale Solidity build artifacts (`artifacts/`, `cache/`)

If compilation errors persist after changing contracts, clean Hardhat outputs at the repo root:

```bash
npx hardhat clean
```

Then run `npm run compile` again. These directories are gitignored; do not commit them.

### Redis connection refused

Docker maps Redis to port **6380** on the host. Use `REDIS_URL=redis://localhost:6380` (not 6379).

### Wallet cannot connect to local network

Add the Hardhat network in MetaMask:

- Network name: `Hardhat Local`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency: ETH

Use one of the Hardhat test accounts and import its private key into MetaMask (see Hardhat output for keys).

---

## Summary: Minimal Commands to Run the Project

```bash
# 1. Setup
git clone https://github.com/quantumquirkz/PraesagiumChain.git
cd PraesagiumChain
npm install && npm install
cp env.example .env
# Edit .env with DATABASE_URL, PRIVATE_KEY, AI_PROVIDER, etc.

# 2. Infrastructure
./scripts/docker-up.sh

# 3. Blockchain + Deploy + Backend + Frontend (4 terminals)
# Terminal 1:
npm run node

# Terminal 2 (after node is up):
npm run deploy
# Copy addresses to .env

# Terminal 3:
npm run backend

# Terminal 4:
cd frontend && npm run dev

# Open http://localhost:3000 in browser
```

---

For more details, see:

- [README.md](../README.md) — Overview, architecture, and **Acknowledgments**
- [configuration.md](configuration.md) — Environment variables and API keys
- [deploy.md](deploy.md) — Sepolia deployment
- [architecture.md](architecture.md) — Contracts, database, PHPE, frontend, CRE workflow
- [cre/README.md](../cre/README.md) — CRE workflow simulation and `resolveFromBackend.js` (on-chain resolution)

### Frontend design (for contributors)

The UI uses a **single design token** for softer corners: `--radius: 0.75rem` in `frontend/app/globals.css`. Cards and panels use the utility class `.card-modern` (or Tailwind `rounded-xl` / `rounded-2xl`) for consistency. When adding new cards or panels, prefer `card-modern` or `rounded-xl` so the app does not look boxy. See `frontend/app/globals.css` for `.card-modern` and `.card-glow`.
