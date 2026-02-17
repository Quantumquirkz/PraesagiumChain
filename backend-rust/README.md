# Backend PraesagiumChain (Rust)

Backend completo en Rust usando Axum, con integración directa del motor PHPE y persistencia SQLite.

## Ventajas sobre Node.js

- **Rendimiento**: Rust es significativamente más rápido y eficiente en memoria.
- **Seguridad**: Sin garbage collector, control de memoria explícito, menos bugs de runtime.
- **Integración directa**: El motor PHPE se usa como librería, sin procesos externos.
- **Type safety**: El compilador garantiza que los tipos coincidan en toda la aplicación.
- **Ecosistema unificado**: Todo en Rust (backend + modelo de predicción).

## Instalación

```bash
cd backend-rust
cargo build --release
```

## Variables de entorno

```bash
PORT=4000
DATABASE_URL=sqlite:./data/markets.db
RPC_URL=http://127.0.0.1:8545  # Opcional: para indexador
PREDICTION_MARKET_ADDRESS=0x...  # Opcional: para indexador
START_BLOCK=0  # Opcional: bloque inicial para indexación
```

## Ejecución

```bash
cargo run --release
```

O con variables de entorno:

```bash
PORT=4000 DATABASE_URL=sqlite:./data/markets.db cargo run --release
```

## API

Mismos endpoints que el backend Node.js:

- `GET /health` — Estado del servicio
- `GET /api/markets` — Lista mercados (query: `page`, `limit`, `status`)
- `GET /api/markets/:id` — Detalle de un mercado
- `POST /api/markets` — Crear mercado
- `PATCH /api/markets/:id/status` — Actualizar estado
- `POST /api/markets/:id/prediction` — Fijar predicción
- `POST /api/predict` — Ejecutar motor PHPE (integración directa, sin CLI)

## Estructura

- `src/main.rs` — Punto de entrada, configuración de rutas
- `src/api/` — Handlers de endpoints
- `src/services/` — Lógica de negocio (mercados, predicciones)
- `src/models.rs` — Tipos de datos y requests/responses
- `src/db.rs` — Conexión y migraciones SQLite
- `migrations/` — Scripts SQL de migración

## Integración con PHPE

El motor PHPE se integra directamente como dependencia en `Cargo.toml`:

```toml
praesagium-phpe = { path = "../rust-engine" }
```

No hay necesidad de procesos externos ni comunicación por stdin/stdout. La función `predict()` se llama directamente desde Rust.
