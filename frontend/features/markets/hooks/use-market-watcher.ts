"use client";

import { useEffect, useRef } from "react";
import { getMarket } from "@/lib/api";
import {
  getWatchedMarkets,
  notifyMarketResolved,
  removeWatchedMarket,
  requestNotificationPermission,
} from "@/lib/notifications";

const POLL_INTERVAL_MS = 30_000;

/**
 * Polls every 30s for markets stored in localStorage.
 * When it detects a market moved to "Resolved", triggers a notification
 * push and removes it from the watched list.
 *
 * Mounted once in the global layout; no props required.
 */
export function useMarketWatcher() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function checkMarkets() {
      const watched = getWatchedMarkets();
      if (watched.length === 0) return;

      await Promise.allSettled(
        watched.map(async ({ id, question }) => {
          try {
            const market = await getMarket(id);
            if (market.status === "Resolved") {
              const outcome = market.outcome ?? "Unknown";
              notifyMarketResolved(id, question, outcome);
              removeWatchedMarket(id);
            }
          } catch {
            // 404 or other error: stop watching this market to avoid further polling
            removeWatchedMarket(id);
          }
        })
      );
    }

    timerRef.current = setInterval(checkMarkets, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
}

/**
 * Requests notification permission the first time the user places a bet.
 * Call this right after a successful bet.
 */
export async function ensureNotificationPermission(): Promise<void> {
  await requestNotificationPermission();
}
