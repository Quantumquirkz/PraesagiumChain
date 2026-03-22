#!/usr/bin/env bash
# Installs only the frontend (Next.js). Useful when npm install fails due to using Windows Node.
# Run from the repo root, in a WSL terminal with Linux Node.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f /proc/version ] && grep -qi microsoft /proc/version 2>/dev/null; then
  NODE_PLATFORM="$(node -p 'process.platform' 2>/dev/null || true)"
  if [ "$NODE_PLATFORM" = "win32" ]; then
    echo "ERROR: You are on WSL but 'node' is Windows Node."
    echo "Open a WSL terminal (terminal selector > Ubuntu (WSL)) and install Node in WSL:"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
    echo "  source ~/.bashrc && nvm install 20 && nvm use 20"
    echo "Then run again: ./scripts/install-frontend.sh"
    exit 1
  fi
fi

echo "==> Reinstalling from repo root (includes frontend workspace)"
cd "$ROOT"
rm -rf node_modules frontend/node_modules
npm install

echo ""
echo "==> Done. To run: cd frontend && npm run dev"
