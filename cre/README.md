# CRE Workflow for PraesagiumChain

This directory is reserved for a **Chainlink CRE** (Compute-Report-Evaluate) workflow that runs with the CRE CLI.

## How to add a CRE workflow

1. Install the [CRE CLI](https://docs.chain.link/cre/getting-started/cli-installation) and run `cre login`.

2. From the repo root, initialize a CRE project (or use a temporary directory):
   ```bash
   cre init
   ```
   Choose the Golang template and a name such as `praesagium-resolver`.

3. In the generated workflow:
   - Configure a trigger (cron at `resolveTime` or HTTP for testing).
   - In the handler: call the backend API (`/api/ai/sentiment` or similar) or replicate the logic of `backend-rust/scripts/ai/sentiment-analysis.js`.
   - Obtain an outcome 0 or 1 and send a transaction to the contract (e.g. `OracleConsumer.oracleCallback(marketId, outcome)` or the Functions Consumer).

4. Use the example inputs from the repo:
   ```bash
   cp scripts/inputs.json cre/<your-workflow>/inputs.json
   ```

5. Simulate:
   ```bash
   cre workflow simulate <workflow-name> --target staging-settings
   ```

Detailed documentation: [docs/CRE_CLI.md](../docs/CRE_CLI.md).

## Contracts and scripts in this repo

- Contracts: `contracts/CREWorkflow.sol`, `contracts/OracleConsumer.sol`, `contracts/PredictionMarketFunctionsConsumer.sol`.
- Simulation without CRE CLI: `node scripts/simulateCRE.js` (uses `scripts/inputs.json` if present).
