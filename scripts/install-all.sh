#!/usr/bin/env bash
# Instala todas las dependencias del proyecto PraesagiumChain.
# Ejecutar desde la raíz del repo en WSL con Node instalado *dentro* de WSL (no el de Windows).

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# En WSL hay que usar Node de Linux; si usas el de Windows, node-gyp falla (EPERM en C:\Windows).
if [ -f /proc/version ] && grep -qi microsoft /proc/version 2>/dev/null; then
  NODE_PLATFORM="$(node -p 'process.platform' 2>/dev/null || true)"
  if [ "$NODE_PLATFORM" = "win32" ]; then
    echo "ERROR: Estás en WSL pero 'node' es el de Windows (node-gyp falla con EPERM)."
    echo ""
    echo "Instala Node dentro de WSL y vuelve a ejecutar este script:"
    echo ""
    echo "  # Opción 1: nvm (recomendado)"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
    echo "  source ~/.bashrc   # o cierra y abre la terminal"
    echo "  nvm install 20"
    echo "  nvm use 20"
    echo ""
    echo "  # Opción 2: Node desde apt"
    echo "  sudo apt update && sudo apt install -y nodejs npm"
    echo ""
    exit 1
  fi
fi

echo "==> Raíz: npm install"
npm install

echo ""
echo "==> Frontend: npm install"
cd "$ROOT/frontend"
npm install

echo ""
echo "==> CRE praesagium-resolver: npm install (sin postinstall cre-setup)"
cd "$ROOT/cre/praesagium-resolver"
npm install --ignore-scripts

echo ""
echo "==> CRE praesagium-resolver-confidential: npm install (sin postinstall cre-setup)"
cd "$ROOT/cre/praesagium-resolver-confidential"
npm install --ignore-scripts

echo ""
echo "==> Backend Rust: cargo build"
if command -v cargo &>/dev/null; then
  cd "$ROOT/backend-rust"
  cargo build
else
  echo "    (cargo no instalado; para instalar: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh)"
fi

echo ""
echo "==> Listo. Para arrancar:"
echo "    Frontend:  cd frontend && npm run dev"
echo "    Hardhat:  npm run node"
echo "    Backend:  npm run backend"
