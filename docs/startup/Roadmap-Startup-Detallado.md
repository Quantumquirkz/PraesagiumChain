# Roadmap Startup Praesagium Chain

> **Versión**: 1.0  
> **Fecha**: Marzo 2026  
> **Equipo**: 2 personas  
> **Objetivo**: Convertir Praesagium Chain en una startup competitiva con Polymarket

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Estado Actual del Proyecto](#estado-actual-del-proyecto)
3. [Fase 0: Preparación Legal y Estructura](#fase-0-preparación-legal-y-estructura-semanas-1-4)
4. [Fase 1: Hardening Técnico](#fase-1-hardening-técnico-semanas-1-8)
5. [Fase 2: Producto Competitivo](#fase-2-producto-competitivo-semanas-5-16)
6. [Fase 3: Go-to-Market](#fase-3-go-to-market-semanas-12-24)
7. [Fase 4: Tokenomics y Financiamiento](#fase-4-tokenomics-y-financiamiento-semanas-16-32)
8. [Fase 5: Launch y Scaling](#fase-5-launch-y-scaling-semanas-24-52)
9. [Proyecciones Financieras](#proyecciones-financieras)
10. [Templates Legales](#templates-legales)
11. [Guía de Skills de Cursor](#guía-de-skills-de-cursor)
12. [Recursos y Referencias](#recursos-y-referencias)

---

## Resumen Ejecutivo

### Visión

Praesagium Chain será el primer mercado de predicción que ofrece **incertidumbre calibrada** (no solo probabilidad, sino confianza), **resolución trustless** via Chainlink CRE, y **mercados privados** para uso empresarial.

### Propuesta de Valor Única

| Diferenciador | Descripción | Competidor más cercano |
|---------------|-------------|------------------------|
| **PHPE Engine** | Probabilidad ± incertidumbre (ej: "65% ±12%") | Ninguno |
| **Multi-Oracle** | 7+ fuentes de datos con consensus | Polymarket (solo UMA) |
| **Mercados Privados** | Commit-reveal con TEE | Ninguno |
| **Tokenización NFT** | ERC-721 por mercado + ERC-1155 posiciones | Ninguno |

### Timeline de 52 Semanas

```
Fase 0: Legal/Estructura     [████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]
Fase 1: Hardening Técnico    [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]
Fase 2: Producto Competitivo [░░░░████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]
Fase 3: Go-to-Market         [░░░░░░░░░░░░████████████████░░░░░░░░░░░░░░░░░░░░░░░░]
Fase 4: Tokenomics/Funding   [░░░░░░░░░░░░░░░░████████████████░░░░░░░░░░░░░░░░░░░░]
Fase 5: Launch/Scale         [░░░░░░░░░░░░░░░░░░░░░░░░████████████████████████████]
                              S1-4    S5-8   S9-16  S17-24 S25-32 S33-40 S41-52
```

---

## Estado Actual del Proyecto

### Inventario de Componentes

| Componente | Estado | Completado | Notas |
|------------|--------|------------|-------|
| **Smart Contracts** | ✅ Funcional | 80% | 7 contratos en Sepolia |
| **Backend Rust** | ✅ Funcional | 95% | 67 rutas API, PHPE engine |
| **Frontend Next.js** | ✅ Funcional | 90% | Dashboard, markets, positions |
| **CRE Workflows** | ✅ Funcional | 100% | Standard + Confidential |
| **Tests** | ⚠️ Parcial | 30% | Necesita expansión |
| **Documentación** | ✅ Completa | 90% | README, docs/, ADRs |
| **CI/CD** | ✅ Funcional | 80% | GitHub Actions |

### Contratos Desplegados (Sepolia)

| Contrato | Dirección | Verificado |
|----------|-----------|------------|
| PredictionMarket | `0xf2397b5827860b361427240d1D1F6F89e9bF197f` | ✅ |
| CREWorkflow | `0x3724BD048C11f50e01900061D8D50022A7c890c7` | ✅ |
| OracleConsumer | `0x153D088Eabb57b021503Aa1192F511B14e8819D8` | ✅ |

### Gaps Críticos vs Polymarket

| Gap | Impacto | Prioridad | Esfuerzo |
|-----|---------|-----------|----------|
| Orderbook/AMM | Sin liquidez bootstrap | P0 | 3-4 semanas |
| ERC-1155 Posiciones | Sin mercado secundario | P1 | 2 semanas |
| Mobile App | Alcance limitado | P2 | 4-6 semanas |
| Fiat On-ramp | Fricción onboarding | P2 | 1 semana |

---

## Fase 0: Preparación Legal y Estructura (Semanas 1-4)

### 0.1 Análisis de Jurisdicciones

| Jurisdicción | Ventajas | Desventajas | Costo Setup | Tiempo |
|--------------|----------|-------------|-------------|--------|
| **Malta** | Framework MiFID II, acceso EU, legitimidad | Restricciones ESMA retail | €15K-30K | 4-8 semanas |
| **Dubai (DMCC)** | 0% impuestos, crypto-friendly | Sin marco específico | $20K-40K | 2-4 semanas |
| **Dubai (DIFC)** | Regulación financiera robusta | Mayor costo | $50K-100K | 6-12 semanas |
| **BVI** | Simple, bajo costo | Sin legitimidad, dificulta banking | $5K-10K | 1-2 semanas |
| **Singapur** | Hub fintech, MAS framework | Restricciones gambling | $15K-25K | 4-8 semanas |

**Recomendación para equipo de 2**: **Dubai DMCC** (balance costo/velocidad/legitimidad)

### 0.2 Estructura Corporativa Recomendada

```
┌─────────────────────────────────────────────────────────────┐
│                    ESTRUCTURA CORPORATIVA                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │         Praesagium Labs Ltd (Dubai DMCC)            │   │
│   │         ══════════════════════════════════          │   │
│   │         • Operating company                         │   │
│   │         • Emplea al team                            │   │
│   │         • Contratos con terceros                    │   │
│   │         • IP holder (código, marca)                 │   │
│   └──────────────────────┬──────────────────────────────┘   │
│                          │                                   │
│            ┌─────────────┴─────────────┐                    │
│            │                           │                    │
│   ┌────────▼────────┐       ┌──────────▼──────────┐        │
│   │  Protocol DAO   │       │  Praesagium         │        │
│   │  (On-chain)     │       │  Foundation         │        │
│   │  ═══════════    │       │  (Cayman/BVI)       │        │
│   │  • Governance   │       │  ═══════════════    │        │
│   │  • Treasury     │       │  • Token holder     │        │
│   │  • Parámetros   │       │  • Grants program   │        │
│   └─────────────────┘       │  • Ecosystem fund   │        │
│                             └─────────────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 0.3 Checklist Legal

#### Semana 1-2: Fundación

- [ ] Seleccionar jurisdicción final
- [ ] Contratar agente de formación (ej: Virtuzone Dubai, CSB Group Malta)
- [ ] Preparar documentos de incorporación
- [ ] Abrir cuenta bancaria corporativa (Relay, Mercury, o banco local)

#### Semana 2-3: Compliance

- [ ] Contratar asesor legal crypto ($5K-15K retainer)
  - **Recomendados**: 
    - Malta: Ganado Advocates, WH Partners
    - Dubai: BSA Ahmad Bin Hezeem, Al Tamimi
- [ ] Redactar Terms of Service
- [ ] Redactar Privacy Policy (GDPR compliant)
- [ ] Definir política KYC/AML (opcional para v1)

#### Semana 3-4: Protección

- [ ] Registrar marca "Praesagium" (WIPO, USPTO, EUIPO)
- [ ] Implementar geo-blocking para jurisdicciones restringidas
- [ ] Documentar risk disclosures
- [ ] Setup seguro de multi-sig para treasury

### 0.4 Jurisdicciones a Bloquear (Geo-blocking)

| País/Región | Razón | Implementación |
|-------------|-------|----------------|
| USA | CFTC requiere DCM license | IP block + wallet check |
| UK | FCA restricciones gambling | IP block |
| Francia | AMF restricciones | IP block |
| Países sancionados | OFAC compliance | IP + wallet screening |

**Implementación técnica**:
```typescript
// middleware/geo-block.ts
const BLOCKED_COUNTRIES = ['US', 'UK', 'FR', 'KP', 'IR', 'CU', 'SY'];

export function geoBlockMiddleware(req: Request) {
  const country = req.headers.get('CF-IPCountry');
  if (BLOCKED_COUNTRIES.includes(country)) {
    return new Response('Service not available in your region', { status: 451 });
  }
}
```

---

## Fase 1: Hardening Técnico (Semanas 1-8)

### 1.1 Auditoría de Seguridad

#### Checklist Pre-Auditoría (Semana 1-2)

| Categoría | Check | Estado Actual | Acción |
|-----------|-------|---------------|--------|
| Reentrancy | Checks-Effects-Interactions | ✅ ReentrancyGuard | Ninguna |
| Access Control | Role-based (RBAC) | ⚠️ Solo onlyOwner | Implementar roles |
| Oracle Security | Multi-source validation | ✅ 7 fuentes | Ninguna |
| Integer Safety | Solidity 0.8+ | ✅ Built-in | Ninguna |
| Front-running | Commit-reveal | ✅ PrivateMarket | Ninguna |
| Upgradeability | Proxy pattern | ❌ No implementado | Evaluar necesidad |
| Gas Optimization | Efficient storage | ⚠️ Parcial | Optimizar |
| Event Emission | Proper indexing | ✅ Implementado | Ninguna |

#### Preparación de Auditoría (Semana 3-4)

```bash
# Generar documentación para auditores
npx hardhat docgen

# Ejecutar análisis estático
slither contracts/ --print human-summary

# Generar reporte de coverage
npx hardhat coverage
```

#### Selección de Auditor

**Para presupuesto limitado ($25K-50K)**:

| Opción | Tipo | Costo | Timeline | Pros | Contras |
|--------|------|-------|----------|------|---------|
| **Code4rena** | Competitive | $25K-40K | 2-4 sem | Múltiples ojos, bugs graves | Puede no cubrir todo |
| **Sherlock** | Competitive | $30K-50K | 2-3 sem | Coverage garantizado | Más caro |
| **Hacken** | Traditional | $20K-35K | 2-3 sem | Económico | Menos prestigio |

**Proceso de contratación**:
1. Solicitar cotización a 2-3 auditores
2. Preparar scope document (contratos, líneas de código)
3. Firmar NDA y contrato
4. Entregar codebase + documentación
5. Responder preguntas durante auditoría
6. Recibir reporte, remediar findings
7. Re-audit de fixes
8. Publicar reporte final

### 1.2 Testing Exhaustivo

#### Objetivos de Coverage

| Componente | Actual | Objetivo | Prioridad |
|------------|--------|----------|-----------|
| Contratos | 5 tests | 50+ tests | P0 |
| Backend API | 14 tests | 100+ tests | P0 |
| PHPE Engine | 4 tests | 30+ tests | P1 |
| Frontend | 0 tests | 30+ tests | P1 |

#### Plan de Testing por Semana

**Semana 1-2: Contratos**

```bash
# Instalar Foundry para fuzzing
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Estructura de tests
test/
├── unit/
│   ├── PredictionMarket.t.sol      # Unit tests básicos
│   ├── PrivatePredictionMarket.t.sol
│   └── TokenizedMarket.t.sol
├── integration/
│   ├── MarketLifecycle.t.sol       # Flujo completo
│   └── OracleResolution.t.sol
├── fuzz/
│   ├── BetAmounts.t.sol            # Fuzzing de montos
│   └── Timestamps.t.sol            # Fuzzing de tiempos
└── invariants/
    └── MarketInvariants.t.sol      # Invariantes globales
```

**Semana 3-4: Backend**

```bash
# Agregar proptest para property-based testing
cargo add proptest --dev

# Estructura de tests
backend-rust/tests/
├── api/
│   ├── markets_test.rs
│   ├── predictions_test.rs
│   └── auth_test.rs
├── services/
│   ├── phpe_test.rs
│   └── hybrid_predictor_test.rs
└── integration/
    └── full_flow_test.rs
```

**Semana 5-6: Frontend E2E**

```bash
# Instalar Playwright
cd frontend
npm install -D @playwright/test
npx playwright install

# Estructura de tests
frontend/e2e/
├── markets.spec.ts        # Listar, filtrar mercados
├── betting.spec.ts        # Flujo de apuesta
├── positions.spec.ts      # Ver posiciones, claim
└── wallet.spec.ts         # Conexión de wallet
```

### 1.3 Implementar Gaps Técnicos

#### 1.3.1 AMM para Liquidez (P0) - Semanas 5-8

**Diseño**: Uniswap V2-style bonding curve para cada mercado

```solidity
// contracts/LiquidityPool.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract LiquidityPool is ReentrancyGuard {
    IERC20 public collateral;
    
    // Reserves for YES and NO tokens
    uint256 public reserveYes;
    uint256 public reserveNo;
    
    // Constant product formula: x * y = k
    uint256 public k;
    
    // LP token tracking
    mapping(address => uint256) public lpShares;
    uint256 public totalShares;
    
    // Fee: 0.3% (30 basis points)
    uint256 public constant FEE_BPS = 30;
    
    function addLiquidity(uint256 amount) external nonReentrant returns (uint256 shares) {
        // Transfer collateral
        collateral.transferFrom(msg.sender, address(this), amount);
        
        // Mint equal YES/NO tokens
        uint256 mintAmount = amount / 2;
        
        if (totalShares == 0) {
            shares = amount;
            reserveYes = mintAmount;
            reserveNo = mintAmount;
        } else {
            shares = (amount * totalShares) / (reserveYes + reserveNo);
            reserveYes += mintAmount;
            reserveNo += mintAmount;
        }
        
        lpShares[msg.sender] += shares;
        totalShares += shares;
        k = reserveYes * reserveNo;
    }
    
    function swap(bool buyYes, uint256 amountIn) external nonReentrant returns (uint256 amountOut) {
        uint256 fee = (amountIn * FEE_BPS) / 10000;
        uint256 amountInAfterFee = amountIn - fee;
        
        if (buyYes) {
            // Buy YES: send collateral, receive YES tokens
            // New reserveNo = reserveNo + amountInAfterFee
            // New reserveYes = k / newReserveNo
            uint256 newReserveNo = reserveNo + amountInAfterFee;
            uint256 newReserveYes = k / newReserveNo;
            amountOut = reserveYes - newReserveYes;
            
            reserveNo = newReserveNo;
            reserveYes = newReserveYes;
        } else {
            // Buy NO: similar logic inverted
            uint256 newReserveYes = reserveYes + amountInAfterFee;
            uint256 newReserveNo = k / newReserveYes;
            amountOut = reserveNo - newReserveNo;
            
            reserveYes = newReserveYes;
            reserveNo = newReserveNo;
        }
        
        collateral.transferFrom(msg.sender, address(this), amountIn);
        // Transfer outcome tokens to user (implementation depends on token design)
    }
    
    function getPrice() external view returns (uint256 yesPrice, uint256 noPrice) {
        uint256 total = reserveYes + reserveNo;
        yesPrice = (reserveNo * 1e18) / total;  // Price in basis points
        noPrice = (reserveYes * 1e18) / total;
    }
}
```

#### 1.3.2 ERC-1155 Posiciones (P1) - Semanas 7-8

```solidity
// contracts/PositionToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract PositionToken is ERC1155, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // Token ID encoding: marketId (160 bits) | outcome (8 bits) | reserved (88 bits)
    // outcome: 0 = YES, 1 = NO
    
    constructor() ERC1155("https://api.praesagium.io/positions/{id}.json") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    function mint(
        address to,
        uint256 marketId,
        bool isYes,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) {
        uint256 tokenId = encodeTokenId(marketId, isYes);
        _mint(to, tokenId, amount, "");
    }
    
    function burn(
        address from,
        uint256 marketId,
        bool isYes,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) {
        uint256 tokenId = encodeTokenId(marketId, isYes);
        _burn(from, tokenId, amount);
    }
    
    function encodeTokenId(uint256 marketId, bool isYes) public pure returns (uint256) {
        return (marketId << 96) | (isYes ? 0 : 1);
    }
    
    function decodeTokenId(uint256 tokenId) public pure returns (uint256 marketId, bool isYes) {
        marketId = tokenId >> 96;
        isYes = (tokenId & 0xFF) == 0;
    }
    
    function supportsInterface(bytes4 interfaceId)
        public view override(ERC1155, AccessControl) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

---

## Fase 2: Producto Competitivo (Semanas 5-16)

### 2.1 Features por Prioridad

#### Semanas 5-8: Liquidez y Trading

| Feature | Descripción | Archivos a modificar |
|---------|-------------|---------------------|
| AMM Pool | Constant product market maker | `contracts/LiquidityPool.sol` (nuevo) |
| Position Tokens | ERC-1155 transferibles | `contracts/PositionToken.sol` (nuevo) |
| Price Oracle | Precio desde AMM | `backend-rust/src/services/price.rs` |
| UI Trading | Swap interface | `frontend/components/swap-form.tsx` |

#### Semanas 9-12: UX Competitiva

| Feature | Descripción | Archivos a modificar |
|---------|-------------|---------------------|
| Categorías | Crypto, Política, Deportes, etc. | `frontend/app/markets/page.tsx`, `backend-rust/src/api/markets.rs` |
| Activity Feed | Apuestas recientes | `frontend/components/activity-feed.tsx` (nuevo) |
| Leaderboards | Top traders | `backend-rust/src/api/leaderboard.rs` (nuevo) |
| Notificaciones | Push + Email | `backend-rust/src/services/notifications.rs` (nuevo) |
| Search | Filtros avanzados | `frontend/components/search-filters.tsx` |

#### Semanas 13-16: Diferenciación

| Feature | Descripción | Archivos a modificar |
|---------|-------------|---------------------|
| PHPE Dashboard | Visualización incertidumbre | `frontend/app/signals/page.tsx` |
| API Pública | OpenAPI/Swagger | `backend-rust/src/api/openapi.rs` (nuevo) |
| Embeds | Widgets para terceros | `frontend/components/embed/` (nuevo) |

### 2.2 Sistema de Categorías

```typescript
// frontend/lib/categories.ts
export const MARKET_CATEGORIES = {
  CRYPTO: {
    id: 'crypto',
    name: 'Cryptocurrency',
    icon: 'bitcoin',
    subcategories: ['Bitcoin', 'Ethereum', 'Altcoins', 'DeFi', 'NFTs']
  },
  POLITICS: {
    id: 'politics',
    name: 'Politics',
    icon: 'landmark',
    subcategories: ['US Elections', 'World Leaders', 'Policy', 'Geopolitics']
  },
  SPORTS: {
    id: 'sports',
    name: 'Sports',
    icon: 'trophy',
    subcategories: ['Football', 'Basketball', 'Soccer', 'Tennis', 'Esports']
  },
  TECH: {
    id: 'tech',
    name: 'Technology',
    icon: 'cpu',
    subcategories: ['AI', 'Companies', 'Products', 'Science']
  },
  ENTERTAINMENT: {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'film',
    subcategories: ['Movies', 'TV Shows', 'Music', 'Awards']
  },
  CLIMATE: {
    id: 'climate',
    name: 'Climate & Weather',
    icon: 'cloud-sun',
    subcategories: ['Temperature', 'Natural Disasters', 'Policy']
  }
} as const;
```

### 2.3 Activity Feed

```typescript
// frontend/components/activity-feed.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'bet' | 'resolution' | 'claim';
  marketId: string;
  marketTitle: string;
  user: string; // truncated address
  amount: string;
  outcome: 'yes' | 'no';
  timestamp: number;
}

export function ActivityFeed() {
  const { data: activities } = useQuery({
    queryKey: ['activities'],
    queryFn: () => fetch('/api/activities?limit=20').then(r => r.json()),
    refetchInterval: 10000, // Refresh every 10s
  });

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Recent Activity</h3>
      <div className="space-y-1">
        {activities?.map((activity: Activity) => (
          <div key={activity.id} className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {activity.user}
            </span>
            <span>
              bet <span className="font-medium">{activity.amount}</span> on
            </span>
            <span className={activity.outcome === 'yes' ? 'text-green-500' : 'text-red-500'}>
              {activity.outcome.toUpperCase()}
            </span>
            <span className="text-muted-foreground">
              · {formatDistanceToNow(activity.timestamp * 1000, { addSuffix: true })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Fase 3: Go-to-Market (Semanas 12-24)

### 3.1 Estrategia de Crecimiento

#### Lecciones de Polymarket

| Táctica | Qué funcionó | Implementación Praesagium |
|---------|--------------|---------------------------|
| Screenshot Marketing | Logo visible en toda captura | Watermark sutil en UI, OG images branded |
| Founder-Led | Shayne Coplan muy activo en X | Founders postean 3-5x/día en X |
| Low Friction | Browse sin wallet | Modo "view only" sin conectar wallet |
| Event-Driven | Elecciones 2024 → $3.3B volume | Mercados de eventos trending |
| Media Funnel | Embeds en sitios de noticias | API de embeds + partnerships media |

#### Calendario de Eventos 2026

| Mes | Evento | Mercados a crear |
|-----|--------|------------------|
| Abril | Earnings Season Q1 | AAPL, GOOGL, MSFT earnings beats |
| Mayo | Bitcoin Halving Anniversary | BTC price targets |
| Junio | World Cup Qualifiers | Soccer outcomes |
| Julio | Fed Rate Decisions | Rate hike/cut predictions |
| Agosto | Olympics 2028 Prep | Medal predictions |
| Septiembre | iPhone Launch | Sales/reception predictions |
| Octubre | Q3 Earnings | Tech earnings |
| Noviembre | US Midterms | Political outcomes |
| Diciembre | Year-End | Crypto price EOY |

### 3.2 Community Building

#### Plataformas y Roles

| Plataforma | Propósito | Target Size (6 meses) |
|------------|-----------|----------------------|
| **Discord** | Comunidad core, soporte, feedback | 1,000 members |
| **Telegram** | Announcements, alerts | 2,000 subscribers |
| **X/Twitter** | Growth, engagement, content | 5,000 followers |
| **Farcaster** | Crypto natives, builders | 500 followers |

#### Programa de Incentivos

```
┌─────────────────────────────────────────────────────────────┐
│                 EARLY ADOPTER PROGRAM                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TIER 1: Beta Testers (First 100 users)                     │
│  ├── 0.5% of token supply reserved                          │
│  ├── Exclusive Discord role                                 │
│  └── Direct feedback channel with team                      │
│                                                              │
│  TIER 2: Bug Bounty                                         │
│  ├── Critical: $5,000 - $25,000                             │
│  ├── High: $1,000 - $5,000                                  │
│  ├── Medium: $500 - $1,000                                  │
│  └── Low: $100 - $500                                       │
│                                                              │
│  TIER 3: Content Creators                                   │
│  ├── Video reviews: $500 - $2,000                           │
│  ├── Written tutorials: $200 - $500                         │
│  └── Social threads: $50 - $200                             │
│                                                              │
│  TIER 4: Liquidity Providers                                │
│  ├── LP rewards: 2% APY bonus first 3 months               │
│  └── Boosted allocation for large LPs                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Content Strategy

#### Contenido Semanal

| Día | Tipo | Ejemplo |
|-----|------|---------|
| Lunes | Market Spotlight | "Esta semana: Bitcoin Halving Anniversary" |
| Martes | PHPE Insights | "Por qué ETH a $5K tiene 62% ±8% probabilidad" |
| Miércoles | Tutorial | "Cómo usar mercados privados" |
| Jueves | Industry News | "Oracle attack en Polymarket: por qué importa" |
| Viernes | Weekly Recap | "Top 5 mercados de la semana" |
| Sábado | Community Highlight | "Trader de la semana: @user" |
| Domingo | AMA/Spaces | "Ask Me Anything con los founders" |

### 3.4 Partnerships Estratégicos

#### Tier 1: Críticos

| Partner | Objetivo | Beneficio | Cómo contactar |
|---------|----------|-----------|----------------|
| **Chainlink** | Credibilidad oracle | Co-marketing, grants | BUILD Program application |
| **Polygon/Base** | Deployment support | Grants, technical support | BD contact via Discord |

#### Tier 2: Importantes

| Partner | Objetivo | Beneficio |
|---------|----------|-----------|
| Data Providers | Más fuentes | CoinGecko API, Sports APIs |
| DeFi Protocols | Composabilidad | Aave, Compound integration |
| Wallets | Distribution | Phantom, MetaMask listing |

#### Tier 3: Nice-to-Have

| Partner | Objetivo | Beneficio |
|---------|----------|-----------|
| Media | Distribución | Embed deals con crypto media |
| Influencers | Awareness | Sponsored content |
| Exchanges | Listings | CEX listings para token |

---

## Fase 4: Tokenomics y Financiamiento (Semanas 16-32)

### 4.1 Token Design: $PRAE

#### Especificaciones

| Parámetro | Valor |
|-----------|-------|
| Nombre | Praesagium Token |
| Símbolo | PRAE |
| Standard | ERC-20 |
| Supply Total | 100,000,000 (fixed) |
| Decimals | 18 |
| Inflación | 0% (no minting) |

#### Distribución

```
┌─────────────────────────────────────────────────────────────┐
│                    TOKEN DISTRIBUTION                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ████████████████████████████████████████  100%            │
│                                                              │
│   ███████                                    15% Team        │
│   ████████████                               20% Investors   │
│   █████████████████                          25% Community   │
│   █████████████████                          25% Treasury    │
│   ██████                                     10% Liquidity   │
│   ███                                         5% Reserve     │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Detalle:
├── Team & Advisors (15%):     15,000,000 PRAE
│   └── 4-year vesting, 1-year cliff, monthly unlock
│
├── Investors (20%):           20,000,000 PRAE
│   ├── Pre-seed (5%):         12-month vesting, 6-month cliff
│   ├── Seed (10%):            18-month vesting, 6-month cliff
│   └── Strategic (5%):        24-month vesting, 12-month cliff
│
├── Community (25%):           25,000,000 PRAE
│   ├── Airdrop (10%):         Beta users, early adopters
│   ├── Rewards (10%):         Trading rewards, referrals
│   └── Contributors (5%):     Grants, bounties
│
├── Treasury/DAO (25%):        25,000,000 PRAE
│   └── Governance-controlled, 2-year linear unlock
│
├── Liquidity (10%):           10,000,000 PRAE
│   └── DEX pools, market making
│
└── Reserve (5%):               5,000,000 PRAE
    └── Emergency, unforeseen partnerships
```

#### Utilidad del Token

| Utilidad | Descripción | Mecanismo |
|----------|-------------|-----------|
| **Staking** | Stake PRAE para recibir 80% de fees | Revenue sharing |
| **Governance** | Votar en parámetros del protocolo | On-chain voting |
| **Discounts** | Holders obtienen fees reducidos | Tier-based: 10%, 25%, 50% |
| **Resolution** | Stake para participar en disputas | Slashing si incorrecto |
| **Access** | Mercados premium solo para holders | Token gating |

#### Mecanismos de Valor

```
Fee Flow:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Trading   │ ──► │  Platform   │ ──► │  Fee Split  │
│   Volume    │     │   Fees      │     │             │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         │                     │                     │
                         ▼                     ▼                     ▼
                  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
                  │   Stakers   │       │  Treasury   │       │   Buyback   │
                  │    (80%)    │       │   (15%)     │       │    (5%)     │
                  └─────────────┘       └─────────────┘       └─────────────┘

Buyback Trigger:
IF price < 20% below 30-day MA THEN activate buyback
```

### 4.2 Fundraising Strategy

#### Rounds Planificados

| Round | Target | Valoración | Dilución | Timeline | Uso de Fondos |
|-------|--------|------------|----------|----------|---------------|
| **Pre-seed** | $750K | $7.5M pre | 10% | Semanas 16-20 | Auditoría ($40K), Legal ($30K), Runway 6 meses |
| **Seed** | $3M | $20M pre | 15% | Semanas 28-36 | Team (2-3 hires), Marketing, Mainnet |
| **Series A** | $8M | $50M pre | 16% | Mes 12-18 | Scaling, Mobile, Expansion |

#### Investor Targets

**Pre-seed Angels** ($25K-100K checks):
- Crypto founders (Hayden Adams, Stani Kulechov, etc.)
- DeFi builders con track record
- Prediction market enthusiasts

**Seed VCs** ($500K-2M checks):

| VC | Por qué | Cómo contactar |
|----|---------|----------------|
| Framework Ventures | DeFi focus, active | vance@framework.ventures |
| Variant Fund | Consumer crypto | Apply via website |
| Polychain | Infrastructure | bd@polychain.capital |
| Blockchain Capital | Early stage DeFi | via portfolio intro |

**Strategic** ($100K-500K):
- Chainlink ecosystem fund
- Polygon Ventures
- Coinbase Ventures

#### Pitch Deck Structure

```
Slide 1: Title
─────────────────
Praesagium: Prediction Markets with Calibrated Confidence
[Logo] [Tagline: "Know not just the odds, but how sure you can be"]

Slide 2: Problem
─────────────────
• Oracle manipulation ($7M Polymarket attack, March 2025)
• No uncertainty metrics (users don't know confidence)
• No privacy for enterprise forecasting
[Visual: Polymarket screenshot vs ours]

Slide 3: Solution
─────────────────
• PHPE: Probability + Uncertainty band
• Chainlink CRE: Multi-source oracle network
• TEE Markets: Private predictions
[Visual: Architecture diagram]

Slide 4: Product Demo
─────────────────
[Screenshot of live product]
• Working MVP on Sepolia testnet
• 7 data sources integrated
• PHPE engine operational

Slide 5: Market Size
─────────────────
• $44B prediction market volume 2025
• Growing 50%+ YoY
• TAM: $100B+ (includes traditional forecasting)
[Chart: Market growth]

Slide 6: Traction
─────────────────
• Contracts deployed on Sepolia (verified)
• Backend: 67 API endpoints, 95% complete
• Frontend: Full trading UI
• Hackathon participation
[Metrics if available]

Slide 7: Business Model
─────────────────
• Trading fees: 1% of volume
• Premium features: Private markets (B2B)
• API access: Data/predictions
[Revenue projections chart]

Slide 8: Competition
─────────────────
| Feature | Us | Polymarket | Kalshi |
|---------|-----|------------|--------|
| Uncertainty | ✅ | ❌ | ❌ |
| Multi-oracle | ✅ | ❌ | ❌ |
| Private | ✅ | ❌ | ❌ |
[Differentiation matrix]

Slide 9: Team
─────────────────
[Founder 1]: [Background]
[Founder 2]: [Background]
[Advisors if any]

Slide 10: Roadmap
─────────────────
Q2 2026: Mainnet launch (Polygon)
Q3 2026: Token launch, multi-chain
Q4 2026: Mobile app, B2B pilot
2027: Series A, global expansion

Slide 11: The Ask
─────────────────
Raising: $750K Pre-seed
Valuation: $7.5M pre-money
Use: Audit ($40K), Legal ($30K), 6 months runway
[Contact info]
```

---

## Fase 5: Launch y Scaling (Semanas 24-52)

### 5.1 Mainnet Launch Checklist

#### Pre-Launch (Semanas 24-28)

- [ ] Auditoría completada y publicada
- [ ] Bug bounty program activo ($50K-200K pool)
- [ ] Multi-sig configurado (Gnosis Safe, 3/5)
- [ ] Monitoring setup (Tenderly alerts, Forta bots)
- [ ] Incident response plan documentado
- [ ] Legal terms finalizados y publicados
- [ ] Community de 500+ members

#### Launch Day

- [ ] Deploy contratos a mainnet (Polygon)
- [ ] Verificar contratos en Polygonscan
- [ ] Seed liquidez inicial ($50K-100K)
- [ ] Crear 5-10 mercados iniciales (trending topics)
- [ ] Announcement thread en X
- [ ] Discord announcement
- [ ] Press release a crypto media

#### Post-Launch (Semanas 29-32)

- [ ] Monitor métricas 24/7 primera semana
- [ ] Hotfixes si necesario
- [ ] Community AMA
- [ ] First trading competition
- [ ] Analytics review (qué funciona, qué no)

### 5.2 Multi-chain Expansion

| Red | Timeline | Razón | Esfuerzo |
|-----|----------|-------|----------|
| **Polygon** | Launch | Bajo gas, alta adopción | Baseline |
| **Base** | Mes 2 | Coinbase ecosystem | 1 semana |
| **Arbitrum** | Mes 3 | DeFi hub | 1 semana |
| **Optimism** | Mes 4 | Grants available | 1 semana |
| **Ethereum** | Mes 6+ | Prestigio | 2 semanas |

### 5.3 KPIs y Métricas

#### Dashboard de Métricas

| Métrica | Definición | Target 3M | Target 6M | Target 12M |
|---------|------------|-----------|-----------|------------|
| **Volume** | Total traded (USD) | $100K | $1M | $10M |
| **TVL** | Total locked in markets | $50K | $500K | $2M |
| **MAU** | Monthly active users | 100 | 500 | 2,000 |
| **Markets** | Active markets | 10 | 50 | 200 |
| **Resolution Rate** | % resolved correctly | 95% | 98% | 99% |
| **PHPE Brier** | Prediction accuracy | Track | <0.20 | <0.15 |
| **Retention** | 30-day retention | 20% | 35% | 50% |
| **NPS** | Net Promoter Score | 30 | 50 | 60 |

#### Alertas Críticas

| Alerta | Trigger | Acción |
|--------|---------|--------|
| Volume drop | <50% vs previous day | Investigate, check competitors |
| TVL drop | <30% in 24h | Check for exploits, market conditions |
| Resolution dispute | Any disputed resolution | Manual review, escalation |
| Smart contract error | Any revert spike | Pause, investigate |
| API errors | >1% error rate | Debug, scale |

---

## Proyecciones Financieras

### 5-Year Revenue Model

#### Assumptions

| Parámetro | Valor | Fuente |
|-----------|-------|--------|
| Trading fee | 1% of volume | Industry standard |
| Market creation fee | $10 flat | Comparable to Polymarket |
| Premium subscription | $50/month | B2B estimate |
| API access | $0.001/request | Market rate |

#### Proyecciones

```
Year 1 (Post-Launch):
├── Volume: $10M annually
├── Trading fees: $100K
├── Market creation: $5K (500 markets)
├── Premium: $0 (no B2B yet)
├── API: $0 (free tier)
├── Total Revenue: $105K
├── Costs: $300K (team, infra, legal)
├── Net: -$195K (burning runway)

Year 2:
├── Volume: $100M
├── Trading fees: $1M
├── Market creation: $20K
├── Premium: $50K (B2B pilot)
├── API: $10K
├── Total Revenue: $1.08M
├── Costs: $800K (expanded team)
├── Net: +$280K (break-even zone)

Year 3:
├── Volume: $500M
├── Trading fees: $5M
├── Market creation: $50K
├── Premium: $200K
├── API: $50K
├── Total Revenue: $5.3M
├── Costs: $2M
├── Net: +$3.3M (profitable)

Year 4:
├── Volume: $1B
├── Trading fees: $10M
├── Other: $1M
├── Total Revenue: $11M
├── Net: +$6M

Year 5:
├── Volume: $3B
├── Trading fees: $30M
├── Other: $5M
├── Total Revenue: $35M
├── Net: +$20M
```

### Burn Rate y Runway

| Fase | Monthly Burn | Runway (con $750K) |
|------|--------------|-------------------|
| Pre-Launch | $15K | 50 meses |
| Post-Launch | $30K | 25 meses |
| Growth Mode | $60K | 12.5 meses |

**Nota**: Seed round ($3M) extiende runway a 24+ meses en growth mode.

---

## Templates Legales

### Template: Terms of Service (Outline)

```
PRAESAGIUM TERMS OF SERVICE

Last Updated: [DATE]

1. ACCEPTANCE OF TERMS
   - By using Praesagium, you agree to these Terms
   - Must be 18+ years old
   - Must not be in restricted jurisdiction

2. DESCRIPTION OF SERVICE
   - Prediction market platform
   - Non-custodial (user controls funds)
   - Smart contract based

3. USER RESPONSIBILITIES
   - Accurate information
   - Secure wallet management
   - Compliance with local laws
   - No market manipulation

4. RISKS AND DISCLAIMERS
   - Financial risk (can lose funds)
   - Smart contract risk
   - Regulatory risk
   - No guarantees of returns

5. PROHIBITED ACTIVITIES
   - Manipulation
   - Money laundering
   - Use from restricted jurisdictions
   - Exploiting bugs (must report)

6. INTELLECTUAL PROPERTY
   - Praesagium owns platform IP
   - User content license

7. PRIVACY
   - Reference to Privacy Policy
   - Data collection disclosure

8. LIMITATION OF LIABILITY
   - Maximum liability = user's deposited amount
   - No liability for smart contract bugs
   - No liability for third-party services

9. DISPUTE RESOLUTION
   - Arbitration clause
   - Governing law (jurisdiction)

10. MODIFICATIONS
    - Right to modify terms
    - Notice period (30 days)

11. CONTACT
    - Support email
    - Legal contact
```

### Template: Privacy Policy (Outline)

```
PRAESAGIUM PRIVACY POLICY

1. INFORMATION WE COLLECT
   - Wallet addresses (public)
   - Transaction data (public on blockchain)
   - IP addresses (for geo-blocking)
   - Device information (analytics)

2. HOW WE USE INFORMATION
   - Provide services
   - Compliance (geo-blocking)
   - Analytics (aggregate, anonymized)
   - Communications (if opted in)

3. INFORMATION SHARING
   - No sale of personal data
   - Service providers (hosting, analytics)
   - Legal requirements

4. BLOCKCHAIN DATA
   - Transactions are public
   - Cannot be deleted
   - User responsibility

5. COOKIES AND TRACKING
   - Essential cookies
   - Analytics (opt-out available)
   - No advertising cookies

6. DATA RETENTION
   - As required by law
   - Blockchain data is permanent

7. YOUR RIGHTS
   - Access
   - Correction
   - Deletion (where possible)
   - Opt-out of communications

8. SECURITY
   - Encryption
   - Access controls
   - Regular audits

9. INTERNATIONAL TRANSFERS
   - Data may be processed globally
   - Standard contractual clauses

10. UPDATES
    - Notice of material changes
    - Continued use = acceptance
```

### Template: Contributor Agreement (Outline)

```
PRAESAGIUM CONTRIBUTOR LICENSE AGREEMENT

1. DEFINITIONS
   - "Contribution" = code, documentation, etc.
   - "Project" = Praesagium platform

2. GRANT OF LICENSE
   - Contributor grants perpetual, worldwide license
   - Right to use, modify, distribute contributions
   - Sublicensable

3. REPRESENTATIONS
   - Contributor has right to grant license
   - No third-party claims
   - Original work

4. NO OBLIGATION
   - Project not obligated to use contribution
   - No compensation unless separately agreed

5. ACKNOWLEDGMENT
   - Contribution may be used commercially
   - May be open-sourced

Signature: _____________
Date: _____________
```

---

## Guía de Skills de Cursor

### Cómo Usar Skills en Este Proyecto

#### Desarrollo Blockchain

**Phantom Connect** (Wallet Integration)

```
Ubicación: ~/.cursor/plugins/cache/cursor-public/phantom-connect/.../skills/phantom-connect/SKILL.md

Uso: Cuando necesites integrar conexión de wallet
Comando: "Read skill phantom-connect and implement wallet connection"

Ejemplo de uso:
1. Abrir Cursor
2. Invocar: "@skill phantom-connect implement social login"
3. El skill guiará la implementación de Google/Apple login
```

**Aplicaciones en el roadmap**:
- Fase 2, Semana 9-12: Integrar social login para reducir fricción
- Mobile app: Usar `setup-react-native-app` skill

#### Infraestructura

**Cloudflare Workers**

```
Ubicación: ~/.cursor/plugins/cache/cursor-public/cloudflare/.../skills/workers-best-practices/SKILL.md

Uso: Deploy de backend serverless
Comando: "Read skill workers-best-practices and optimize deployment"

Ejemplo:
1. Para notifications service: usar Workers + Queues
2. Para API caching: usar Workers + KV
3. Para real-time: usar Durable Objects
```

**AWS Deploy**

```
Ubicación: ~/.cursor/plugins/cache/cursor-public/deploy-on-aws/.../skills/deploy/SKILL.md

Uso: Si prefieres AWS sobre Cloudflare
Comando: "Read skill deploy and analyze codebase for AWS deployment"
```

#### Bases de Datos

**PostgreSQL Optimization**

```
Ubicación: ~/.cursor/plugins/cache/cursor-public/planetscale/.../skills/postgres/SKILL.md

Uso: Optimizar queries, índices, conexiones
Comando: "Read skill postgres and optimize slow queries"

Aplicación:
- Fase 1: Optimizar queries de mercados
- Fase 2: Índices para búsqueda avanzada
- Fase 5: Scaling de conexiones
```

**ClickHouse Analytics**

```
Ubicación: ~/.cursor/plugins/cache/cursor-public/clickhouse-cursor-plugin/.../skills/clickhouse-best-practices/SKILL.md

Uso: Analytics de alto volumen
Comando: "Read skill clickhouse-best-practices and setup analytics"

Aplicación:
- Fase 3: Tracking de eventos de usuario
- Fase 5: Dashboard de métricas
```

#### Testing y CI/CD

**Fix CI**

```
Ubicación: ~/.cursor/plugins/cache/cursor-public/cursor-team-kit/.../skills/fix-ci/SKILL.md

Uso: Cuando CI falla
Comando: "Read skill fix-ci and resolve failing tests"
```

**Smoke Tests**

```
Ubicación: ~/.cursor/plugins/cache/cursor-public/cursor-team-kit/.../skills/run-smoke-tests/SKILL.md

Uso: Configurar E2E tests con Playwright
Comando: "Read skill run-smoke-tests and setup E2E testing"

Aplicación:
- Fase 1, Semana 5-6: Setup inicial
- Fase 5: Tests antes de cada deploy
```

#### Analytics de Usuarios

**Amplitude**

```
Ubicación: ~/.cursor/plugins/cache/cursor-public/amplitude/.../skills/

Skills disponibles:
- analyze-dashboard: Analizar métricas
- create-chart: Crear visualizaciones
- discover-opportunities: Encontrar mejoras
- daily-brief: Resumen diario

Aplicación:
- Fase 3: Tracking de conversión
- Fase 5: Análisis de retención
```

### Workflow Recomendado

```
Para cada tarea del roadmap:

1. Identificar skill relevante (ver tabla arriba)
2. Leer el skill: "@skill [nombre]"
3. Seguir instrucciones del skill
4. Usar MCP tools si disponibles
5. Verificar con lint/tests

Ejemplo completo:

Tarea: Implementar notificaciones (Fase 2, Semana 11)

1. "@skill cloudflare read workers-best-practices"
2. Diseñar arquitectura con Queues
3. Implementar worker de notificaciones
4. "@skill postgres optimize notification queries"
5. Test y deploy
```

---

## Recursos y Referencias

### Documentación Técnica

| Recurso | URL | Uso |
|---------|-----|-----|
| OWASP Smart Contract Security | https://scs.owasp.org/checklists/ | Pre-auditoría |
| Rust Web3 Best Practices | https://medium.com/@onchana01/best-practices-for-optimizing-rust-code-in-web3 | Backend optimization |
| Tokio Async Patterns | https://tokio.rs/tokio/tutorial | Async Rust |
| Hardhat Documentation | https://hardhat.org/docs | Contract testing |
| Foundry Book | https://book.getfoundry.sh/ | Fuzzing |

### Legal y Compliance

| Recurso | URL | Uso |
|---------|-----|-----|
| Prediction Markets Regulation | https://legalbison.com/blog/prediction-market-license-types-regulatory-guide/ | Jurisdicción |
| Malta Gaming Authority | https://www.mga.org.mt/ | Malta licensing |
| DMCC Setup | https://www.dmcc.ae/set-up-a-company | Dubai incorporation |

### Tokenomics

| Recurso | URL | Uso |
|---------|-----|-----|
| PRDT Whitepaper | https://prdt.finance/whitepaper.pdf | Modelo de referencia |
| Polymarket Revenue | https://www.revenuememo.com/p/how-does-polymarket-make-money | Business model |
| Token Vesting | https://vestlab.io/ | Vesting management |

### Growth Strategy

| Recurso | URL | Uso |
|---------|-----|-----|
| Web3 MVP Guide | https://www.23stud.io/blog/web3-founder-guide-mvp-development-concept-to-community | Launch strategy |
| Polymarket Growth | https://growthcurve.co/technical-growth-strategy-for-prediction-markets | GTM tactics |
| 10 Launch Mistakes | https://www.blockmm.ai/articles/db/10-biggest-mistakes-web3-projects-make-at-launch | Avoid pitfalls |

### Herramientas

| Herramienta | URL | Uso |
|-------------|-----|-----|
| Gnosis Safe | https://safe.global/ | Multi-sig |
| Tenderly | https://tenderly.co/ | Monitoring |
| Forta | https://forta.org/ | Security bots |
| Dune Analytics | https://dune.com/ | On-chain analytics |

---

## Checklist Final por Fase

### Fase 0 Checklist

- [ ] Jurisdicción seleccionada
- [ ] Entidad legal registrada
- [ ] Cuenta bancaria abierta
- [ ] Asesor legal contratado
- [ ] Terms of Service redactados
- [ ] Privacy Policy redactada
- [ ] Geo-blocking implementado

### Fase 1 Checklist

- [ ] Auditoría contratada
- [ ] Tests de contratos >80% coverage
- [ ] Tests de backend >80% coverage
- [ ] Tests E2E frontend
- [ ] AMM implementado
- [ ] ERC-1155 posiciones implementado
- [ ] Auditoría completada
- [ ] Fixes de auditoría implementados

### Fase 2 Checklist

- [ ] Sistema de categorías
- [ ] Activity feed
- [ ] Leaderboards
- [ ] Notificaciones
- [ ] Dashboard PHPE mejorado
- [ ] API pública documentada
- [ ] Embeds para terceros

### Fase 3 Checklist

- [ ] Discord con 500+ members
- [ ] Twitter con 2000+ followers
- [ ] Programa de incentivos activo
- [ ] 3+ partnerships confirmados
- [ ] Contenido semanal establecido
- [ ] PR en 2+ crypto media

### Fase 4 Checklist

- [ ] Tokenomics documentados
- [ ] Smart contract de token auditado
- [ ] Deck de inversores completo
- [ ] 3+ meetings con VCs
- [ ] Term sheet firmado
- [ ] Fondos recibidos

### Fase 5 Checklist

- [ ] Mainnet deploy en Polygon
- [ ] Bug bounty activo
- [ ] Multi-sig configurado
- [ ] Monitoring activo
- [ ] 100+ MAU primer mes
- [ ] $100K+ volumen primer mes
- [ ] Expansion a segunda chain

---

*Documento creado: Marzo 2026*  
*Última actualización: Marzo 2026*  
*Versión: 1.0*
