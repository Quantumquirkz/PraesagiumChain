# ADR-002: Authentication — SIWE challenges and JWT sessions

## Status

Accepted

## Context

The frontend uses wallet connectivity (wagmi/viem). The backend exposes `POST /api/auth/challenge` and `POST /api/auth/verify` for Sign-In with Ethereum (SIWE) style flows, with JWT issuance when `JWT_SECRET` is configured.

## Decision

- **Primary web auth**: SIWE verification server-side, then short-lived JWT for API calls where needed.
- **Production**: `JWT_SECRET` is mandatory (`ENVIRONMENT=production`); see `backend/src/startup.rs` and `env.example`.
- **Nonces**: Prefer `REDIS_URL` for nonce storage in multi-instance deployments; otherwise in-memory (single instance only).

## Consequences

- JWT must be rotated by changing `JWT_SECRET` and invalidating old tokens (document in runbooks).
- Browser must not log JWT in analytics; treat as secret in headers only.

## Alternatives

- Session cookies only — rejected for API-first + wallet flows without a unified domain.
- Pure wallet signature per request — rejected for UX cost on every call.
