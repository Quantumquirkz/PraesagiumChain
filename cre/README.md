# CRE Workflow — PraesagiumChain

This directory contains the **Chainlink CRE** (Compute-Report-Evaluate) workflow for PraesagiumChain, used as the orchestration layer that integrates blockchain with external API (LLM-powered sentiment).

## Structure

```
cre/
├── project.yaml                    # Global config (RPC, chains)
├── secrets.yaml                    # Secret declarations (optional)
├── .env.example                    # Copy to .env, add CRE_ETH_PRIVATE_KEY
├── contracts/evm/src/abi/          # ABI for workflow (synced via npm run compile)
├── praesagium-resolver/            # Workflow directory (TypeScript)
│   ├── main.ts                     # Workflow code (CRON → HTTP API → outcome)
│   ├── package.json                # Dependencies (@chainlink/cre-sdk, zod)
│   ├── tsconfig.json
│   ├── workflow.yaml               # Workflow config per target
│   ├── config.staging.json         # Staging params
│   └── config.production.json      # Production params
└── README.md
```

## What the workflow does

1. **CRON trigger** — Runs on schedule (configurable in config).
2. **HTTP POST** — Calls backend `/api/ai/sentiment` with `text_to_analyze`.
3. **Outcome** — Maps `probability >= 0.5` → outcome `1` (Yes), else `0` (No).
4. **Production** — When `oracle_consumer_address` is set, logs that it would call `OracleConsumer.oracleCallback(marketId, outcome)`.

## Prerequisites

- **Bun 1.2.21+** or **Node.js** — [Install Bun](https://bun.sh) (recommended) or use npm
- **CRE CLI** — [Install CRE CLI](https://docs.chain.link/cre/getting-started/cli-installation)
- **CRE account** — `cre login`
- **Funded Sepolia account** — For simulation (optional)

## Setup

1. Copy `.env.example` to `.env` and set:
   ```
   CRE_ETH_PRIVATE_KEY=your_64_char_hex_private_key
   ```

2. From repo root, run `npm run compile` to sync OracleConsumer ABI to `cre/contracts/evm/src/abi/` (or `npm run sync:cre-abi` if already compiled).

3. Install workflow dependencies:
   ```bash
   cd cre/praesagium-resolver && (bun install || npm install)
   ```

4. Ensure the backend is running (for full flow):
   ```bash
   npm run backend
   ```

5. Optionally adjust `config.staging.json`:
   - `api_base_url`: backend URL (default `http://localhost:4000`)
   - `text_to_analyze`: text for sentiment analysis
   - `market_id`: market to resolve

## Simulate with CRE CLI

From the **cre/** directory:

```bash
cd cre
cre workflow simulate praesagium-resolver --target staging-settings
```

At the prompt, select the **cron-trigger** (option 1). The workflow will:

1. Call the backend `/api/ai/sentiment` with the configured text.
2. Compute outcome 0 or 1.
3. Log the result. Start the backend first for a successful run.

## Files that use Chainlink

| File | Purpose |
|------|---------|
| `praesagium-resolver/main.ts` | CRE workflow: CRON trigger, HTTP client, consensus |
| `project.yaml` | RPC config for Sepolia |

## References

- [CRE — Simulating Workflows](https://docs.chain.link/cre/guides/operations/simulating-workflows)
- [CRE — Part 1: Project Setup (TypeScript)](https://docs.chain.link/cre/getting-started/part-1-project-setup-ts)
- [CRE — Making POST Requests (TypeScript)](https://docs.chain.link/cre/guides/workflow/using-http-client/post-request-ts)
