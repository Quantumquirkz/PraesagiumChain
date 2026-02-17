# Estructura del Proyecto PraesagiumChain

Este documento describe la estructura profesional del repositorio.

## Organización General

```
praesagiumchain/
│
├── contracts/                  # Smart Contracts (Solidity)
│   ├── PredictionMarket.sol   # Contrato principal de mercados
│   ├── CREWorkflow.sol         # Flujo CRE de Chainlink
│   ├── OracleConsumer.sol      # Consumidor de oráculos
│   └── interfaces/
│       └── IPredictionMarket.sol
│
├── backend-rust/               # Backend API (Rust + Axum)
│   ├── src/
│   │   ├── main.rs             # Punto de entrada
│   │   ├── config.rs           # Configuración
│   │   ├── db.rs               # Base de datos SQLite
│   │   ├── models.rs            # Tipos de datos
│   │   ├── error.rs             # Manejo de errores
│   │   ├── api/                 # Handlers de endpoints
│   │   │   ├── markets.rs
│   │   │   └── predictions.rs
│   │   └── services/           # Lógica de negocio
│   │       ├── market.rs
│   │       └── prediction.rs
│   ├── migrations/              # Migraciones SQLite
│   │   └── 001_initial.sql
│   └── Cargo.toml
│
├── rust-engine/                # Motor de Predicción PHPE
│   ├── src/
│   │   ├── lib.rs              # API pública
│   │   ├── data/               # Capa de datos
│   │   │   ├── types.rs
│   │   │   └── pipeline.rs
│   │   ├── causal/             # Capa causal
│   │   │   ├── dag.rs
│   │   │   └── inference.rs
│   │   ├── temporal/           # Capa temporal
│   │   │   ├── encoder.rs
│   │   │   └── regimes.rs
│   │   ├── bayesian/           # Capa bayesiana
│   │   │   └── head.rs
│   │   ├── calibration/         # Calibración
│   │   │   └── temperature.rs
│   │   └── integration/        # Integración on-chain
│   │       ├── api_types.rs
│   │       └── hashing.rs
│   └── Cargo.toml
│
├── scripts/                    # Scripts de desarrollo
│   ├── deploy/                 # Despliegue por red
│   │   ├── deployMainnet.js
│   │   ├── deployPolygon.js
│   │   └── deployLocal.js
│   ├── test/                   # Pruebas
│   │   ├── testPredictionMarket.js
│   │   └── testCREWorkflow.js
│   └── simulateCRE.js          # Simulación CRE
│
├── docs/                       # Documentación técnica
│   ├── README.md                # Índice de documentación
│   ├── STRUCTURE.md             # Este archivo
│   ├── architecture.md          # Arquitectura del sistema
│   ├── model_design.md          # Diseño del modelo PHPE
│   ├── rust_implementation_plan.md
│   ├── backend_integration.md  # Integración backend-PHPE
│   ├── backend_migration.md    # Migración a Rust
│   ├── cre_workflow.md          # Flujo CRE
│   └── api_references.md        # Referencias de APIs
│
├── .github/                    # GitHub Actions
│   └── workflows/
│       └── deploy.yml
│
├── hardhat.config.js           # Configuración Hardhat
├── package.json                # Dependencias del proyecto
├── .gitignore                  # Archivos ignorados
└── README.md                   # Documentación principal
```

## Principios de Organización

### 1. Separación de Responsabilidades

- **`contracts/`**: Lógica on-chain (Solidity)
- **`backend-rust/`**: API REST y servicios off-chain (Rust)
- **`rust-engine/`**: Motor de predicción (Rust, librería)
- **`scripts/`**: Automatización y despliegue
- **`docs/`**: Documentación técnica

### 2. Nomenclatura Consistente

- **Carpetas**: minúsculas con guiones (`backend-rust`, `rust-engine`)
- **Archivos Rust**: snake_case (`market_service.rs`)
- **Archivos Solidity**: PascalCase (`PredictionMarket.sol`)
- **Documentación**: minúsculas (`architecture.md`)

### 3. Estructura Modular

Cada componente principal es independiente:
- `rust-engine/` puede usarse como librería en otros proyectos
- `backend-rust/` depende de `rust-engine/` pero puede funcionar sin él
- `contracts/` son completamente independientes

### 4. Documentación Centralizada

Toda la documentación está en `docs/`:
- `README.md` como índice
- Documentos específicos por tema
- Sin duplicación entre `Docs/` y `docs/`

## Convenciones de Código

### Rust

- **Crates**: `praesagium-phpe`, `praesagium-backend`
- **Módulos**: Organizados por funcionalidad
- **Tests**: En archivos `*_test.rs` o módulos `#[cfg(test)]`

### Solidity

- **Contratos**: Un contrato por archivo
- **Interfaces**: En carpeta `interfaces/`
- **Naming**: PascalCase para contratos, camelCase para funciones

### JavaScript/TypeScript

- **Scripts**: En `scripts/`
- **Config**: `hardhat.config.js`, `package.json`
- **Naming**: camelCase para funciones, PascalCase para clases

## Archivos Eliminados

Los siguientes archivos/carpetas fueron eliminados por estar obsoletos:

- ✅ `backend/` (Node.js) → Migrado a `backend-rust/`
- ✅ `frontend/` → No incluido en el proyecto
- ✅ `rust-engine/src/bin/predict_cli.rs` → Integración directa en backend
- ✅ `Docs/` (mayúscula) → Unificado en `docs/`

## Mantenimiento

Para mantener la estructura profesional:

1. **Nuevos archivos**: Seguir las convenciones de nomenclatura
2. **Documentación**: Añadir a `docs/` con enlaces en `README.md`
3. **Dependencias**: Actualizar `Cargo.toml` o `package.json` según corresponda
4. **Tests**: Añadir tests junto al código que prueban

## Próximos Pasos

- [ ] Añadir tests de integración end-to-end
- [ ] Configurar CI/CD completo en GitHub Actions
- [ ] Añadir métricas y observabilidad
- [ ] Documentar proceso de despliegue
