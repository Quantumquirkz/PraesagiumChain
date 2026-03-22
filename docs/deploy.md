# Deploy to Sepolia (Testnet)

Step-by-step guide to deploy PraesagiumChain contracts to Sepolia and configure the stack for testnet use.

---

## Prerequisites

- Node.js 18+
- Wallet with Sepolia ETH ([faucet](https://sepoliafaucet.com/))
- Private key for deploy wallet (**never** commit it to the repo)

---

## 1. Configure Environment

At the **repo root**, copy and edit `.env`:

```bash
cp env.example .env
```

Minimum required for Sepolia deploy:

```env
PRIVATE_KEY=<your_private_key>   # no 0x prefix
SEPOLIA_RPC_URL=https://rpc.sepolia.org
# Optional; for verification:
ETHERSCAN_API_KEY=<your_key>
# For faster/more reliable RPC, use Alchemy/Infura:
# SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

---

## 2. Compile Contracts

```bash
npm run compile
```

---

## 3. Deploy Main Contracts (PredictionMarket, CRE, Oracle)

```bash
npm run deploy:sepolia
```

Equivalent to `npx hardhat run scripts/deploy/deployWithFunctions.js --network sepolia`. If `FUNCTIONS_ROUTER` is not set in `.env`, it deploys PM + CREWorkflow + OracleConsumer only (same as local flow).

Expected output (example):

```
Deployer: 0x...
PredictionMarket: 0x...
CREWorkflow: 0x...
OracleConsumer: 0x...
```

Copy the addresses into `.env`:

```env
PREDICTION_MARKET_ADDRESS=0x...
CRE_WORKFLOW_ADDRESS=0x...
ORACLE_CONSUMER_ADDRESS=0x...
RPC_URL=https://rpc.sepolia.org
API_BASE_URL=http://localhost:4000
```

---

## 4. Deploy Private Markets (Commit-Reveal) [Optional]

```bash
npx hardhat run scripts/deploy/deployPrivateMarket.js --network sepolia
```

Add to `.env`:

```env
PRIVATE_PREDICTION_MARKET_ADDRESS=0x...
PRIVATE_CRE_WORKFLOW_ADDRESS=0x...
PRIVATE_ORACLE_CONSUMER_ADDRESS=0x...
```

---

## 5. Configure Frontend for Sepolia

In `.env` (root):

```env
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://rpc.sepolia.org
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0x...   # same as PREDICTION_MARKET_ADDRESS from step 3
NEXT_PUBLIC_BLOCK_EXPLORER_URL=https://sepolia.etherscan.io
# If using private markets:
# NEXT_PUBLIC_PRIVATE_MARKET_ADDRESS=0x...
```

---

## 6. Backend with Sepolia

Ensure the backend uses the same network and contract. In `.env` (root):

```env
RPC_URL=https://rpc.sepolia.org
PREDICTION_MARKET_ADDRESS=0x...   # from step 3
```

Optional for indexer:

```env
START_BLOCK=   # block from which to start indexing
```

---

## 7. Verify Contracts on Etherscan [Optional]

With `ETHERSCAN_API_KEY` in `.env`:

```bash
npm run verify:sepolia
```

---

## Variable Summary

| Variable | Location | Use |
|----------|----------|-----|
| `PRIVATE_KEY` | `.env` (root) | Deploy and Hardhat scripts |
| `PREDICTION_MARKET_ADDRESS` / `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS` | `.env` | Backend indexer + frontend |
| `CRE_WORKFLOW_ADDRESS` / `ORACLE_CONSUMER_ADDRESS` | `.env` | Backend / CRE |
| `NEXT_PUBLIC_CHAIN_ID=11155111` | `.env` | Wallet / network in UI |

---

## Go-live checklist (staging / production)

Use this before promoting a release or pointing real users at an environment.

1. **Configuration**
   - `ENVIRONMENT=production`, `JWT_SECRET` set (long random), `CORS_ORIGINS` lists only trusted web origins.
   - `DATABASE_URL` points to managed PostgreSQL (not `localhost`).
   - `PREDICTION_MARKET_ADDRESS` and `NEXT_PUBLIC_*` match the same network and deployment.
2. **Data**
   - Run migrations via backend startup (SQLx) or verify migration job completed.
   - Backups enabled for Postgres; retention documented.
3. **Smoke tests**
   - `GET /health` returns `ok: true` with DB `ok`.
   - `GET /metrics` (Prometheus) and `GET /api/metrics` (JSON) respond.
   - Create a test market flow in UI or API on the target network.
4. **Rollback**
   - Previous container image tags (or Git SHA) recorded; know how to revert Deployments (`kubectl rollout undo` or platform equivalent).
5. **Security**
   - No private keys or API keys in git; secrets from a manager (K8s External Secrets, Sealed Secrets, or host env).
   - Review `docs/operations.md` for audit and Slither policy.

---

## Troubleshooting

- **"Cannot read properties of undefined (reading 'address')"**  
  `PRIVATE_KEY` is missing or empty in `.env`.

- **"insufficient funds"**  
  Wallet does not have enough Sepolia ETH. Use a faucet.

- **RPC timeout**  
  Use a dedicated RPC (Alchemy, Infura) in `SEPOLIA_RPC_URL`.
