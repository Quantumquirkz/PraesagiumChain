"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
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
 * Hace polling cada 30s de los mercados guardados en localStorage.
 * Cuando detecta que un mercado pasó a "Resolved", dispara una notificación
 * push y lo elimina de la lista de vigilados.
 *
 * Se monta una sola vez en el layout global; no requiere props.
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
            // Error de red: ignorar y reintentar en el próximo ciclo
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
 * Solicita permiso de notificación la primera vez que el usuario apuesta.
 * Llama a esta función justo después de una apuesta exitosa.
 */
export async function ensureNotificationPermission(): Promise<void> {
  await requestNotificationPermission();
}
