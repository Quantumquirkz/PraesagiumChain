# Deploy to Sepolia (Testnet)

Guía paso a paso para desplegar los contratos de PraesagiumChain en Sepolia y dejar el stack listo para uso en testnet.

## Requisitos

- Node.js 18+
- Cuenta con ETH de test en Sepolia ([faucet](https://sepoliafaucet.com/))
- Clave privada de la wallet (solo para deploy; **nunca** la subas al repo)

## 1. Configurar variables de entorno

En la **raíz del repo**, copia el ejemplo y edita `.env`:

```bash
cp config/env.example .env
```

Mínimo necesario para deploy en Sepolia:

```env
PRIVATE_KEY=0x...   # clave privada de la wallet que desplegará (con ETH en Sepolia)
SEPOLIA_RPC_URL=https://rpc.sepolia.org
# Opcional; si Sepolia pública va lenta, usa Alchemy/Infura:
# SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY
ETHERSCAN_API_KEY=  # opcional; para verificar contratos en Etherscan
```

## 2. Compilar contratos

```bash
npx hardhat compile
```

## 3. Desplegar contratos principales (PredictionMarket, CRE, Oracle)

```bash
npm run deploy:sepolia
```

Equivalente a `npx hardhat run scripts/deploy/deployWithFunctions.js --network sepolia`. Si no tienes `FUNCTIONS_ROUTER` en `.env`, despliega solo PM + CRE + OracleConsumer (igual que el flujo local).

Salida esperada (ejemplo):

```
Deployer: 0x...
PredictionMarket: 0x...
CREWorkflow: 0x...
OracleConsumer: 0x...
```

Copia las direcciones y añádelas a `.env`:

```env
PREDICTION_MARKET_ADDRESS=0x...
CRE_WORKFLOW_ADDRESS=0x...
ORACLE_CONSUMER_ADDRESS=0x...
RPC_URL=https://rpc.sepolia.org
API_BASE_URL=http://localhost:4000
```

## 4. Desplegar mercados privados (commit-reveal) [opcional]

```bash
npx hardhat run scripts/deploy/deployPrivateMarket.js --network sepolia
```

Añade a `.env`:

```env
PRIVATE_PREDICTION_MARKET_ADDRESS=0x...
PRIVATE_CRE_WORKFLOW_ADDRESS=0x...
PRIVATE_ORACLE_CONSUMER_ADDRESS=0x...
```

## 5. Configurar el frontend para Sepolia

En `.env` (raíz):

```env
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://rpc.sepolia.org
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0x...   # la misma que PREDICTION_MARKET_ADDRESS del paso 3
NEXT_PUBLIC_BLOCK_EXPLORER_URL=https://sepolia.etherscan.io
# Si usas mercados privados:
# NEXT_PUBLIC_PRIVATE_MARKET_ADDRESS=0x...
```

## 6. Backend con Sepolia

Asegúrate de que el backend use la misma red y contrato. En `.env` (raíz):

```env
RPC_URL=https://rpc.sepolia.org
PREDICTION_MARKET_ADDRESS=0x...   # dirección del paso 3
```

Si usas indexer:

```env
START_BLOCK=  # opcional; bloque desde el que indexar
```

## 7. Verificar contratos en Etherscan [opcional]

Con `ETHERSCAN_API_KEY` en `.env`:

```bash
npx hardhat run scripts/verify/verify.js --network sepolia
```

(Asume que el script de verify está preparado para las direcciones desplegadas.)

## Resumen de variables

| Variable | Dónde | Uso |
|----------|--------|-----|
| `PRIVATE_KEY` | `.env` (raíz) | Deploy y scripts Hardhat |
| `PREDICTION_MARKET_ADDRESS` / `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS` | `.env` | Backend indexer + frontend |
| `CRE_WORKFLOW_ADDRESS` / `ORACLE_CONSUMER_ADDRESS` | `.env` | Backend / CRE |
| `NEXT_PUBLIC_CHAIN_ID=11155111` | `.env` | Wallet / red en la UI |

## Troubleshooting

- **"Cannot read properties of undefined (reading 'address')"**  
  Falta `PRIVATE_KEY` en `.env` o está vacía.

- **"insufficient funds"**  
  La wallet no tiene suficiente ETH en Sepolia. Usa un faucet.

- **Timeout en RPC**  
  Usa un RPC propio (Alchemy, Infura) en `SEPOLIA_RPC_URL`.
