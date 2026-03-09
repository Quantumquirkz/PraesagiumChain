#!/usr/bin/env bash
# Installs dependencies (build-essential) if missing and starts the backend.
# Run in WSL. Will ask for sudo password only if cc/gcc is missing.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v cc &>/dev/null && ! command -v gcc &>/dev/null; then
  echo "Installing build-essential (required for Rust compilation)..."
  sudo apt-get update -qq && sudo apt-get install -y build-essential
fi
if ! command -v pkg-config &>/dev/null; then
  echo "Installing pkg-config and libssl-dev (required for OpenSSL in Rust)..."
  sudo apt-get update -qq && sudo apt-get install -y pkg-config libssl-dev
fi

. "$HOME/.cargo/env" 2>/dev/null || true
cd "$ROOT/backend-rust"
exec cargo run
