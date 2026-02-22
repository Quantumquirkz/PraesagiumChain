# Deploy to Testnet (Sepolia / Polygon Amoy)

Step-by-step guide to deploy PraesagiumChain contracts to a public testnet.

---

## 1. Prerequisites

| Requirement | Details |
|-------------|---------|
| **Wallet with testnet ETH** | The `PRIVATE_KEY` in `.env` must be a wallet that holds Sepolia ETH. The Hardhat default (`0xac09...`) has **0 ETH on Sepolia** — use a different wallet or fund it via [sepoliafaucet.com](https://sepoliafaucet.com). |
| **ETHERSCAN_API_KEY** | For Sepolia. Get it at [etherscan.io/myapikey](https://etherscan.io/myapikey). |
| **POLYGONSCAN_API_KEY** | For Polygon Amoy. Get it at [polygonscan.com](https://polygonscan.com). |
| **RPC URL** | Public RPCs can be slow or fail (522/timeout). Prefer a dedicated RPC: |

### Recommended RPC (Sepolia)

Create a free app at [Alchemy](https://alchemy.com) or [Infura](https://infura.io):

```
# Alchemy (recommended)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY

# Alternatives
# rpc2.sepolia.org
SEPOLIA_RPC_URL=https://rpc2.sepolia.org

# BlockPi
SEPOLIA_RPC_URL=https://ethereum-sepolia.blockpi.network/v1/rpc/public
```

---

## 2. Deploy to Sepolia

1. Set in `.env`:
   - `PRIVATE_KEY` — wallet with Sepolia ETH
   - `SEPOLIA_RPC_URL` — RPC (Alchemy recommended)
   - `ETHERSCAN_API_KEY` — for verification

2. Deploy:
   ```bash
   npm run deploy:sepolia
   ```

3. Copy the printed addresses to `.env`:
   ```
   PREDICTION_MARKET_ADDRESS=0x...
   CRE_WORKFLOW_ADDRESS=0x...
   ORACLE_CONSUMER_ADDRESS=0x...
   ```

4. Update `RPC_URL` in `.env` for the backend indexer (optional):
   ```
   RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
   ```

---

## 3. Verify on Etherscan

```bash
npm run verify:sepolia
```

Ensures `PREDICTION_MARKET_ADDRESS`, `CRE_WORKFLOW_ADDRESS`, `ORACLE_CONSUMER_ADDRESS` are set in `.env`.

---

## 4. Deploy to Polygon Amoy

1. Set in `.env`:
   - `PRIVATE_KEY` — wallet with Polygon Amoy MATIC
   - `POLYGON_AMOY_RPC_URL` (optional, default: `https://rpc-amoy.polygon.technology`)
   - `POLYGONSCAN_API_KEY`

2. Deploy:
   ```bash
   npm run deploy:polygon
   ```

3. Verify:
   ```bash
   npm run verify:polygon
   ```

---

## 5. Update README

Add the deployed addresses and Scan links to [README.md](../README.md) section **Deployed contracts**:

| Contract | Network | Address | Explorer |
|----------|---------|---------|----------|
| PredictionMarket | Sepolia | `0x...` | [View](https://sepolia.etherscan.io/address/0x...) |
| CREWorkflow | Sepolia | `0x...` | [View](https://sepolia.etherscan.io/address/0x...) |
| OracleConsumer | Sepolia | `0x...` | [View](https://sepolia.etherscan.io/address/0x...) |

---

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `Headers Timeout` / `522` | RPC unreachable or slow | Use Alchemy/Infura RPC or retry later |
| `insufficient funds` | No testnet ETH in deployer wallet | Get ETH from [sepoliafaucet.com](https://sepoliafaucet.com) |
| `Invalid JSON-RPC response` | RPC error or network issue | Try different RPC (see §1) |
