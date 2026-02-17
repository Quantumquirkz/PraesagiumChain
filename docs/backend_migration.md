# Migración del Backend a Rust

## ¿Por qué Rust?

1. **Rendimiento**: Rust es significativamente más rápido que Node.js, especialmente para operaciones CPU-intensivas como el procesamiento de predicciones.
2. **Seguridad de memoria**: Sin garbage collector, control explícito de memoria, menos bugs de runtime.
3. **Integración directa**: El motor PHPE se usa como librería, sin necesidad de procesos externos o comunicación por stdin/stdout.
4. **Type safety**: El compilador garantiza que los tipos coincidan en toda la aplicación.
5. **Ecosistema unificado**: Todo en Rust (backend + modelo de predicción).

## Estructura del nuevo backend

```
backend-rust/
├── Cargo.toml          # Dependencias: axum, sqlx, praesagium-phpe, etc.
├── migrations/          # Migraciones SQLite
│   └── 001_initial.sql
└── src/
    ├── main.rs          # Punto de entrada, configuración de rutas
    ├── config.rs        # Configuración desde variables de entorno
    ├── error.rs          # Manejo de errores centralizado
    ├── db.rs             # Conexión y migraciones SQLite
    ├── models.rs         # Tipos de datos y requests/responses
    ├── api/              # Handlers de endpoints
    │   ├── mod.rs
    │   ├── markets.rs
    │   └── predictions.rs
    └── services/         # Lógica de negocio
        ├── mod.rs
        ├── market.rs
        └── prediction.rs
```

## Cambios principales

### 1. Framework web: Express → Axum

- Axum es un framework web moderno y performante para Rust.
- Misma estructura de endpoints REST.
- Manejo de errores con `thiserror` y `IntoResponse`.

### 2. Base de datos: JSON/Memory → SQLite

- Persistencia robusta con SQLite.
- Migraciones automáticas con `sqlx`.
- Queries type-safe en tiempo de compilación.

### 3. Integración PHPE: CLI → Librería

**Antes (Node.js)**:
```javascript
const { spawn } = require("child_process");
const child = spawn(CLI_PATH, []);
child.stdin.write(JSON.stringify(timeSeries));
// Leer stdout...
```

**Ahora (Rust)**:
```rust
use praesagium_phpe::{default_context, predict};
let ctx = default_context(&time_series);
let result = predict(&time_series, &ctx);
```

No hay procesos externos, comunicación por pipes, ni parsing de JSON adicional.

### 4. Type safety

Todos los tipos están definidos en `models.rs` y el compilador garantiza que:
- Los requests coincidan con los tipos esperados.
- Los responses sean serializables correctamente.
- Las queries SQL coincidan con los tipos de la base de datos.

## Migración de datos

Si tienes datos en el backend Node.js (JSON), puedes migrarlos:

1. Exportar desde Node.js:
   ```bash
   curl http://localhost:4000/api/markets > markets.json
   ```

2. Importar en Rust (script de migración):
   ```rust
   // Leer markets.json y usar market_service.create_from_chain()
   ```

## Ventajas del nuevo backend

- **Rendimiento**: 10-100x más rápido en operaciones CPU-intensivas.
- **Memoria**: Uso de memoria más predecible y eficiente.
- **Concurrencia**: Tokio permite manejar miles de conexiones simultáneas.
- **Seguridad**: Menos vulnerabilidades por type safety y memory safety.
- **Mantenibilidad**: Código más claro y fácil de mantener con tipos explícitos.

## Próximos pasos

- [ ] Implementar indexador de eventos on-chain con `ethers-rs`.
- [ ] Añadir autenticación/autorización si es necesario.
- [ ] Añadir métricas y observabilidad (Prometheus, tracing).
- [ ] Optimizar queries SQL con índices adicionales si es necesario.
