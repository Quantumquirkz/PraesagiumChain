#!/usr/bin/env bash
# Backup PostgreSQL database using DATABASE_URL from .env.
# Usage: ./scripts/backup-db.sh [output_dir]
# Default output_dir: ./backups (created if missing).
# Backups are named: praesagium-postgres-YYYYMMDD-HHMMSS.sql

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="${1:-$REPO_ROOT/backups}"
mkdir -p "$OUTPUT_DIR"

if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  source "$REPO_ROOT/.env"
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL not set. Set it in .env or export it." >&2
  exit 1
fi

if [[ ! "$DATABASE_URL" =~ ^postgres ]]; then
  echo "DATABASE_URL must be a PostgreSQL URL (postgresql://...)." >&2
  exit 1
fi

STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$OUTPUT_DIR/praesagium-postgres-$STAMP.sql"
pg_dump "$DATABASE_URL" --no-owner --no-acl -f "$OUT"
echo "Backed up PostgreSQL to $OUT"
