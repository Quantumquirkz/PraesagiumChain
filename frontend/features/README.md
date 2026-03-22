# Feature modules

Domain-oriented barrels for the UI. Prefer importing from `@/features/<domain>` for new code so routes and shared components stay thin.

- **`markets/`** — List/detail markets, stats, and API helpers for the markets domain.

Legacy paths (`@/components/*`, `@/hooks/*`) remain valid; barrels are additive.
