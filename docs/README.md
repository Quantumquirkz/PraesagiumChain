# Documentación de PraesagiumChain

Esta carpeta contiene toda la documentación técnica del proyecto.

## Estructura

### General

- **[STRUCTURE.md](./STRUCTURE.md)** — Estructura profesional del proyecto y convenciones
- **[architecture.md](./architecture.md)** — Arquitectura de alto nivel del sistema

### Modelo de Predicción

- **[model_design.md](./model_design.md)** — Diseño detallado del motor de predicción PHPE
- **[rust_implementation_plan.md](./rust_implementation_plan.md)** — Plan de implementación en Rust

### Backend

- **[backend_integration.md](./backend_integration.md)** — Integración del backend Rust con el motor PHPE
- **[backend_migration.md](./backend_migration.md)** — Documentación de la migración del backend a Rust
- **[backend_and_model_integration.md](./backend_and_model_integration.md)** — ⚠️ Obsoleto (ver backend_integration.md)

### Chainlink y APIs

- **[cre_workflow.md](./cre_workflow.md)** — Flujo CRE de Chainlink para resolución de mercados
- **[api_references.md](./api_references.md)** — Referencias de APIs externas (Chainlink, etc.)

## Guía rápida

1. **Nuevo en el proyecto**: Empieza con [architecture.md](./architecture.md)
2. **Desarrollando el modelo**: Lee [model_design.md](./model_design.md) y [rust_implementation_plan.md](./rust_implementation_plan.md)
3. **Integrando backend**: Consulta [backend_integration.md](./backend_integration.md)
4. **Trabajando con Chainlink**: Revisa [cre_workflow.md](./cre_workflow.md)
