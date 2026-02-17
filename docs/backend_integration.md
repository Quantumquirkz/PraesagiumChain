# Integración Backend y Modelo de Predicción

Este documento describe cómo el backend Rust y el motor PHPE trabajan juntos en PraesagiumChain.

## Arquitectura de Integración

El backend Rust integra directamente el motor PHPE como una **dependencia de librería**, eliminando la necesidad de procesos externos o comunicación por pipes.

## Flujo de una Predicción

1. **Cliente** envía `POST /api/predict` con una serie temporal:
   ```json
   {
     "time_series": {
       "timestamps": [1000, 2000, 3000],
       "features": [
         { "values": [0.1, 0.2] },
         { "values": [0.2, 0.3] },
         { "values": [0.15, 0.25] }
       ]
     },
     "market_id": 1
   }
   ```

2. **Backend** (`api/predictions.rs`):
   - Valida el request JSON
   - Llama directamente a `prediction_service.run_prediction(&time_series)`

3. **PredictionService** (`services/prediction.rs`):
   ```rust
   pub fn run_prediction(&self, time_series: &TimeSeriesSample) -> PredictionResult {
       let ctx = default_context(time_series);
       predict(time_series, &ctx)
   }
   ```
   - Crea contexto por defecto (o carga uno entrenado)
   - Ejecuta el pipeline completo: normalización → causal → encoder → bayesiano → calibración

4. **Backend**:
   - Si se proporcionó `market_id`, guarda la predicción en la base de datos
   - Responde con `{ prediction, market_id }`

## Ventajas de la Integración Directa

### Antes (Node.js con CLI)

```javascript
const { spawn } = require("child_process");
const child = spawn(CLI_PATH, []);
child.stdin.write(JSON.stringify(timeSeries));
// Leer stdout, parsear JSON...
```

**Problemas**:
- Overhead de procesos
- Serialización/deserialización JSON innecesaria
- Manejo de errores complejo
- Difícil de debuggear

### Ahora (Rust con librería)

```rust
use praesagium_phpe::{default_context, predict};
let ctx = default_context(&time_series);
let result = predict(&time_series, &ctx);
```

**Ventajas**:
- ✅ Sin overhead de procesos
- ✅ Type-safe: el compilador garantiza tipos correctos
- ✅ Integración directa: misma memoria, sin serialización
- ✅ Fácil de debuggear con herramientas Rust estándar
- ✅ Mejor rendimiento: sin I/O entre procesos

## Estructura del Backend

```
backend-rust/
├── src/
│   ├── main.rs              # Servidor Axum
│   ├── api/
│   │   ├── markets.rs       # Endpoints de mercados
│   │   └── predictions.rs   # Endpoint de predicción
│   ├── services/
│   │   ├── market.rs        # Lógica de mercados
│   │   └── prediction.rs    # Integración con PHPE
│   └── models.rs            # Tipos compartidos
└── Cargo.toml               # Dependencia: praesagium-phpe
```

## Uso del Motor PHPE

El motor se usa de dos formas:

### 1. Predicción con Contexto por Defecto

```rust
use praesagium_phpe::{default_context, predict, TimeSeriesSample};

let ctx = default_context(&time_series);
let result = predict(&time_series, &ctx);
```

Útil para MVP y desarrollo.

### 2. Predicción con Contexto Entrenado

```rust
use praesagium_phpe::{PredictionContext, predict};

// Cargar contexto desde archivo o base de datos
let ctx = load_trained_context("model_v1.json")?;
let result = predict(&time_series, &ctx);
```

Para producción con modelos entrenados.

## Persistencia de Predicciones

Las predicciones se guardan en la tabla `predictions`:

```sql
CREATE TABLE predictions (
    id INTEGER PRIMARY KEY,
    market_id INTEGER NOT NULL,
    probability REAL NOT NULL,
    uncertainty REAL,
    model_version TEXT,
    model_hash TEXT,
    timestamp INTEGER NOT NULL
);
```

Esto permite:
- Historial de predicciones por mercado
- Análisis de precisión del modelo
- Trazabilidad de versiones del modelo

## Próximos Pasos

- [ ] Sistema de carga de modelos entrenados desde almacenamiento
- [ ] Caché de predicciones para evitar recálculos innecesarios
- [ ] Métricas de rendimiento del motor PHPE
- [ ] Batch processing para múltiples predicciones simultáneas
