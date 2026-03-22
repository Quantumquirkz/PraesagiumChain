# Slither — metodología y triage (INFO / Low / Medium)

## Comando CI (equivalente a `npm run slither:ci`)

Análisis directo sobre `contracts/` con **solc 0.8.28** y **EVM Cancún** (alineado con el pragma `^0.8.24` y OpenZeppelin 5), sin depender del JSON de artefactos de Hardhat 3:

- `--solc-remaps`: `@openzeppelin/=node_modules/@openzeppelin/` y `@chainlink/contracts/=node_modules/@chainlink/contracts/` (un solo argumento con ambos remaps separados por espacio).
- `--exclude-dependencies`: no se reportan issues solo en dependencias externas.
- `--filter-paths node_modules`: excluye hallazgos cuyo origen está bajo `node_modules` (evita falsos positivos altos en OpenZeppelin, p. ej. `incorrect-exp` en `Math.sol`).

El job de GitHub Actions instala **slither-analyzer** y **solc-select**, fija **solc 0.8.28**, y ejecuta `npm run slither:ci` (que invoca `python3 -m slither`, mismo intérprete que `pip`). En local: `pip install slither-analyzer solc-select`, `solc-select install 0.8.28 && solc-select use 0.8.28`, `npm ci`, luego `npm run slither:ci`.

## Cambios aplicados en contratos propios

- `owner` como **`immutable`** donde no existe transferencia de ownership (`PredictionMarket`, `PrivatePredictionMarket`, `CREWorkflow`, `ConditionalMarket`, `ReputationSystem`, `AutomationResolver`, `OracleConsumer`). `PredictionMarketFunctionsConsumer` mantiene `owner` mutable por `setOwner`.
- Parámetros de setters renombrados a **camelCase** (`newResolver`, `newOracle`, etc.) para conformidad Slither.
- `PredictionMarketFunctionsConsumer.s_pendingMarketId`: supresión puntual **con comentario** (prefijo `s_` estilo Chainlink y getter estable en ABI).

## Hallazgos restantes (revisión por categoría)

Tras los cambios, el análisis sigue reportando decenas de resultados en su mayoría **Low** e **Informational**, agrupados así:

| Detector (Slither) | Tratamiento |
| --- | --- |
| `missing-zero-check` | Aceptado o revisión manual: muchos avisos son sobre direcciones o valores ya acotados por lógica de negocio o callers de confianza. Endurecer con `require(x != 0)` donde el riesgo sea real. |
| `timestamp` | Aceptado: uso de `block.timestamp` para ventanas de mercado; tolerancia inherente a oráculos de tiempo en cadena. |
| `events-access` | Informativo: sugiere eventos en escrituras; valor de auditoría, no bug por sí solo. |
| `low-level-calls` | Aceptado donde aplica: p. ej. `claimPayout` usa `.call{value:}` con checks-effects-interactions y `nonReentrant`. |
| `reentrancy-events` | Informativo: orden eventos vs efectos; bajo riesgo con `ReentrancyGuard` donde corresponde. |
| `calls-loop` | Revisar en bucles sobre mercados o condiciones; riesgo de gas, no vulnerabilidad lógica automática. |
| `uninitialized-local` | Revisar caso por caso en ramas de compilación. |
| `unused-return` / `cache-array-length` | Micro-optimización o estilo. |

**Criterio:** ningún hallazgo **High** en código de primer nivel bajo `contracts/` con la receta anterior; CI falla solo con `--fail-high`.
