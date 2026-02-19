# PraesagiumChain — Seguridad y Operaciones

Documento unificado de seguridad (contratos y backend), optimización para producción, monitoreo, CI/CD y reporte de vulnerabilidades.

---

## 1. Seguridad

### 1.1 Contratos inteligentes

| Contrato | Medidas |
|----------|---------|
| **PredictionMarket.sol** | Checks-Effects-Interactions; reentrancy mitigado actualizando estado antes de llamadas externas. |
| **OracleConsumer.sol** | `oracleCallback` restringido vía `authorizedCallback`. En producción: Router de Chainlink Functions o ejecutor CRE. |
| **CREWorkflow.sol** | `resolveFromOracle` restringido a `onlyOracle` (dirección OracleConsumer). |
| **ReputationSystem.sol** | `onlyAuthorized` para callbacks; comprobación de creador en resolución. |

**Recomendaciones:**
- Ejecutar Slither: `slither . --exclude-dependencies` (`pip install slither-analyzer`).
- Considerar MythX u otras herramientas de análisis.
- Antes de mainnet: `authorizedCallback` al Router de Chainlink Functions, no a una EOA.
- Considerar `ReentrancyGuard` de OpenZeppelin en `claimPayout` para defensa en profundidad.

### 1.2 Backend (Rust)

- Validación de inputs en endpoints (ej. longitud máxima de texto en sentiment).
- Acceso a DB con consultas parametrizadas (SQLx) para evitar inyección.
- Sin secrets en logs; manejo estructurado de errores.
- Revisar dependencias: `cargo install cargo-audit && cargo audit`.

**Próximos pasos:**
- Rate limiting en endpoints públicos (ej. `tower_governor`).
- Autenticación JWT en rutas sensibles si hay clientes no confiables.
- Ejecutar `cargo clippy` y resolver avisos.

### 1.3 Chainlink y CRE

- Resolución determinista: mismos inputs → mismo resultado.
- Workflow CRE con agregación por consenso donde aplique.
- Garantizar que `api_base_url` apunte a un backend de confianza.

### 1.4 Reporte de vulnerabilidades

No abrir issues públicos para vulnerabilidades de seguridad.

**Contacto:** Crear un advisory privado en el repositorio (Security → Advisories → New draft).

---

## 2. Optimización para producción

### 2.1 Implementado

| Área | Cambios |
|------|---------|
| Seguridad contratos | OracleConsumer: `authorizedCallback`. Scripts de deploy lo configuran. |
| Validación backend | `/api/ai/sentiment`, `/api/predict/hybrid`: límites de texto, arrays, checks de vacío. |
| CI/CD | `npm audit`, `cargo audit` en GitHub Actions. |
| Documentación | CONTRIBUTING.md, plantillas de issues. |
| Protección IP | Documentación PHPE, términos en CONTRIBUTING. |

### 2.2 Próximos pasos recomendados

1. **Rate limiting** — P. ej. `tower_governor` en `/api/ai/sentiment`.
2. **JWT** — Rutas sensibles si se exponen a clientes no confiables.
3. **Slither** — Correr sobre contratos y corregir hallazgos.
4. **Layer 2** — Valorar Arbitrum/Optimism para reducir gas.
5. **Índices DB** — En `markets.close_time`, `predictions.market_id` para consultas intensivas.
6. **Cumplimiento** — Documentar consideraciones MiCA/SEC si se ofrecen servicios en jurisdicciones reguladas.

---

## 3. Monitoreo y operaciones

### 3.1 Logging

El backend usa **tracing**. Filtrar con:

```bash
RUST_LOG=praesagium_backend=debug,tower_http=debug npm run backend
```

Niveles: `error`, `warn`, `info`, `debug`, `trace`.

### 3.2 Producción

| Componente | Recomendación |
|------------|---------------|
| **Prometheus/Grafana** | Exportar métricas (request count, latencia, errores). Endpoint `/api/metrics`. |
| **Alertas** | Errores repetidos, fallos de conexión DB, timeouts de oráculo. |
| **Health check** | `/health` devuelve `{"ok": true}`; usar en load balancer. |
| **Chainlink** | Vigilar ejecuciones del workflow CRE y éxito/fallo de callbacks. |

### 3.3 CORS y rate limiting

- **CORS:** Definir `CORS_ORIGINS` con orígenes permitidos en producción. Si está vacío, se permiten todos (solo desarrollo).
- **Rate limiting:** Si no está implementado en el backend, usar proxy inverso (nginx, Cloudflare) o gateway con límites.

### 3.4 Reporte de bugs

Usar la plantilla [Bug report](.github/ISSUE_TEMPLATE/bug_report.md): incluir entorno, pasos para reproducir y logs.

---

## 4. CI/CD

El workflow `.github/workflows/deploy.yml` incluye:

- Tests de contratos (Hardhat).
- `npm audit --audit-level=high`.
- Tests del backend (Rust).
- `cargo audit` para dependencias.

Comando local para auditorías:
```bash
npm run audit
```
