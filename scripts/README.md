# Scripts index

Most **npm** workflows are defined in the root [package.json](../package.json). This table lists **every script** in this folder for quick discovery.

Shared helpers: [`lib/load-env.js`](lib/load-env.js) loads the repo-root `.env` (used by scripts that must resolve env consistently).

| Script | Purpose | Network / prereqs | Typical command |
|--------|---------|-------------------|-------------------|
| `install-all.sh` | Install root, frontend, CRE, and optional Rust deps (prefer `./scripts/install-all.sh` on WSL; see [INSTALL.md](../INSTALL.md)) | Node 20+, WSL recommended | `./scripts/install-all.sh` |
| `install-frontend.sh` | Clean reinstall of `frontend/node_modules` | Node | `./scripts/install-frontend.sh` |
| `check-node.sh` | On WSL, verify Node is Linux (`linux`), not Windows (`win32`) | WSL | `./scripts/check-node.sh` |
| `docker-up.sh` | Start Postgres, Redis, ClickHouse (`docker compose`), apply ClickHouse DDL | Docker | `./scripts/docker-up.sh` |
| `backup-db.sh` | PostgreSQL dump using `DATABASE_URL` from `.env` | DB running | `./scripts/backup-db.sh` |
| `setup-and-run-backend.sh` | Ensure build deps, then `cargo run` in `backend-rust` | Rust | `./scripts/setup-and-run-backend.sh` |
| `run-backend.js` | Start backend with repo-root `.env` loaded (used by `npm run backend`) | `.env`, Postgres | `npm run backend` |
| `syncCreAbi.js` | Copy OracleConsumer ABI from Hardhat artifacts into CRE (`npm run sync:cre-abi`) | After `npm run compile` | `npm run sync:cre-abi` |
| `stress-api.js` | Load test `/health` and `/api/markets` on the API | Backend up | `node scripts/stress-api.js [baseUrl]` |
| `simulateCRE.js` | Textual walkthrough of the CRE resolution flow (no chain) | Optional backend | `node scripts/simulateCRE.js` |
| `resolveFromBackend.js` | Resolve a market on-chain using backend outcome (demos / automation) | `PRIVATE_KEY`, `ORACLE_CONSUMER_ADDRESS`, RPC | `node scripts/resolveFromBackend.js --market-id N` |
| `seed-markets.js` | Create many test markets via backend API | Backend, `.env` | `node scripts/seed-markets.js` |
| `clear-and-seed-one-market.js` | Reset and seed one market (local or Sepolia) | Hardhat node or Sepolia | `npx hardhat run scripts/clear-and-seed-one-market.js --network localhost` |
| `deploy-markets-onchain.js` | Deploy markets on-chain (see script header) | Sepolia + keys | `npx hardhat run scripts/deploy-markets-onchain.js --network sepolia` |
| `deploy-private.js` | Deploy `PrivatePredictionMarket`; can append `NEXT_PUBLIC_*` to `.env` | Sepolia / local | `npx hardhat run scripts/deploy-private.js --network sepolia` |
| `registerUpkeep.js` | Register Chainlink Automation upkeep (LINK, env addresses) | Sepolia | `npx hardhat run scripts/registerUpkeep.js --network sepolia` |
| `deploy/deployLocal.js` | Local deploy (used by `npm run deploy`) | localhost:8545 | `npm run deploy` |
| `deploy/deployPrivateMarket.js` | Deploy private market on localhost (`npm run deploy:private`) | localhost | `npm run deploy:private` |
| `deploy/deployWithFunctions.js` | Sepolia/Polygon deploy with Functions (`deploy:sepolia` / `deploy:polygon`) | Testnet keys | `npm run deploy:sepolia` |
| `deploy/completeSepoliaSetup.js` | One-shot Sepolia setup (see script comments) | Sepolia | `npx hardhat run scripts/deploy/completeSepoliaSetup.js --network sepolia` |
| `sync/syncMarketFromTx.js` | Sync market state from a tx (`npm run sync:market`) | RPC, `.env` | `npm run sync:market` |
| `verify/verify.js` | Verify contracts on Etherscan (`verify:sepolia` / `verify:polygon`) | `ETHERSCAN_API_KEY` | `npm run verify:sepolia` |
| `test/testPredictionMarket.js` | Contract tests (Hardhat `paths.tests` → `scripts/test`) | Hardhat | `npm test` |
| `test/testCREWorkflow.js` | CRE workflow tests | Hardhat | `npm test` |
| `demo/demoE2E.js` | End-to-end demo (`npm run demo`) | Local stack | `npm run demo` |

For **Kubernetes** manifests, see [deploy/k8s/README.md](../deploy/k8s/README.md).
