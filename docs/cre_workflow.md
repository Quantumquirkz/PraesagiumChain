# Flujo CRE (Chainlink Request & Execution) en PraesagiumChain

Este documento describe cómo se implementa el flujo CRE de Chainlink para la resolución automática de mercados de predicción.

## Visión General

El flujo CRE permite que los contratos inteligentes soliciten datos externos de forma descentralizada y confiable. En PraesagiumChain, se usa para resolver mercados cuando llega el `resolveTime`.

## Componentes del Flujo

### 1. PredictionMarket.sol

El contrato principal que:
- Define el mercado y sus parámetros (`closeTime`, `resolveTime`)
- Bloquea el mercado cuando se acerca `closeTime` (función `lockMarket()`)
- Expone `resolveMarket(marketId, outcome)` que solo puede llamar el `resolver` autorizado

### 2. CREWorkflow.sol

Contrato puente que:
- Mantiene referencia a `PredictionMarket`
- Solo acepta llamadas del `oracle` autorizado
- Ejecuta `resolveMarket()` cuando recibe el resultado del oráculo

### 3. OracleConsumer.sol

Contrato que:
- Simula el callback de Chainlink Functions/Any API
- Recibe el resultado del oráculo externo
- Reenvía el resultado a `CREWorkflow`

## Flujo Paso a Paso

```
1. Mercado creado → PredictionMarket.createMarket()
   └─> closeTime: tiempo límite para apuestas
   └─> resolveTime: tiempo para resolución

2. Usuarios apuestan → PredictionMarket.placeBet()
   └─> Stakes acumulados en totalYesStake / totalNoStake

3. Cerca de closeTime → CREWorkflow.lockMarket() (o automático)
   └─> Estado cambia a "Locked"
   └─> No se aceptan más apuestas

4. En resolveTime → OracleConsumer.oracleCallback()
   └─> Chainlink Functions ejecuta código off-chain
   └─> Obtiene datos externos (APIs, feeds, etc.)
   └─> Determina resultado: Yes (1) o No (0)

5. OracleConsumer → CREWorkflow.resolveFromOracle()
   └─> Valida que el llamador es el oráculo autorizado
   └─> Llama a PredictionMarket.resolveMarket()

6. PredictionMarket.resolveMarket()
   └─> Valida que el llamador es el resolver autorizado
   └─> Establece el resultado final (Yes/No)
   └─> Estado cambia a "Resolved"
   └─> Emite evento MarketResolved

7. Usuarios reclaman → PredictionMarket.claimPayout()
   └─> Calcula payout proporcional según stakes
   └─> Transfiere fondos a ganadores
```

## Integración con Chainlink

### Chainlink Functions

Para usar Chainlink Functions:

1. **Configurar el contrato OracleConsumer**:
   ```solidity
   // El contrato debe implementar la interfaz de Chainlink Functions
   function fulfillRequest(
       bytes32 requestId,
       bytes memory response,
       bytes memory err
   ) external;
   ```

2. **Enviar request**:
   ```solidity
   // El backend o un contrato auxiliar envía la request
   // Chainlink ejecuta el código JavaScript/Python off-chain
   // El resultado se envía de vuelta a fulfillRequest()
   ```

3. **Procesar respuesta**:
   ```solidity
   function fulfillRequest(...) external {
       // Decodificar response
       uint8 outcome = abi.decode(response, (uint8));
       // Reenviar a CREWorkflow
       creWorkflow.resolveFromOracle(marketId, outcome);
   }
   ```

### Chainlink Any API

Para usar Chainlink Any API:

1. Configurar un job en Chainlink que:
   - Consulte una API externa
   - Transforme los datos
   - Devuelva el resultado al contrato

2. El contrato OracleConsumer recibe el resultado y lo reenvía.

## Seguridad

- **Autorización**: Solo el `resolver` puede resolver mercados
- **Validación de tiempo**: No se puede resolver antes de `resolveTime`
- **Inmutabilidad**: Una vez resuelto, el resultado no puede cambiarse
- **Descentralización**: Chainlink garantiza que los datos son verificables

## Ejemplo de Implementación

```solidity
// En OracleConsumer.sol
function fulfillRequest(
    bytes32 requestId,
    bytes memory response,
    bytes memory err
) external {
    require(err.length == 0, "Oracle error");
    
    // Decodificar resultado (ej: "true" = Yes, "false" = No)
    string memory result = abi.decode(response, (string));
    uint8 outcome = keccak256(bytes(result)) == keccak256(bytes("true")) 
        ? uint8(IPredictionMarket.Outcome.Yes)
        : uint8(IPredictionMarket.Outcome.No);
    
    // Reenviar a CREWorkflow
    creWorkflow.resolveFromOracle(marketId, outcome);
}
```

## Próximos Pasos

- [ ] Implementar integración completa con Chainlink Functions
- [ ] Añadir múltiples oráculos para mayor robustez
- [ ] Sistema de disputas para casos edge
- [ ] Métricas de confiabilidad de oráculos
