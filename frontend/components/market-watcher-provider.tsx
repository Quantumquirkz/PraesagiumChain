"use client";

import { useMarketWatcher } from "@/hooks/use-market-watcher";

/**
 * Componente cliente que activa el polling de mercados vigilados.
 * Se monta en el layout global y no renderiza nada visible.
 */
export function MarketWatcherProvider() {
  useMarketWatcher();
  return null;
}
