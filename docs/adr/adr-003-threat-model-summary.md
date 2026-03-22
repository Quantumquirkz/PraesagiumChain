# ADR-003: Threat model summary (STRIDE-oriented)

## Status

Accepted (living document — revisit before mainnet)

## Context

PraesagiumChain spans public L2/L1 testnets, a public REST API, browser wallets, and optional Redis/ClickHouse. A full STRIDE exercise should be repeated for production.

## Decision — mitigations in scope

| Threat | Mitigation (high level) |
|--------|-------------------------|
| Spoofing | On-chain actions signed by user wallets; admin routes gated by `X-Admin-Token` / non-production only; JWT signed with `JWT_SECRET`. |
| Tampering | Chain state authoritative; indexer replays events; TLS in production for API. |
| Repudiation | Immutable chain events; structured logs with `X-Request-ID` on responses. |
| Information disclosure | No secrets in `NEXT_PUBLIC_*`; `env.example` only in repo; K8s secrets via secret managers (see `infrastructure/kubernetes/`). |
| Denial of service | Rate limiting (`tower_governor`); body size limits; DB pool bounds. |
| Elevation of privilege | Resolver/oracle roles on contracts; `authorizedCallback` on oracle path; production config validation in `Config::validate_for_deployment`. |

## Consequences

- Mainnet requires a professional smart-contract audit or explicit risk acceptance documented outside this ADR.
- New external integrations (CRE, RPC, AI) extend the trust boundary — update this ADR when adding them.
