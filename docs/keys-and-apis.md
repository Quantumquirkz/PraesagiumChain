# Keys, APIs y enlaces — Checklist

**Este proyecto está configurado para Sepolia testnet.** Todas las apuestas y el gas usan **Sepolia ETH** (testnet); no se usa mainnet.

Lista de claves, APIs y URLs que puedes configurar según lo que vayas a usar. Ninguna es obligatoria para arrancar en local; las marcadas como **requerida para X** solo hacen falta si usas esa función.

---

## Raíz del proyecto (`.env`)

| Variable | ¿Para qué? | Dónde conseguirla | ¿Obligatoria? |
|----------|------------|-------------------|----------------|
| **PRIVATE_KEY** | Deploy de contratos y scripts Hardhat en Sepolia | Tu wallet (MetaMask: Export Private Key). **Nunca la subas al repo.** | Sí, para `npm run deploy` / `deploy-markets-onchain.js` en Sepolia |
| **GEMINI_API_KEY** | PHPE / predicciones con IA (sentiment) | [Google AI Studio](https://aistudio.google.com/api-keys) | No; si no la pones, usa `AI_PROVIDER=mock` |
| **HF_API_KEY** | Sentiment con Hugging Face en lugar de Gemini | [Hugging Face](https://huggingface.co/settings/tokens) | No; alternativa a Gemini |
| **SEPOLIA_RPC_URL** | RPC para Hardhat (deploy/scripts) en Sepolia | Por defecto `https://rpc.sepolia.org`. Para más estabilidad: [Alchemy](https://www.alchemy.com/), [Infura](https://infura.io/) | No; el default suele bastar |
| **ETHERSCAN_API_KEY** | Verificar contratos en Etherscan | [Etherscan API Keys](https://etherscan.io/myapikey) | No; solo para verificación |
| **API_FOOTBALL_KEY** | Resolución de mercados deportivos (`/api/sources` sports) | [API-Football](https://www.api-football.com/) | No; solo si usas mercados deportivos |
| **FINNHUB_API_KEY** | Fuente Finnhub en Signals / sources | [Finnhub](https://finnhub.io/register) | No; solo si usas esa fuente |
| **FUNCTIONS_ROUTER** | Chainlink Functions (deploy con Functions) | Docs de Chainlink | Solo si usas `deployWithFunctions.js` |

---

## Frontend (variables `NEXT_PUBLIC_*` en `.env` raíz)

| Variable | ¿Para qué? | Dónde conseguirla | ¿Obligatoria? |
|----------|------------|-------------------|----------------|
| **NEXT_PUBLIC_CHAIN_ID** | Red de la wallet (11155111 = Sepolia) | Fijo: `11155111` para Sepolia | Sí, para que coincida con tu red |
| **NEXT_PUBLIC_RPC_URL** | RPC que usa la wallet en el navegador | RPC pública: `https://rpc.sepolia.org`. O Alchemy/Infura si quieres tu propio endpoint | Sí, para leer contrato y enviar txs |
| **NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS** | Dirección del contrato PredictionMarket | La que salga de `npx hardhat run scripts/deploy/deployLocal.js --network sepolia` | Sí, para apostar y ver mercados on-chain |
| **NEXT_PUBLIC_BLOCK_EXPLORER_URL** | Enlaces “Ver en Etherscan” | `https://sepolia.etherscan.io` | No; mejora la UX |
| **NEXT_PUBLIC_PRIVATE_MARKET_ADDRESS** | Mercados privados (commit-reveal) | Salida de `deployPrivateMarket.js` | No; solo si usas mercados privados |
| **NEXT_PUBLIC_API_BASE_URL** | Llamadas del navegador al backend | Normalmente vacío en local (usa proxy). En producción: URL de tu API | No en local |

**RPC pública (sin API key):**  
Puedes usar `NEXT_PUBLIC_RPC_URL=https://rpc.sepolia.org` y no hace falta Infura ni Alchemy. Si quieres menos fallos o límites, crea un proyecto en [Alchemy](https://dashboard.alchemy.com/) o [Infura](https://infura.io/) y pega la URL de Sepolia.

---

## CRE (Chainlink Runtime Environment) — `cre/.env`

| Variable | ¿Para qué? | Dónde | ¿Obligatoria? |
|----------|------------|--------|----------------|
| **CRE_ETH_PRIVATE_KEY** | Firma en la red que use el nodo CRE | Wallet dedicada para CRE (64 caracteres hex) | Solo si ejecutas flujos CRE locales |

---

## Enlaces útiles

- **Sepolia faucet:** https://sepoliafaucet.com/ (o Alchemy/Infura faucet)
- **Etherscan Sepolia:** https://sepolia.etherscan.io
- **Google AI Studio (Gemini):** https://aistudio.google.com/api-keys
- **Alchemy (RPC):** https://dashboard.alchemy.com/
- **Infura (RPC):** https://infura.io/
- **Etherscan API:** https://etherscan.io/myapikey

---

## Mínimo para que funcione

- **Solo frontend + backend en local (sin Sepolia):**  
  Backend con `.env` (sin `PRIVATE_KEY`). Frontend con `NEXT_PUBLIC_CHAIN_ID=31337`, `NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545` y la dirección del contrato desplegado en Hardhat local.

- **Con Sepolia (apostar y desplegar):**  
  `.env` con `PRIVATE_KEY` y, tras deploy, `PREDICTION_MARKET_ADDRESS` y opcionalmente `SEPOLIA_RPC_URL`.  
  `.env` con `NEXT_PUBLIC_CHAIN_ID=11155111`, `NEXT_PUBLIC_RPC_URL=https://rpc.sepolia.org` (o tu Alchemy/Infura) y `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS` igual al contrato desplegado.

- **Predicciones con IA:**  
  En `.env`: `GEMINI_API_KEY` (o `HF_API_KEY`) o `AI_PROVIDER=mock` para no usar clave.
