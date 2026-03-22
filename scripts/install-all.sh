#!/usr/bin/env bash
# Installs all dependencies for the PraesagiumChain project.
# Run from the repo root in WSL with Node installed *inside* WSL (not Windows).

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# On WSL you must use Linux Node; if you use Windows Node, node-gyp fails (EPERM on C:\Windows).
if [ -f /proc/version ] && grep -qi microsoft /proc/version 2>/dev/null; then
  NODE_PLATFORM="$(node -p 'process.platform' 2>/dev/null || true)"
  if [ "$NODE_PLATFORM" = "win32" ]; then
    echo "ERROR: You are on WSL but 'node' is Windows Node (node-gyp fails with EPERM)."
    echo ""
    echo "Install Node inside WSL and run this script again:"
    echo ""
    echo "  # Option 1: nvm (recommended)"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
    echo "  source ~/.bashrc   # or close and reopen the terminal"
    echo "  nvm install 20"
    echo "  nvm use 20"
    echo ""
    echo "  # Option 2: Node via apt"
    echo "  sudo apt update && sudo apt install -y nodejs npm"
    echo ""
    exit 1
  fi
fi

echo "==> Root: npm install (includes frontend workspace)"
npm install

echo ""
echo "==> CRE praesagium-resolver: npm install (no postinstall cre-setup)"
cd "$ROOT/cre/praesagium-resolver"
npm install --ignore-scripts

echo ""
echo "==> CRE praesagium-resolver-confidential: npm install (no postinstall cre-setup)"
cd "$ROOT/cre/praesagium-resolver-confidential"
npm install --ignore-scripts

echo ""
echo "==> Backend Rust: cargo build"
if command -v cargo &>/dev/null; then
  cd "$ROOT/backend-rust"
  cargo build
else
  echo "    (cargo not installed; to install: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh)"
fi

echo ""
echo "==> Done. To run:"
echo "    Frontend:  cd frontend && npm run dev"
echo "    Hardhat:  npm run node"
echo "    Backend:  npm run backend"
