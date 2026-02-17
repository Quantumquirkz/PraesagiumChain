## Modelo de Predicción de Próxima Generación para PraesagiumChain

Este documento describe un modelo de predicción diseñado específicamente para mercados de predicción descentralizados,
implementable en Rust, y pensado para integrarse con los smart contracts de PraesagiumChain.

No es solo una red neuronal más, sino una **arquitectura híbrida** que combina:

- Aprendizaje profundo secuencial.
- Modelos causales estructurales.
- Inferencia bayesiana para cuantificar incertidumbre.
- Mecanismos de robustez frente a manipulación de datos y señales de mercado.

Lo llamaremos **PHPE: Praesagium Hybrid Predictive Engine**.

---

### 1. Objetivos del modelo

1. **Probabilidades bien calibradas**: El output principal no es una clase, sino una probabilidad \( p \in [0, 1] \) que pueda usarse
   directamente como input para un mercado de predicción o como referencia de precio justo.
2. **Robustez adversarial**: Resistencia a:
   - Datos ruidosos o manipulados (por ejemplo, campañas coordinadas en redes sociales).
   - Cambios de distribución (regímenes de mercado, cambios políticos, noticias inesperadas).
3. **Interpretabilidad estructural**:
   - Capacidad de explicar qué variables/causas tuvieron mayor peso.
   - Poder incorporar conocimiento experto como restricciones causales.
4. **Actualización online**:
   - Actualizar creencias a medida que llegan nuevos datos (streams).
   - Reaccionar rápido a nueva información sin reentrenar todo desde cero.
5. **Compatibilidad on-chain/off-chain**:
   - El modelo se ejecuta off-chain (Rust), pero:
     - Produce _pruebas de integridad_ (hashes, firmas, registros de versión).
     - Se integra con los contratos para registrar parámetros clave y evidencia de no manipulación.

---

### 2. Estructura general del modelo (PHPE)

El modelo PHPE se compone de cuatro capas conceptuales:

1. **Capa de Ingesta y Normalización (Data Layer)**  
   - Une datos heterogéneos:
     - Historial de precios y volumen del mercado de predicción.
     - Datos externos (APIs, noticias, redes sociales, indicadores macro).
     - Features derivadas on-chain (participación, liquidez, distribución de stakes).
   - Estandariza escalas, corrige valores faltantes, y etiqueta el tiempo en un eje único.

2. **Capa Causal-Estadística (Structural Causal Layer)**  
   - Representa el conocimiento experto sobre el dominio como un **Grafo Causal Dirigido (DAG)**.
   - Cada nodo representa una variable relevante (ej. “evento económico X”, “sentimiento de mercado”, “volatilidad”, etc.).
   - Permite:
     - Simular intervenciones \( do(X = x) \).
     - Diferenciar correlación de causalidad siempre que sea posible.

3. **Capa Deep Sequential (Temporal Encoder)**  
   - Modelo secuencial que procesa series temporales:
     - Opción A: Transformer temporal (Temporal Fusion Transformer adaptado).
     - Opción B: Arquitectura basada en **State Space Models (SSM)** moderna (por ejemplo, S4-like) implementada en Rust.
   - Condicionada por:
     - Variables exógenas (desde el grafo causal).
     - Historial de odds/precios del propio mercado.

4. **Capa Bayesiana + Calibration (Uncertainty & Calibration Layer)**  
   - La última capa del modelo no es determinista:
     - Se usa un **ensemble profundo** o **variational Bayesian layer**.
     - Salida: distribución sobre \( p(\text{evento}=1 \mid \text{datos}) \) en lugar de un solo número.
   - Módulo de calibración:
     - Usa técnicas tipo **Temperature Scaling** y **Isotonic Regression** sobre un conjunto de validación.
     - El resultado son probabilidades calibradas que maximizan la consistencia interna (ex: eventos con probabilidad 0.7 se cumplen ~70% de las veces).

---

### 3. Formulación matemática simplificada

Sea:
- \( X_t \): vector de features observadas hasta tiempo \( t \) (datos off-chain y on-chain).
- \( C \): conjunto de variables causales latentes derivadas del grafo (por ejemplo, “estado de política monetaria”, “riesgo geopolítico”).
- \( Y \in \{0, 1\} \): resultado final del evento (ej. “sí” / “no”).

#### 3.1. Grafo causal

El grafo causal define:
\[
P(C, X) = \prod_i P(C_i \mid \text{pa}(C_i)) \prod_j P(X_j \mid \text{pa}(X_j))
\]

Donde \(\text{pa}(\cdot)\) son los padres en el DAG.

#### 3.2. Modelo secuencial condicionado

El encoder temporal produce un embedding \( h_T \) a partir de la secuencia:
\[
h_T = f_\theta((X_1, C_1), \dots, (X_T, C_T))
\]

#### 3.3. Capa bayesiana

La probabilidad del resultado es:
\[
p(Y = 1 \mid X_{1:T}, C_{1:T}) = \mathbb{E}_{w \sim q_\phi(w)}[\sigma(w^\top h_T)]
\]

Donde:
- \( q_\phi(w) \) es una distribución variacional sobre los pesos finales.
- \( \sigma \) es la sigmoide logística.

En implementación práctica:
- Se muestrean varios \( w_k \sim q_\phi(w) \), se obtienen probabilidades \( p_k \), y se promedia:
\[
\hat{p} = \frac{1}{K}\sum_{k=1}^K p_k
\]

Esto da:
- **Media**: probabilidad esperada.
- **Varianza**: medida de incertidumbre epistemica.

---

### 4. Pipeline de entrenamiento

1. **Definición del DAG causal inicial**:
   - Lo define el equipo con expertos de dominio.
   - Se almacena como un grafo dirigido versionado (por ejemplo, en un archivo JSON o toml).

2. **Extracción de datos históricos**:
   - Historial de mercados pasados en PraesagiumChain (cuando existan).
   - Historial de fuentes externas (APIs, indicadores, etc.).

3. **Construcción de features**:
   - Features numéricas (precios, volúmenes, indicadores).
   - Features categóricas/one-hot (tipo de evento, región, categoría temática).
   - Features textuales representadas con embeddings (noticias, posts) opcionalmente precalculados con otro modelo.

4. **Entrenamiento del encoder temporal**:
   - Minimizar una pérdida de entropía cruzada ponderada:
     \[
     \mathcal{L}_{CE} = -\sum_i w_i \left[y_i \log \hat{p}_i + (1-y_i)\log(1-\hat{p}_i)\right]
     \]
   - \( w_i \) puede depender de:
     - Confianza en los datos (calidad de fuente).
     - Importancia económica del evento.

5. **Entrenamiento/ajuste bayesiano + calibración**:
   - Ajustar \( q_\phi(w) \) mediante variational inference o ensemble.
   - Ajustar parámetros de calibración en un set de validación.

6. **Validación con métricas sofisticadas**:
   - **Brier score**.
   - **Log loss**.
   - **Expected Calibration Error (ECE)**.
   - Curvas de confiabilidad: bucketizar predicciones por probabilidad y evaluar frecuencia real.

---

### 5. Robustez y defensa frente a manipulación

PHPE incorpora varias defensas:

1. **Ponderación por fuente**:
   - Cada feature se asocia con un nivel de confianza.
   - Datos on-chain con oráculos verificados tienen más peso que señales sociales débiles.

2. **Detección de outliers y regímenes**:
   - Se incluye un submodelo (por ejemplo, un **HMM** o un **Regime-Switching Model**) que identifica cambios de régimen:
     - “Normal”, “Alta volatilidad”, “Evento extremo”.
   - El encoder temporal se condiciona en el régimen detectado para no sobre-reaccionar a outliers aislados.

3. **Regularización adversarial**:
   - Durante entrenamiento:
     - Se generan versiones perturbadas de la entrada (dentro de un rango razonable).
     - Se penalizan predicciones muy sensibles a pequeñas perturbaciones.

4. **Cuantificación de incertidumbre explícita**:
   - Ante datos contradictorios o escasos:
     - El modelo no fuerza una probabilidad extrema; mantiene alta incertidumbre (alta varianza en \( \hat{p} \)).
   - Esto puede usarse para:
     - Aumentar requisitos de liquidez.
     - Modificar parámetros del mercado (spread, fees) según la confianza.

---

### 6. Integración con PraesagiumChain

El motor PHPE corre off-chain en Rust, pero se integra con los smart contracts de la siguiente forma:

1. **Versión del modelo y hash de parámetros**:
   - Cada versión del modelo tiene:
     - Un identificador (`model_version`).
     - Un hash de los pesos/parametría (`model_hash`).
   - Al publicar predicciones para un mercado:
     - Se almacena en un contrato (por ejemplo, `CREWorkflow` o un contrato auxiliar) `(marketId, model_version, model_hash, prediction, uncertainty, timestamp)`.

2. **Pruebas de integridad**:
   - El servicio de Rust:
     - Firma criptográficamente el payload enviado on-chain (o al oráculo).
   - On-chain:
     - Se valida la firma frente a una clave pública conocida.

3. **Uso de la incertidumbre en el mercado**:
   - El valor de incertidumbre (por ejemplo, varianza o un percentile) puede:
     - Ajustar parámetros de mercado (como fees o multiplicadores).
     - Servir como input para flujos CRE que necesiten evaluar la confianza en un feed de datos.

---

### 7. Implementación conceptual en Rust

Aunque la implementación concreta se detalla en un documento aparte (`rust_implementation_plan.md`),
los principios clave son:

- **Performance y seguridad de memoria**:
  - Uso de crates como `ndarray` para operaciones numéricas, y un backend de autodiferenciación (ej. `burn`, `tch-rs` o un motor propio).
- **Modularidad**:
  - Módulos separados para:
    - `data_ingestion`
    - `causal_graph`
    - `temporal_encoder`
    - `bayesian_head`
    - `calibration`
    - `integration` (APIs, oráculos, smart contracts)
- **Determinismo reproducible**:
  - Control de semillas aleatorias.
  - Versionado explícito del DAG y de los pesos.

---

### 8. Por qué este enfoque es “distinto”

1. **No es solo “un modelo más grande”**:
   - El foco no está en tener más parámetros, sino en:
     - Integrar conocimiento causal.
     - Medir y exponer incertidumbre explícitamente.
     - Diseñar el modelo alrededor de la lógica de un mercado de predicción, no de un benchmark académico genérico.

2. **Preparado para integrarse con DeFi y CRE**:
   - El output está pensado para:
     - Accionar flujos CRE.
     - Alimentar contratos que modulan condiciones económicas on-chain.

3. **Auditable y versionado**:
   - Cada predicción puede trazarse a:
     - Una versión concreta del modelo.
     - Un conjunto de datos de entrenamiento y calibración.
     - Un hash verificable almacenado on-chain.

---

### 9. Próximos pasos

1. Definir un primer DAG causal concreto para un tipo de mercado (por ejemplo, “eventos macroeconómicos”).
2. Especificar el tipo de encoder temporal que se implementará primero (Transformer temporal vs. SSM).
3. Implementar un prototipo en Rust:
   - Capa de datos.
   - Encoder simple.
   - Capa bayesiana aproximada (ensemble pequeño).
4. Integrar la salida con un contrato Solidity de ejemplo para cerrar el ciclo end-to-end.

