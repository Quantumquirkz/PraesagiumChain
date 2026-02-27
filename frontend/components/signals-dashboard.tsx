"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, Zap, RefreshCw, Activity } from "lucide-react";
import { fetchSource } from "@/lib/api";
import type { FetchResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignalFusionPanel } from "@/components/signal-fusion-panel";
import { cn } from "@/lib/utils";

interface SourceConfig {
  id: string;
  name: string;
  params: Record<string, string>;
  isSentiment?: boolean;
}

const DEFAULT_SOURCES: SourceConfig[] = [
  { id: "binance", name: "Binance", params: { symbol: "BTCUSDT" } },
  { id: "cryptocompare", name: "CryptoCompare", params: { fsym: "BTC", tsym: "USD" } },
  { id: "kraken", name: "Kraken", params: { pair: "XBTUSD" } },
  { id: "chainlink", name: "Chainlink", params: {} },
  { id: "finnhub", name: "Finnhub", params: { symbol: "BINANCE:BTCUSDT" } },
  { id: "exchangerate", name: "ExchangeRate", params: {} },
];

function PriceArrow({ change }: { change: number | null }) {
  if (change == null) return <Minus className="h-3.5 w-3.5 text-text-muted" />;
  if (change > 0) return <TrendingUp className="h-3.5 w-3.5 text-green-400" />;
  if (change < 0) return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3.5 w-3.5 text-text-muted" />;
}

function SourceRow({
  source,
  data,
  isLoading,
  isError,
}: {
  source: SourceConfig;
  data: FetchResponse | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  const changeColor =
    data?.price_change_24h == null
      ? "text-text-muted"
      : data.price_change_24h > 0
      ? "text-green-400"
      : data.price_change_24h < 0
      ? "text-red-400"
      : "text-text-muted";

  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-elevated">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-elevated">
        <Activity className="h-3.5 w-3.5 text-text-muted" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs font-bold text-foreground">{source.name}</p>
        {source.isSentiment && data?.sentiment != null && (
          <p className="font-mono text-[11px] text-text-muted">
            Sentimiento:{" "}
            <span
              className={cn(
                "font-bold",
                data.sentiment > 0.6
                  ? "text-green-400"
                  : data.sentiment < 0.4
                  ? "text-red-400"
                  : "text-amber-400"
              )}
            >
              {data.sentiment.toFixed(2)}{" "}
              {data.sentiment > 0.6 ? "(positivo)" : data.sentiment < 0.4 ? "(negativo)" : "(neutro)"}
            </span>
          </p>
        )}
      </div>

      <div className="shrink-0 text-right">
        {isLoading && (
          <div className="h-4 w-20 animate-pulse rounded bg-elevated" />
        )}
        {isError && (
          <span className="font-mono text-[11px] text-red-400">Error</span>
        )}
        {!isLoading && !isError && data && (
          <>
            {data.price != null ? (
              <div className="flex items-center gap-1.5 justify-end">
                <span className="font-mono text-sm font-bold text-foreground">
                  ${data.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <PriceArrow change={data.price_change_24h} />
                {data.price_change_24h != null && (
                  <span className={cn("font-mono text-[11px]", changeColor)}>
                    {data.price_change_24h > 0 ? "+" : ""}
                    {data.price_change_24h.toFixed(2)}%
                  </span>
                )}
              </div>
            ) : source.isSentiment ? (
              <span className="font-mono text-[11px] text-text-muted">ver abajo</span>
            ) : (
              <span className="font-mono text-[11px] text-text-muted">—</span>
            )}
          </>
        )}
        {!isLoading && !isError && !data && (
          <span className="font-mono text-[11px] text-text-muted">—</span>
        )}
      </div>
    </div>
  );
}

interface SignalsDashboardProps {
  symbol?: string;
}

export function SignalsDashboard({ symbol = "BTC/USD" }: SignalsDashboardProps) {
  const [fusionOpen, setFusionOpen] = useState(false);

  const results = useQueries({
    queries: DEFAULT_SOURCES.map((source) => ({
      queryKey: ["source", source.id, source.params],
      queryFn: () => fetchSource(source.id, source.params),
      staleTime: 30_000,
      refetchInterval: 30_000,
      refetchIntervalInBackground: false,
      retry: 1,
    })),
  });

  const anyLoading = results.some((r) => r.isLoading);
  const lastUpdated = new Date();

  const binancePrice = results[0]?.data?.price;

  return (
    <div className="rounded-md border border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-cyan" />
          <span className="font-display font-bold text-[13px] tracking-widest text-text-muted uppercase">
            {symbol} — Señales en vivo
          </span>
          {anyLoading && (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-text-muted" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-text-muted">
            Actualiza cada 10s
          </span>
          <Button
            size="sm"
            className="h-7 gap-1.5 bg-cyan text-black hover:bg-cyan/90 border-0 font-mono text-xs"
            onClick={() => setFusionOpen(true)}
          >
            <Zap className="h-3 w-3" />
            Usar para predicción
          </Button>
        </div>
      </div>

      {/* Source rows */}
      <div className="p-2">
        {DEFAULT_SOURCES.map((source, i) => (
          <SourceRow
            key={source.id}
            source={source}
            data={results[i]?.data}
            isLoading={results[i]?.isLoading ?? false}
            isError={results[i]?.isError ?? false}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2">
        <p className="font-mono text-[10px] text-text-muted">
          6 fuentes · última actualización: {lastUpdated.toLocaleTimeString()}
          {binancePrice != null && (
            <span className="ml-3 text-cyan font-bold">
              Ref: ${binancePrice.toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </span>
          )}
        </p>
      </div>

      {/* Modal de fusión */}
      <Dialog open={fusionOpen} onOpenChange={setFusionOpen}>
        <DialogContent className="max-w-md border-border bg-surface">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-base">
              <Zap className="h-5 w-5 text-cyan" />
              Predicción híbrida — {symbol}
            </DialogTitle>
          </DialogHeader>
          <SignalFusionPanel
            defaultParams={{ binanceSymbol: "BTCUSDT" }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
