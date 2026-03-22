"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getBaseUrl } from "@/lib/api";

/** Event payloads from GET /api/markets/:id/stream (SSE) */
type MarketEvent =
  | { type: "StatusChanged"; market_id: number; status?: string; outcome?: string }
  | { type: "PredictionUpdated"; market_id: number }
  | { type: "OnChainResolved"; market_id: number; outcome?: string }
  | { type: "ResolutionEvaluated"; market_id: number };

/**
 * Subscribes to SSE stream for a market and invalidates React Query cache on events,
 * so the market detail page updates in real time (e.g. resolution, new predictions).
 */
export function useMarketStream(marketId: number | null) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || marketId == null || marketId < 1) return;

    const base = getBaseUrl();
    const url = `${base || ""}/api/markets/${marketId}/stream`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as MarketEvent;
        if (data.market_id !== marketId) return;
        queryClient.invalidateQueries({ queryKey: ["market", marketId] });
        queryClient.invalidateQueries({ queryKey: ["market-predictions", marketId] });
      } catch {
        // ignore parse errors (e.g. heartbeat comment)
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [marketId, queryClient]);
}
