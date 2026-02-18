# CRE Flow Simulation and Deployment

This document describes how to simulate and deploy the Compute-Report-Evaluate (CRE) flow of PraesagiumChain.

## Equivalence with the hackathon command

The hackathon rules mention:
```bash
cre simulate --workflow workflow.json --inputs inputs.json
```
In this repository, simulation is done in two equivalent ways:
- **With Node (recommended for quick tests):** `node scripts/simulateCRE.js` — uses inputs from `scripts/inputs.json` if it exists (equivalent to `--inputs inputs.json`).
- **With Chainlink CRE CLI (official workflow):** the current CLI uses `workflow.yaml` instead of `workflow.json` and the command is `cre workflow simulate <workflow-path>`. You can pass the payload from our inputs file with `--http-payload @scripts/inputs.json`. See [Simulating Workflows](https://docs.chain.link/cre/guides/operations/simulating-workflows).

## Option 1: Node simulation (quick)

No Chainlink CRE CLI or CRE account required. Simulates the **Report** step by calling the backend and shows the full flow.

1. Deploy contracts locally:
   ```bash
   npx hardhat run scripts/deploy/deployLocal.js --network localhost
   ```

2. (Optional) Start the backend to get a real outcome from AI:
   ```bash
   cp config/env.example .env   # fill GEMINI_API_KEY or other
   cd backend-rust && cargo run
   ```

3. Simulate the CRE flow:
   ```bash
   node scripts/simulateCRE.js
   ```
   If `scripts/inputs.json` exists, it uses `text_to_analyze` and optionally `api_base_url`. Example `inputs.json`:
   ```json
   {
     "market_id": 1,
     "text_to_analyze": "Bitcoin will reach 100k this year",
     "api_base_url": "http://localhost:4000"
   }
   ```

4. In production, the outcome printed by the script would be sent by Chainlink to the contract `OracleConsumer.oracleCallback(marketId, outcome)` (or to `PredictionMarketFunctionsConsumer` via the Functions Router).

## Option 2: Chainlink CRE CLI (official workflow)

To use the official Chainlink CLI and simulate with `cre workflow simulate`:

1. **Requirements:** [CRE CLI](https://docs.chain.link/cre/getting-started/cli-installation), Go 1.25+, CRE account (`cre login`), RPC in `project.yaml`.

2. **Initialize a CRE project** (in a separate directory or under `cre/`):
   ```bash
   cre init
   ```
   Choose a template (e.g. Helloworld / Golang) and a workflow name (e.g. `praesagium-resolver`).

3. **Configure the workflow** so that on trigger (cron or HTTP):
   - It calls your API (`/api/ai/sentiment` or `/api/predict/hybrid`) or runs equivalent logic.
   - It obtains an outcome 0 or 1.
   - It writes on-chain by calling `OracleConsumer.oracleCallback(marketId, outcome)` or the Chainlink Functions Consumer.

4. **Simulate:**
   ```bash
   cre workflow simulate <workflow-name> --target staging-settings
   ```
   With an HTTP trigger you can pass the payload from `scripts/inputs.json`:
   ```bash
   cre workflow simulate <workflow-name> --non-interactive --trigger-index 0 --http-payload @./scripts/inputs.json --target staging-settings
   ```
   (Trigger index and payload format depend on your `workflow.yaml` and `main.go`.)

5. **References:**
   - [Simulating Workflows](https://docs.chain.link/cre/guides/operations/simulating-workflows)
   - [Part 1: Project Setup & Simulation](https://docs.chain.link/cre/getting-started/part-1-project-setup-go)
   - [Project Configuration](https://docs.chain.link/cre/reference/project-configuration-go)

## Option 3: Chainlink Functions (on-chain resolution)

To have resolution performed by the Chainlink Functions network (not only your own backend):

1. Deploy with the Functions Router on the chosen network:
   ```bash
   export FUNCTIONS_ROUTER=<Router address on Sepolia/Polygon/etc.>
   npx hardhat run scripts/deploy/deployWithFunctions.js --network sepolia
   ```

2. Create a subscription at [Chainlink Functions](https://docs.chain.link/chainlink-functions) and fund it with LINK.

3. Call `PredictionMarketFunctionsConsumer.sendResolutionRequest(marketId, sourceCode, args, subscriptionId, donId)` where:
   - `sourceCode` is the JavaScript that returns 0 or 1 (e.g. from `backend-rust/scripts/ai/sentiment-analysis.js` or an API call).
   - `args` can be `[marketId.toString(), "text for sentiment"]`.

4. When Chainlink runs the script and aggregates the response, the Router will call `handleOracleFulfillment` on the Consumer; it decodes the result byte and calls `CREWorkflow.resolveFromOracle(marketId, outcome)`.

## Summary of relevant files

| File | Purpose |
|------|---------|
| `scripts/simulateCRE.js` | Node simulation of the CRE flow (Report via backend). |
| `scripts/inputs.json` | Example inputs for simulation. |
| `scripts/deploy/deployLocal.js` | Local deployment (OracleConsumer as oracle). |
| `scripts/deploy/deployWithFunctions.js` | Deployment with PredictionMarketFunctionsConsumer (FUNCTIONS_ROUTER). |
| `contracts/OracleConsumer.sol` | Generic callback for result (simulation or Any API). |
| `contracts/PredictionMarketFunctionsConsumer.sol` | Official Chainlink Functions Consumer → CRE. |
| `contracts/CREWorkflow.sol` | Receives oracle result and resolves in PredictionMarket. |
| `backend-rust/scripts/ai/sentiment-analysis.js` | Sentiment script for use in Chainlink Functions. |
