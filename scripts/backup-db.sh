#!/usr/bin/env bash
# Backup database (SQLite or PostgreSQL) using DATABASE_URL from .env.
# Usage: ./scripts/backup-db.sh [output_dir]
# Default output_dir: ./backups (created if missing).
# Backups are named: praesagium-{sqlite|postgres}-YYYYMMDD-HHMMSS.{db|sql}

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

STAMP=$(date +%Y%m%d-%H%M%S)

if [[ "$DATABASE_URL" =~ ^postgres ]]; then
  OUT="$OUTPUT_DIR/praesagium-postgres-$STAMP.sql"
  pg_dump "$DATABASE_URL" --no-owner --no-acl -f "$OUT"
  echo "Backed up PostgreSQL to $OUT"
elif [[ "$DATABASE_URL" =~ ^sqlite ]]; then
  DB_PATH="${DATABASE_URL#sqlite:}"
  DB_PATH="${DB_PATH%%\?*}"
  [ -f "$DB_PATH" ] || { echo "SQLite file not found: $DB_PATH" >&2; exit 1; }
  OUT="$OUTPUT_DIR/praesagium-sqlite-$STAMP.db"
  sqlite3 "$DB_PATH" ".backup '$OUT'"
  echo "Backed up SQLite to $OUT"
else
  echo "Unsupported DATABASE_URL scheme. Use sqlite: or postgresql:." >&2
  exit 1
fi
