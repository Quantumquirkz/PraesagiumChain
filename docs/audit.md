# Auditoría Frontend/Backend — Inventario de flujos y endpoints

**Fecha:** 2025-03-07  
**Objetivo:** Lista de flujos/endpoints con estado OK / Frágil / Roto y contrato API verificado.

---

## 1. Flujos frontend y estado

| Flujo | Archivo(s) | API / Contrato | Estado | Notas |
|-------|------------|----------------|--------|--------|
| Dashboard | `app/page.tsx` | `getStats`, `getMarkets` | OK | Paginación y filtro `status`; `getMarkets` normaliza `items` y `data.items`. |
| Detalle mercado | `market-page-client.tsx` | `getMarket`, `getMarketPredictions`, on-chain `getMarket`, `getUserStake` | OK | `chainIdForContract = market.on_chain_market_id ?? id`; predictions usan `market.id`. |
| Crear mercado | `markets/create/page.tsx` | `createMarketBackend`, `registerPrivateMarket` | OK | Body alineado con backend; private register con `PrivateMarketRegisterRequest`. |
| Posiciones | `positions/page.tsx` | `getMarkets`, on-chain `getUserStake` | OK | Outcome preferido on-chain; claim usa `on_chain_market_id ?? market.id`; error guard con Retry. |
| Señales | `signals-dashboard.tsx` | `fetchSource` | OK | Finnhub requiere `FINNHUB_API_KEY`; UI muestra mensaje cuando no está configurado. |
| Join privado | `join-private-market-card.tsx` | `validatePrivateMarketKey` → GET `/api/markets/private/access?key=` | OK | Mensaje 404 amigable: "Invalid or expired access key...". Backend valida longitud de key (≤64). |
| Footer health | `footer.tsx` | `checkHealth` → `fetch("/health")` | OK | Proxy en next.config.js; no usa `getBaseUrl()`. |
| Árbol condicional | `conditional-tree.tsx` | `getMarketConditions`, `getMarket` | OK | Endpoints y tipos alineados. |
| Market stream | `use-market-stream.ts` | GET `/api/markets/:id/stream` (SSE) | OK | Router y handler presentes. |

---

## 2. Contrato API (frontend lib/api.ts vs backend router + models)

| Función FE | Método | Path | Body/Query | Estado |
|------------|--------|------|------------|--------|
| `getStats` | GET | `/api/markets/stats` | — | OK |
| `getMarkets` | GET | `/api/markets` | page, limit, status | OK; normaliza `items` y `data`. |
| `getMarket` | GET | `/api/markets/:id` | — | OK; backend devuelve MarketView con `on_chain_market_id`. |
| `getMarketPredictions` | GET | `/api/markets/:id/predictions` | — | OK; backend devuelve `Vec<PredictionView>`. |
| `createMarketBackend` | POST | `/api/markets` | question, close_time, resolve_time, market_type?, metadata?, on_chain_market_id? | OK |
| `getHybridPrediction` | POST | `/api/predict/hybrid` | body | OK |
| `getMarketAIAnalysis` | POST | `/api/markets/:id/ai/analysis` | sentiment_text?, binance_symbol? | OK |
| `getReputation` | GET | `/api/reputation/:address` | — | OK |
| `getMarketConditions` | GET | `/api/markets/:id/conditions` | — | OK |
| `fetchSource` | GET | `/api/sources/fetch` | source + params | OK |
| `checkHealth` | GET | `/health` | — | OK (proxy) |
| `getFeedPrice` | GET | `/api/feeds/price` | feed | OK |
| `registerPrivateMarket` | POST | `/api/markets/private/register` | PrivateMarketRegisterRequest | OK |
| `validatePrivateMarketKey` | GET | `/api/markets/private/access` | key (query) | OK |

---

## 3. Tipos frontend vs backend (models.rs)

| Tipo | Coincidencia | Nota |
|------|--------------|------|
| MarketView | OK | Backend incluye `on_chain_market_id` (opcional). |
| PaginatedResponse | OK | items, total, page, limit; backend i64 serializa como number. |
| PredictionView | OK | probability (f32→number), uncertainty, model_version, model_hash?, timestamp. |
| ConditionalConditionView | OK | id, condition_contract, condition_market_id, expected_outcome. |
| FetchResponse | OK | source, price?, price_change_24h?, volume_24h?, sentiment?; backend Option<> → null. |
| FeedPriceResponse | OK | feed, price (i64 raw), price_formatted, decimals, updated_at. |
| PrivateMarketRegisterResponse | OK | access_key, market_id, message. |
| PrivateMarketAccessResponse | OK | market_id, question, close_time, resolve_time, creator. |
| HybridPredictResponse | OK | probability, uncertainty?, market_id?. |
| AIAnalysisResponse | OK | analysis, description (verificar handler ai.rs). |

---

## 4. Errores conocidos y mitigaciones

- **Backend inalcanzable:** `fetchApi` lanza error con mensaje; en local no definir `NEXT_PUBLIC_API_BASE_URL` para usar proxy.
- **Finnhub:** UI muestra mensaje si falta `FINNHUB_API_KEY` en backend.
- **Metadata mercado:** `generateMetadata` en `markets/[id]/page.tsx` usa try/catch y fallback si `getMarket` falla.
- **ID mercado:** En detalle y posiciones, usar `market.on_chain_market_id ?? id` para llamadas al contrato; `market.id` para API de predictions/conditions.

---

## 5. Criterio ID backend vs on-chain

- **URL `/markets/[id]`:** `id` es el ID de backend (tabla markets).
- **Contrato (getMarket, getUserStake):** usar `market.on_chain_market_id ?? id` para que coincida con el ID on-chain cuando el mercado está indexado.
- **API predictions/conditions:** usar `market.id` (siempre ID de backend).

---

## 6. Fase 2 — Endpoints backend verificados

| Endpoint | Código esperado | Tests integración |
|----------|-----------------|-------------------|
| GET /health | 200, ok/status | (implícito en arranque) |
| GET /api/markets/stats | 200, MarketStats | — |
| GET /api/markets | 200, PaginatedResponse | list_markets_returns_paginated |
| GET /api/markets/:id | 200 MarketView / 404 | get_by_id_returns_404_for_nonexistent |
| GET /api/markets/:id/predictions | 200, Vec\<PredictionView\> | get_predictions_returns_empty_for_nonexistent_market |
| POST /api/markets | 201 MarketView | create_market_returns_201_with_valid_body |
| GET /api/markets/private/access?key= | 200 / 404 | private_access_returns_404_for_invalid_key |
| GET /api/sources/fetch | 200 FetchResponse / 400 | sources_fetch_returns_400_for_unknown_source |

Los tests de integración que requieren `DATABASE_URL` (PostgreSQL) se omiten si no está definida. Ejecutar: `cargo test` en `backend-rust/`.

---

## 7. Fase 4 — Subagents (resumen)

**Code reviewer**
- Estado: OK tras corrección. Se corrigió la vista móvil de posiciones para usar `market.on_chain_market_id ?? market.id` en `ActionCell` (antes usaba solo `market.id`).
- Sugerencias opcionales: tener presente que el test de predictions con id inexistente fija el comportamiento 200+[]; el queryKey de predictions usa `market?.id ?? id` (correcto para API).

**Security auditor**
- Hallazgos originales: 0 críticos, 0 altos, 2 medios, 3 bajos.
- **Aplicado (mejoras post-auditoría):**
  - Límites en create market: `metadata` ≤ 10_000 caracteres, `creator` ≤ 100 (`backend-rust/src/services/market.rs`).
  - Límites en register private: `question` ≤ 500, `creator_address` ≤ 100 (`backend-rust/src/api/private_markets.rs`).
  - Límite de longitud en params de `/api/sources/fetch`: `symbol`, `fsym`, `tsym`, `pair` ≤ 64 caracteres (`backend-rust/src/api/sources.rs`).
  - Mensaje genérico para `ExternalApi` en producción: el cliente recibe "External service error"; el detalle solo en logs (`backend-rust/src/error.rs`).
  - Límite global del body: 2 MB mediante `DefaultBodyLimit::max(2 * 1024 * 1024)` en `backend-rust/src/startup.rs`; cuerpos mayores pueden devolver 413.
  - Validación de longitud de `key` en GET `/api/markets/private/access` (≤ 64 caracteres) ya aplicada con anterioridad.
- Pendiente: ninguno de los ítems anteriores; recomendaciones del security-auditor cubiertas.

**Code reviewer (mejoras post-auditoría):** Estado OK. Sugerencias opcionales: aplicar los mismos límites en `create_conditional()` (question, metadata, creator) y validar longitud de `source` en sources/fetch (≤ 64).

**Security auditor (mejoras post-auditoría):** Estado OK. Recomendaciones opcionales: mismos límites en create_conditional; límite de longitud para param `source` en fetch.

---

## 8. Fase 5 — Checklist E2E y documentación

**Checklist E2E (manual o automatizado)**

1. Iniciar backend (`npm run backend` o equivalente) y frontend (`npm run dev`).
2. Sin `NEXT_PUBLIC_API_BASE_URL`: comprobar que el proxy sirve `/health` y `/api/markets`.
3. Dashboard: listado, filtro por status, paginación.
4. Detalle de mercado: carga, predicciones, stake on-chain, bet (si wallet conectada y mercado Open).
5. Crear mercado: flujo completo (on-chain + opcional backend + opcional private register).
6. Posiciones: listado de mercados con stake y claim cuando corresponda (usar `on_chain_market_id` para claim).
7. Señales: al menos una fuente (p. ej. Binance) devuelve datos; Finnhub muestra mensaje si no hay API key.
8. Join private: clave válida e inválida muestran mensaje adecuado (clave inválida → "Invalid or expired access key...").

**Documentación actualizada**

- `docs/architecture.md`: Frontend section documents backend proxy, `FINNHUB_API_KEY` for Signals.
- Este documento (`docs/audit.md`): inventario de flujos, contrato API, endpoints verificados, resumen de subagents y checklist E2E.
- Tests de integración en backend: documentados en § 6; ejecutar `cargo test` en `backend-rust/` (los tests que requieren `DATABASE_URL` se omiten si no está definida para PostgreSQL).
