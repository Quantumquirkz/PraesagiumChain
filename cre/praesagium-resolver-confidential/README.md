# CRE workflow: confidential (private) markets

Workflow for **commit–reveal** / private prediction markets (TEE-oriented resolution path). Behavior mirrors the standard resolver pattern but targets the private market flow documented in [`docs/architecture.md`](../../docs/architecture.md).

## Inputs / outputs

| Item | Description |
|------|-------------|
| **Purpose** | Scheduled resolution aligned with private market lifecycle |
| **Secrets** | Never commit `cre/secrets.yaml` (gitignored). Use Chainlink / CRE secret management in production |
| **Backend** | Same stack as standard markets: ensure Rust API is up for any HTTP steps |

## Environment

- Copy `cre/.env.example` to `cre/.env` and set `CRE_ETH_PRIVATE_KEY` when running CRE CLI locally.
- Root `.env` drives backend and deploy scripts; keep contract addresses in sync with `NEXT_PUBLIC_*` for the frontend.

## Local verification

1. Deploy private market contract: `npm run deploy:private` (localhost) or your Sepolia flow.
2. Run backend and use private market API routes as documented in the main [cre/README.md](../README.md).
