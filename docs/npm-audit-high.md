# npm audit — severidad ≥ high

## Frontend (`cd frontend && npm audit --audit-level=high`)

**Política:** debe reportar **0** vulnerabilidades de severidad high. El job `dependency-audit-high` en CI ejecuta este audit de forma **bloqueante** (tras `npm ci` en la raíz del monorepo).

**PWA:** se usa `@ducanh2912/next-pwa` (Workbox 7.x) en lugar de `next-pwa`. En la raíz del monorepo, `package.json` incluye `overrides` para `@rollup/plugin-terser` y `serialize-javascript` a fin de eliminar la cadena vulnerable heredada de `workbox-build` (peer de Workbox declarado como `^0.4.3`; el proyecto fuerza `@rollup/plugin-terser@1.0.0` y `serialize-javascript@7.0.4`). El repositorio ya tiene `legacy-peer-deps=true` en [`.npmrc`](../.npmrc), coherente con ese override.

## Raíz (`npm audit --audit-level=high`)

**Política actual:** el mismo job de CI ejecuta `npm audit --audit-level=high` en la raíz con **`continue-on-error: true`** para **visibilidad** mientras subsistan advisories altos transitivos que no tienen arreglo limpio inmediato, por ejemplo:

- **@chainlink/contracts** → **@arbitrum/nitro-contracts** / **@eth-optimism/** → **@openzeppelin/contracts** en rangos antiguos.
- **mocha** → **diff** (advisory en `diff`; arreglos forzados pueden romper Hardhat 3).
- **@ethersproject/** → **elliptic** (a menudo "no fix available" en el árbol actual).
- **undici** vía **hardhat** / **@nomicfoundation/hardhat-utils** (seguimiento upstream; existen `overrides` de `undici` en la raíz).

**Objetivo a largo plazo:** reducir o eliminar estos hallazgos al actualizar dependencias upstream; entonces se puede quitar `continue-on-error` en el paso del audit de raíz si el equipo acuerda bloquear también el monorepo completo en high.
