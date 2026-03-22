# Infrastructure

- **[kubernetes/](kubernetes/)** — Optional Kubernetes manifests ([README](kubernetes/README.md)).
- **[docker/.env.docker.example](docker/.env.docker.example)** — Example environment when the backend runs inside Docker on the Compose network (hostnames `postgres`, `redis`, `clickhouse`). Merge into root `.env` or use for `docker compose run` workflows.

Root **[docker-compose.yml](../docker-compose.yml)** defines the local database stack (Postgres, Redis, ClickHouse).
