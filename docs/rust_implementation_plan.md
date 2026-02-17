## Plan de Implementación en Rust del Motor PHPE

Este documento concreta cómo implementar en Rust el modelo descrito en `model_design.md`.

---

### 1. Objetivo del crate

Crear un crate Rust (`praesagium_phpe`) que:

- Exponga una API estable:
  - `predict(event_context) -> PredictionResult`
  - `update(model_update) -> ()` (para aprendizaje/ajuste online, si se desea).
- Sea **puro y determinista** en su núcleo:
  - Sin dependencias de red en la lógica de predicción.
  - La IO se hace en capas superiores.
- Sea fácilmente envolvible en:
  - Un binario CLI.
  - Un microservicio (ej. con `axum` o `actix-web`).

---

### 2. Estructura de carpetas propuesta

Crate recomendado dentro del repo:

```text
praesagiumchain/
  rust-engine/
    Cargo.toml
    src/
      lib.rs
      data/
        mod.rs
        types.rs
        pipeline.rs
      causal/
        mod.rs
        dag.rs
        inference.rs
      temporal/
        mod.rs
        encoder.rs
        regimes.rs
      bayesian/
        mod.rs
        head.rs
        ensemble.rs
      calibration/
        mod.rs
        isotonic.rs
        temperature.rs
      integration/
        mod.rs
        api_types.rs
        hashing.rs
        signatures.rs
```

---

### 3. Tipos básicos

- `EventFeatures`:
  - Representa todas las features numéricas/categóricas para un instante.
- `TimeSeriesSample`:
  - Secuencia ordenada en tiempo de `EventFeatures`.
- `PredictionResult`:
  - `probability: f32`
  - `uncertainty: f32`
  - `model_version: String`
  - `model_hash: [u8; 32]`

Estos tipos se definen en `data/types.rs` e `integration/api_types.rs`.

---

### 4. Dependencias sugeridas (no definitivas)

En `rust-engine/Cargo.toml`:

- Numérico y arrays:
  - `ndarray`
  - `ndarray-rand`
- Probabilidad / estadística:
  - `rand`
  - `statrs`
- Calibración y optimización:
  - Propio (implementaciones en Rust puro) o crates ligeros cuando existan.
- Hashing y firmas:
  - `sha2`
  - `ed25519-dalek` (u otra curva adecuada a tu estrategia de firma).

Si decides usar un framework de deep learning:
- `burn` o `tch` (`tch-rs`) como posibles opciones.

---

### 5. Flujo interno de `predict`

Pseudocódigo de la función principal en `lib.rs`:

```rust
pub fn predict(series: &TimeSeriesSample, ctx: &PredictionContext) -> PredictionResult {
    // 1. Normalizar datos
    let normalized = data::pipeline::normalize(series, &ctx.normalization_params);

    // 2. Proyectar al espacio causal (extraer C)
    let causal_state = causal::inference::infer_latents(&normalized, &ctx.causal_graph);

    // 3. Codificar secuencia temporal
    let h_t = temporal::encoder::encode(&normalized, &causal_state, &ctx.temporal_params);

    // 4. Pasar por cabeza bayesiana (ensemble / variational)
    let (p, var) = bayesian::head::predict(&h_t, &ctx.bayesian_params);

    // 5. Calibrar probabilidad
    let p_calibrated = calibration::apply(p, &ctx.calibration_params);

    // 6. Calcular hash de modelo y construir resultado
    let model_hash = integration::hashing::model_hash(&ctx.model_metadata);

    PredictionResult {
        probability: p_calibrated,
        uncertainty: var,
        model_version: ctx.model_metadata.version.clone(),
        model_hash,
    }
}
```

---

### 6. Entrenamiento (offline) vs. inferencia (online)

- **Entrenamiento offline**:
  - Puede vivir en otro binario (`train`) dentro del mismo crate/workspace.
  - Pasos:
    - Leer datasets históricos.
    - Entrenar encoder temporal + cabeza bayesiana.
    - Guardar parámetros en archivos binarios/JSON (weights, normalización, DAG).
    - Calcular parámetros de calibración.

- **Inferencia online**:
  - Usa solamente:
    - Parámetros ya entrenados cargados en memoria.
    - Lógica determinista de `predict`.
  - No realiza backpropagation ni reentrenamiento.

---

### 7. Versionado y hashing del modelo

En `integration/hashing.rs`:

- Definir una estructura `ModelMetadata` con:
  - `version: String`
  - `trained_on: String` (por ejemplo, rango temporal o snapshot de datos).
  - `dag_version: String`
  - `weights_checksum: [u8; 32]`

- La función `model_hash`:
  - Serializa `ModelMetadata` de forma canónica (ej. JSON ordenado de manera determinista).
  - Aplica SHA-256.
  - Devuelve `[u8; 32]`.

Este hash es el que se envía/almacena on-chain.

---

### 8. Integración con smart contracts

A nivel de Rust:

- En `integration/api_types.rs`, definir estructuras que reflejen los datos que espera/proporciona el contrato:
  - `OnChainPredictionPayload`:
    - `market_id: u64`
    - `probability_bps: u16` (probabilidad en basis points, 0–10000)
    - `uncertainty_bps: u16`
    - `model_version: String`
    - `model_hash: [u8; 32]`
    - `timestamp: u64`

- Firme el payload:
  - `SignedPayload` con `signature: [u8; 64]`.

En Solidity:

- Definir una función que reciba estos datos y:
  - Verifique la firma con una clave pública específica del motor PHPE.
  - Registre la predicción y la versión del modelo.

---

### 9. Estrategia de pruebas

- **Pruebas unitarias**:
  - Sobre módulos puros (normalización, DAG, encoder con inputs simples).
  - Comprobar propiedades de calibración en un dataset sintético.

- **Pruebas de integración**:
  - Pipeline de `predict` completo con datos simulados.
  - Comparar resultados con expected basados en scripts de referencia (ej. en Python).

- **Pruebas de regresión**:
  - Fijar semillas y snapshots de datos.
  - Garantizar que nuevas versiones del código no rompen resultados históricos sin motivo justificado.

---

### 10. Próximos pasos específicos en Rust

1. Crear el workspace y el crate `rust-engine` según la estructura propuesta.
2. Implementar:
   - Tipos básicos (`EventFeatures`, `TimeSeriesSample`, `PredictionResult`).
   - Módulo de normalización simple.
   - Módulo de hashing de metadatos.
3. Añadir un primer encoder temporal sencillo (ej. red feedforward sobre ventanas fijas), como MVP.
4. Extender el encoder hacia arquitecturas más sofisticadas (Transformer/SSM) y añadir la capa bayesiana.

