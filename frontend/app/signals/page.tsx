"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { PhpeConfidenceGauge } from "@/components/phpe-confidence-gauge";
import { SignalsDashboard } from "@/components/signals-dashboard";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Lista de criptos: símbolo para mostrar, par Binance, nombre
const CRYPTO_LIST: { symbol: string; binance: string; name: string }[] = [
  { symbol: "BTC/USD",  binance: "BTCUSDT",  name: "Bitcoin"    },
  { symbol: "ETH/USD",  binance: "ETHUSDT",  name: "Ethereum"   },
  { symbol: "BNB/USD",  binance: "BNBUSDT",  name: "BNB"        },
  { symbol: "SOL/USD",  binance: "SOLUSDT",  name: "Solana"     },
  { symbol: "XRP/USD",  binance: "XRPUSDT",  name: "XRP"        },
  { symbol: "ADA/USD",  binance: "ADAUSDT",  name: "Cardano"    },
  { symbol: "DOGE/USD", binance: "DOGEUSDT", name: "Dogecoin"   },
  { symbol: "AVAX/USD", binance: "AVAXUSDT", name: "Avalanche"   },
  { symbol: "DOT/USD",  binance: "DOTUSDT",  name: "Polkadot"   },
  { symbol: "MATIC/USD", binance: "MATICUSDT", name: "Polygon"  },
  { symbol: "LINK/USD", binance: "LINKUSDT", name: "Chainlink"  },
  { symbol: "UNI/USD",  binance: "UNIUSDT",  name: "Uniswap"     },
  { symbol: "ATOM/USD", binance: "ATOMUSDT", name: "Cosmos"      },
  { symbol: "LTC/USD",  binance: "LTCUSDT",  name: "Litecoin"    },
  { symbol: "BCH/USD",  binance: "BCHUSDT",  name: "Bitcoin Cash" },
  { symbol: "NEAR/USD", binance: "NEARUSDT", name: "NEAR"        },
  { symbol: "APT/USD",  binance: "APTUSDT",  name: "Aptos"       },
  { symbol: "ARB/USD",  binance: "ARBUSDT",  name: "Arbitrum"    },
  { symbol: "OP/USD",   binance: "OPUSDT",   name: "Optimism"    },
  { symbol: "INJ/USD",  binance: "INJUSDT",  name: "Injective"   },
  { symbol: "SUI/USD",  binance: "SUIUSDT",  name: "Sui"         },
  { symbol: "SEI/USD",  binance: "SEIUSDT",  name: "Sei"         },
  { symbol: "TIA/USD",  binance: "TIAUSDT",  name: "Celestia"    },
  { symbol: "PEPE/USD", binance: "PEPEUSDT", name: "Pepe"        },
  { symbol: "WIF/USD",  binance: "WIFUSDT",  name: "dogwifhat"   },
  { symbol: "FET/USD",  binance: "FETUSDT",  name: "Fetch.ai"    },
  { symbol: "RENDER/USD", binance: "RENDERUSDT", name: "Render"   },
  { symbol: "FIL/USD",  binance: "FILUSDT",  name: "Filecoin"    },
  { symbol: "AAVE/USD", binance: "AAVEUSDT", name: "Aave"        },
];

// ─── Menú de búsqueda de criptos ─────────────────────────────────────────────

function CryptoSearchMenu({
  selected,
  onSelect,
}: {
  selected: { symbol: string; binance: string; name: string };
  onSelect: (c: { symbol: string; binance: string; name: string }) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CRYPTO_LIST;
    return CRYPTO_LIST.filter(
      (c) =>
        c.symbol.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.binance.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="card-glow rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2 w-2 rounded-full bg-cyan"
            style={{ boxShadow: "0 0 8px var(--cyan)" }}
            aria-hidden
          />
          <span className="font-mono text-xs text-text-muted uppercase tracking-widest">
            Buscar cripto
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <Input
            type="search"
            placeholder="Buscar por nombre o símbolo (ej. Bitcoin, ETH, SOLUSDT)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="pl-9 font-mono text-sm"
            aria-label="Buscar criptomonedas"
          />
        </div>

        <div
          className={cn(
            "rounded-xl border border-border bg-elevated overflow-hidden transition-all",
            open || query ? "max-h-[320px] overflow-y-auto" : "max-h-[200px] overflow-y-auto"
          )}
        >
          <ul className="divide-y divide-border" role="listbox" aria-label="Lista de criptomonedas">
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center font-mono text-sm text-text-muted">
                No hay resultados para &quot;{query}&quot;
              </li>
            ) : (
              filtered.map((c) => (
                <li key={c.binance}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected.binance === c.binance}
                    onClick={() => {
                      onSelect(c);
                      setQuery("");
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
                      selected.binance === c.binance
                        ? "bg-cyan-dim border-l-2 border-cyan"
                        : "hover:bg-surface border-l-2 border-transparent"
                    )}
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-sm font-bold text-foreground">{c.symbol}</span>
                      <span className="font-body text-xs text-text-muted ml-2">{c.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-text-muted shrink-0">{c.binance}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <p className="font-mono text-[10px] text-text-muted">
          Seleccionado: <span className="text-foreground font-semibold">{selected.symbol}</span> ({selected.name})
        </p>
      </div>
    </div>
  );
}

// ─── PHPE Overview panel ──────────────────────────────────────────────────────

const STATIC_CONFIDENCE = 0.72;

const ENGINE_STATS = [
  { label: "Active Sources", value: "6",         sub: "data feeds",       color: "var(--cyan)"   },
  { label: "Fusion Method",  value: "Bayesian",  sub: "weighted avg",     color: "var(--violet)" },
  { label: "Update Interval",value: "30s",       sub: "auto-refresh",     color: "var(--green)"  },
  { label: "Model Version",  value: "PHPE v1",   sub: "hybrid ensemble",  color: "var(--violet)" },
] as const;

function PhpeOverviewPanel() {
  return (
    <div className="card-glow rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2 w-2 rounded-full bg-violet animate-pulse"
            style={{ boxShadow: "0 0 8px var(--violet)" }}
            aria-hidden
          />
          <span className="font-mono text-xs text-text-muted uppercase tracking-widest">
            PHPE Engine Status
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-green/30 bg-green-dim px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" aria-hidden />
          <span className="font-mono text-[10px] text-green uppercase tracking-widest">Operational</span>
        </div>
      </div>

      <div className="p-6 flex flex-col lg:flex-row items-center gap-8">
        <div className="shrink-0 flex flex-col items-center gap-3">
          <PhpeConfidenceGauge confidence={STATIC_CONFIDENCE} size={200} />
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" aria-hidden />
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
              Live estimate
            </span>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-3 w-full">
          {ENGINE_STATS.map(({ label, value, sub, color }) => (
            <div
              key={label}
              className="relative rounded-xl border border-border bg-elevated p-4 overflow-hidden group hover:border-border-bright transition-colors"
            >
              <div
                className="pointer-events-none absolute -top-4 -right-4 h-16 w-16 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `radial-gradient(circle, ${color}22 0%, transparent 70%)` }}
                aria-hidden
              />
              <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-2">
                {label}
              </p>
              <p
                className="font-display font-extrabold leading-none"
                style={{
                  fontSize: value.length > 6 ? 18 : 28,
                  color,
                }}
              >
                {value}
              </p>
              <p className="font-mono text-[10px] text-text-muted mt-1">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SignalsPage() {
  const [selectedCrypto, setSelectedCrypto] = useState(CRYPTO_LIST[0]);

  return (
    <div className="container py-10 px-4 space-y-8 max-w-6xl">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="font-display font-extrabold text-[40px] text-foreground leading-tight flex items-center gap-3 flex-wrap">
            LIVE SIGNALS
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full bg-green animate-pulse"
                style={{ boxShadow: "0 0 10px var(--green)" }}
              />
              <span className="font-mono text-sm text-green font-medium">LIVE</span>
            </span>
          </h1>
          <p className="mt-2 font-body text-sm text-text-secondary max-w-xl">
            Monitoreo en tiempo real de 6 fuentes PHPE. Busca una cripto y revisa señales e predicción.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {[
            { label: "Sources", value: "6",    color: "var(--cyan)"   },
            { label: "Assets",  value: String(CRYPTO_LIST.length), color: "var(--violet)" },
            { label: "Refresh", value: "30s", color: "var(--green)"  },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-2"
            >
              <span className="font-display font-extrabold text-lg" style={{ color }}>{value}</span>
              <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">{label}</span>
            </div>
          ))}
          <ThemeToggle className="ml-1" />
        </div>
      </header>

      <PhpeOverviewPanel />

      <CryptoSearchMenu selected={selectedCrypto} onSelect={setSelectedCrypto} />

      <SignalsDashboard
        key={selectedCrypto.binance}
        symbol={selectedCrypto.symbol}
        binanceSymbol={selectedCrypto.binance}
      />
    </div>
  );
}
