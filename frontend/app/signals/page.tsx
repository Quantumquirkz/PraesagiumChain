"use client";

import { SignalsDashboard } from "@/components/signals-dashboard";

const ASSETS = [
  { symbol: "BTC/USD", binance: "BTCUSDT" },
  { symbol: "ETH/USD", binance: "ETHUSDT" },
];

export default function SignalsPage() {
  return (
    <div className="container py-8 px-4 space-y-8">
      <header>
        <h1 className="font-display font-extrabold text-[36px] text-foreground leading-tight flex items-center gap-3 flex-wrap">
          SEÑALES EN VIVO
          <span className="inline-flex items-center gap-1.5 align-middle">
            <span
              className="h-2.5 w-2.5 rounded-full bg-green animate-pulse"
              style={{ boxShadow: "0 0 8px var(--green)" }}
              aria-hidden
            />
            <span className="font-mono text-sm text-green font-medium">LIVE</span>
          </span>
        </h1>
        <p className="mt-2 font-body text-sm text-text-secondary max-w-xl">
          Monitoreo en tiempo real de las 7 fuentes de datos del motor PHPE. Usa cualquier activo
          directamente como entrada para una predicción híbrida.
        </p>
      </header>

      <div className="space-y-6">
        {ASSETS.map((asset) => (
          <SignalsDashboard key={asset.symbol} symbol={asset.symbol} />
        ))}
      </div>
    </div>
  );
}
