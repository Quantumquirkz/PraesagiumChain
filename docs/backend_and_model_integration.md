# Integración Backend y Modelo de Predicción (OBSOLETO)

> ⚠️ Este documento está obsoleto. Ver [backend_integration.md](./backend_integration.md) para la documentación actualizada del backend Rust.

## Flujo de una predicción

1. **Cliente** envía `POST /api/predict` con una serie temporal en el body:
   ```json
   {
     "timeSeries": {
       "timestamps": [1000, 2000, 3000],
       "features": [
         { "values": [0.1, 0.2] },
         { "values": [0.2, 0.3] },
         { "values": [0.15, 0.25] }
       ]
     },
     "marketId": 1
   }
   ```

2. **Backend** (`predictionController.runPredict`):
   - Valida el body.
   - Llama a `predictionRunner.runPrediction(timeSeries)`.

3. **Prediction runner**:
   - Si `PHPE_CLI_PATH` está definido: ejecuta el binario Rust, escribe el JSON de `timeSeries` en stdin y lee el JSON de `PredictionResult` en stdout.
   - Si el binario no existe o falla: devuelve un stub (probabilidad 0.5, incertidumbre 0.25).

4. **Backend**:
   - Si se envió `marketId`, guarda la predicción en el mercado vía `marketService.setPrediction`.
   - Responde con `{ prediction, marketId }`.

## Formato de datos

- **Entrada (TimeSeriesSample)**:
  - `timestamps`: array de enteros (Unix o relativos).
  - `features`: array de objetos `{ values: number[] }`. Todas las filas deben tener la misma longitud.

- **Salida (PredictionResult)**:
  - `probability`: número en [0, 1].
  - `uncertainty`: número en [0, 1].
  - `model_version`: string.
  - `model_hash`: array de 32 bytes (hex o números).

## Compilación del motor Rust

```bash
cd rust-engine
cargo build --release
cargo build --release --bin predict_cli
```

El binario quedará en `target/release/predict_cli`. El backend lo invoca sin argumentos; la entrada/salida es solo stdin/stdout en JSON.

## Próximos pasos

- Añadir autenticación o API key para `POST /api/predict` si se expone públicamente.
- Sustituir el stub por un fallback en JS (por ejemplo, media móvil simple) cuando el CLI no esté disponible.
- Firmar el `PredictionResult` en Rust y verificar la firma en el backend antes de guardar o reenviar on-chain.
