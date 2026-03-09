#!/usr/bin/env bash
# Checks whether on WSL you are using Linux Node or Windows Node.
# If you use Windows Node, npm install may fail with node-gyp (EPERM on C:\Windows).

if [ ! -f /proc/version ] || ! grep -qi microsoft /proc/version 2>/dev/null; then
  echo "You are not on WSL; this check does not apply."
  exit 0
fi

NODE_PLATFORM="$(node -p 'process.platform' 2>/dev/null || true)"
NODE_PATH="$(command -v node 2>/dev/null || true)"

if [ "$NODE_PLATFORM" = "win32" ]; then
  echo "Issue: you are on WSL but 'node' is Windows Node."
  echo "  node is at: $NODE_PATH"
  echo "  process.platform: $NODE_PLATFORM"
  echo ""
  echo "Install Node inside WSL (nvm or apt) and use that node/npm."
  echo "See INSTALL.md section 'Node inside WSL'."
  exit 1
fi

echo "OK: Node is Linux (platform=$NODE_PLATFORM, path=$NODE_PATH)"
exit 0
