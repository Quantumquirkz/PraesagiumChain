#!/usr/bin/env bash
# Instala solo el frontend (Next.js). Útil cuando falla npm install por usar Node de Windows.
# Ejecutar desde la raíz del repo, en una terminal WSL con Node de Linux.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f /proc/version ] && grep -qi microsoft /proc/version 2>/dev/null; then
  NODE_PLATFORM="$(node -p 'process.platform' 2>/dev/null || true)"
  if [ "$NODE_PLATFORM" = "win32" ]; then
    echo "ERROR: Estás en WSL pero 'node' es el de Windows."
    echo "Abre una terminal WSL (selector de terminal > Ubuntu (WSL)) e instala Node en WSL:"
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
    echo "  source ~/.bashrc && nvm install 20 && nvm use 20"
    echo "Luego ejecuta de nuevo: ./scripts/install-frontend.sh"
    exit 1
  fi
fi

echo "==> Frontend: limpiando e instalando..."
cd "$ROOT/frontend"
rm -rf node_modules package-lock.json
npm install

echo ""
echo "==> Listo. Para arrancar: cd frontend && npm run dev"
