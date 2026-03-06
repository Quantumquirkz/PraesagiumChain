"use client";

import { useChainlinkPrice } from "@/hooks/use-chainlink-price";
import { cn } from "@/lib/utils";

export interface ChainlinkPriceBadgeProps {
  feed?: "ETH_USD" | "BTC_USD";
  className?: string;
}

export function ChainlinkPriceBadge({ feed = "ETH_USD", className }: ChainlinkPriceBadgeProps) {
  const { data, isLoading, isError } = useChainlinkPrice(feed);

  if (isLoading) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-1.5",
          className
        )}
        aria-busy="true"
      >
        <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" aria-hidden />
        <span className="font-mono text-xs text-text-muted">Loading…</span>
      </div>
    );
  }

  if (isError || !data) {
    return null;
  }

  const label = feed === "ETH_USD" ? "ETH/USD" : "BTC/USD";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-green/30 bg-green-dim px-3 py-1.5",
        className
      )}
      title={`Chainlink Data Feed ${label} — on-chain price`}
    >
      <span
        className="h-2 w-2 rounded-full bg-green animate-pulse"
        style={{ boxShadow: "0 0 6px var(--green)" }}
        aria-hidden
      />
      <span className="font-mono text-[10px] text-green uppercase tracking-widest">Chainlink</span>
      <span className="font-mono text-xs font-bold text-foreground">
        {label}: ${data.price_formatted}
      </span>
    </div>
  );
}
