#!/usr/bin/env bash
# Start PostgreSQL, Redis, and ClickHouse via Docker Compose, then apply ClickHouse DDL.
#
# Usage:
#   ./scripts/docker-up.sh
#
# If you get "permission denied" connecting to the Docker daemon socket (e.g. on
# Linux/WSL when your user is not in the docker group), run with sudo:
#   sudo ./scripts/docker-up.sh
#
# Requires: docker compose (or docker-compose)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo "Starting PostgreSQL, Redis, ClickHouse..."
docker compose up -d

echo "Waiting for ClickHouse to be ready..."
for i in {1..30}; do
  if curl -s "http://localhost:8123/ping" >/dev/null 2>&1; then
    echo "ClickHouse is up."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ClickHouse did not become ready in time. Check: docker compose logs clickhouse" >&2
    exit 1
  fi
  sleep 1
done

CH_SQL="$REPO_ROOT/backend/migrations/clickhouse/001_events.sql"
if [ -f "$CH_SQL" ]; then
  echo "Applying ClickHouse DDL..."
  docker compose exec -T clickhouse clickhouse-client --multiquery < "$CH_SQL" || true
else
  echo "No ClickHouse migrations at $CH_SQL; skip DDL."
fi

echo "Done. Set in .env:"
echo "  DATABASE_URL=postgresql://praesagium:praesagium@localhost:5433/praesagium"
echo "  REDIS_URL=redis://localhost:6380"
echo "  CLICKHOUSE_URL=http://localhost:8123"
