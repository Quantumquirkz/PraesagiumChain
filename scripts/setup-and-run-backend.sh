#!/usr/bin/env bash
# Instala dependencias (build-essential) si faltan y arranca el backend.
# Ejecutar en WSL. Pedirá contraseña sudo solo si falta cc/gcc.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v cc &>/dev/null && ! command -v gcc &>/dev/null; then
  echo "Instalando build-essential (necesario para compilar Rust)..."
  sudo apt-get update -qq && sudo apt-get install -y build-essential
fi
if ! command -v pkg-config &>/dev/null; then
  echo "Instalando pkg-config y libssl-dev (necesarios para OpenSSL en Rust)..."
  sudo apt-get update -qq && sudo apt-get install -y pkg-config libssl-dev
fi

. "$HOME/.cargo/env" 2>/dev/null || true
cd "$ROOT/backend-rust"
exec cargo run
