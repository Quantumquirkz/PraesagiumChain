#!/usr/bin/env bash
# Comprueba si en WSL estás usando Node de Linux o de Windows.
# Si usas el de Windows, npm install puede fallar con node-gyp (EPERM en C:\Windows).

if [ ! -f /proc/version ] || ! grep -qi microsoft /proc/version 2>/dev/null; then
  echo "No estás en WSL; no aplica la comprobación."
  exit 0
fi

NODE_PLATFORM="$(node -p 'process.platform' 2>/dev/null || true)"
NODE_PATH="$(command -v node 2>/dev/null || true)"

if [ "$NODE_PLATFORM" = "win32" ]; then
  echo "Problema: estás en WSL pero 'node' es el de Windows."
  echo "  node está en: $NODE_PATH"
  echo "  process.platform: $NODE_PLATFORM"
  echo ""
  echo "Instala Node dentro de WSL (nvm o apt) y usa ese node/npm."
  echo "Ver INSTALL.md sección 'Node dentro de WSL'."
  exit 1
fi

echo "OK: Node es de Linux (platform=$NODE_PLATFORM, path=$NODE_PATH)"
exit 0
