# Arquitectura de PraesagiumChain

Este documento describe la arquitectura de alto nivel de PraesagiumChain.

## Visión General

PraesagiumChain es un sistema de mercados de predicción descentralizados que utiliza:

- **Smart Contracts (Solidity)** para la lógica on-chain de mercados
- **Chainlink CRE** para la resolución automática basada en datos off-chain
- **Motor PHPE (Rust)** para generar predicciones probabilísticas
- **Backend Rust (Axum)** para exponer la API REST e integrar componentes

## Componentes Principales

### 1. Contratos Inteligentes (`contracts/`)

- **`PredictionMarket.sol`**: Contrato principal que gestiona mercados binarios
  - Creación de mercados
  - Apuestas (Yes/No)
  - Resolución y distribución de pagos
  
- **`CREWorkflow.sol`**: Puente entre oráculos y el contrato de mercados
  - Recibe resultados del oráculo
  - Valida y ejecuta la resolución
  
- **`OracleConsumer.sol`**: Consumidor de datos de Chainlink
  - Integración con Chainlink Functions/Any API
  - Callback hacia CREWorkflow

### 2. Motor de Predicción (`rust-engine/`)

**PHPE (Praesagium Hybrid Predictive Engine)** es un modelo híbrido que combina:

- **Capa de datos**: Normalización y preparación de series temporales
- **Capa causal**: Grafo causal dirigido (DAG) para conocimiento experto
- **Capa temporal**: Encoder secuencial para procesar series de tiempo
- **Capa bayesiana**: Ensemble para cuantificar incertidumbre
- **Calibración**: Temperature scaling para probabilidades bien calibradas

Ver [model_design.md](./model_design.md) para detalles.

### 3. Backend (`backend-rust/`)

API REST en Rust que:

- Expone endpoints para gestión de mercados
- Integra directamente el motor PHPE como librería
- Persiste datos en SQLite
- Puede indexar eventos on-chain (opcional)

Ver [backend_integration.md](./backend_integration.md) para detalles.

### 4. Scripts (`scripts/`)

- **Despliegue**: Scripts Hardhat para diferentes redes
- **Pruebas**: Tests unitarios e integración
- **Simulación**: Scripts para simular flujos CRE

## Flujo de Datos

```
1. Usuario crea mercado → PredictionMarket.sol
2. Usuarios apuestan → PredictionMarket.sol (stakes acumulados)
3. Cerca de closeTime → Backend puede generar predicción con PHPE
4. En resolveTime → OracleConsumer recibe datos externos
5. OracleConsumer → CREWorkflow → PredictionMarket.resolveMarket()
6. Usuarios reclaman pagos → PredictionMarket.claimPayout()
```

## Integración On-chain / Off-chain

- **On-chain**: Contratos Solidity gestionan la lógica de mercado y pagos
- **Off-chain**: 
  - Motor PHPE genera predicciones probabilísticas
  - Backend expone API y puede indexar eventos
  - Chainlink proporciona datos externos verificables

## Seguridad

- **Smart Contracts**: Auditable, sin confianza centralizada
- **Motor PHPE**: Determinista, versionado, con hash verificable
- **Backend**: Type-safe (Rust), validación de inputs, manejo de errores robusto

## Próximos Pasos

- [ ] Implementar indexador de eventos on-chain en el backend
- [ ] Integración completa con Chainlink Functions
- [ ] Sistema de versionado y actualización del modelo PHPE
- [ ] Métricas y observabilidad (tracing, métricas Prometheus)
