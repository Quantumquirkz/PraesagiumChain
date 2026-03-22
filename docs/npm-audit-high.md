# npm audit — snapshot (severidad ≥ high)

Registro **posterior** a la migración (Hardhat 3, Next 16, workspaces). No se conservó un volcado literal “antes” en el repositorio; usar `git show <commit>:package-lock.json` si se necesita comparación histórica.

## Raíz (`npm audit --audit-level=high`)

Última ejecución típica: **varias vulnerabilidades high** ligadas sobre todo a:

- **@chainlink/contracts** → dependencias anidadas (**@arbitrum/nitro-contracts**, **@eth-optimism/**) que arrastran **@openzeppelin/contracts** en rangos antiguos reportados por advisory. El código del proyecto importa interfaces concretas; el riesgo efectivo depende de qué contratos de esos paquetes se despliegan. Mitigación a largo plazo: actualizar **@chainlink/contracts** cuando upstream suba dependencias transitivas.
- **mocha → diff**: advisory en `diff`; `npm audit fix --force` propone bajar mocha (cambio incompatible con la suite Hardhat 3).
- **serialize-javascript** vía **next-pwa → workbox**: ya documentado en el workflow opcional `dependency-audit-high`; arreglo limpio suele exigir sustituir o actualizar la cadena PWA.
- **undici** vía **hardhat / @nomicfoundation/hardhat-utils**: mitigación depende de releases upstream; los `overrides` de `undici` en `package.json` apuntan a una línea soportada pero el árbol puede seguir mostrando nodos vulnerables hasta que las dependencias directas actualicen.

## Frontend (`cd frontend && npm audit --audit-level=high`)

Principalmente **serialize-javascript** por la misma cadena **next-pwa / workbox** y **lodash** moderado vía dependencias del ecosistema.

## Objetivo “cero high”

No es alcanzable hoy sin **sustituir next-pwa/workbox**, forzar versiones que rompen peer deps, o aceptar downgrades incompatibles (mocha/Hardhat). El job `dependency-audit-high` permanece `continue-on-error: true` para visibilidad sin bloquear merges.
