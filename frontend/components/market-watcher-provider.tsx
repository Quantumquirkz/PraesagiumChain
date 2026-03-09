"use client";

import { useMarketWatcher } from "@/hooks/use-market-watcher";

/**
 * Client component that enables polling for watched markets.
 * Se monta en el layout global y no renderiza nada visible.
 */
export function MarketWatcherProvider() {
  useMarketWatcher();
  return null;
}
