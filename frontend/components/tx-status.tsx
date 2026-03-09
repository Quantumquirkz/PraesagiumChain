"use client";

import { useEffect, useState } from "react";
import { useWaitForTransactionReceipt, useBlockNumber } from "wagmi";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { EXPLORER_URL } from "@/lib/constants";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface TxStatusProps {
  hash: `0x${string}` | undefined;
  /** Número de confirmaciones para considerar la tx final (default 3) */
  requiredConfirmations?: number;
  /** Callback called when the tx confirms successfully */
  onConfirmed?: () => void;
  /** ms tras confirmación antes de hacer fade-out (default 5 000) */
  dismissAfterMs?: number;
  className?: string;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function TxStatus({
  hash,
  requiredConfirmations = 3,
  onConfirmed,
  dismissAfterMs = 5_000,
  className,
}: TxStatusProps) {
  const { data: receipt, isLoading } = useWaitForTransactionReceipt({ hash });

  // Solo observar el bloque mientras la tx está pendiente de confirmaciones
  const { data: currentBlock } = useBlockNumber({ watch: isLoading });

  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  // Mostrar el widget en cuanto hay hash
  useEffect(() => {
    if (hash) {
      setVisible(true);
      setFading(false);
    }
  }, [hash]);

  // Fade-out 5 s after successful confirmation. Dismiss when receipt status or dismissAfterMs changes;
  // omit receipt ref to avoid re-running on receipt object identity.
  useEffect(() => {
    if (receipt?.status !== "success") return;
    onConfirmed?.();
    const fadeTimer = setTimeout(() => setFading(true), dismissAfterMs);
    const hideTimer = setTimeout(() => setVisible(false), dismissAfterMs + 500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt?.status, dismissAfterMs]);

  if (!hash || !visible) return null;

  const txBlock = receipt?.blockNumber;
  const confirmations =
    txBlock != null && currentBlock != null
      ? Math.max(0, Number(currentBlock - txBlock))
      : 0;
  const cappedConf = Math.min(confirmations, requiredConfirmations);
  const progress = cappedConf / requiredConfirmations;

  const isReverted = receipt?.status === "reverted";
  const isSuccess = receipt?.status === "success";
  const isPending = isLoading || (!receipt && !!hash);

  const truncatedHash = `${hash.slice(0, 10)}…${hash.slice(-6)}`;

  return (
    <div
      className={cn(
        "rounded-xl border bg-elevated p-3 space-y-2 transition-opacity duration-500",
        isReverted ? "border-red/40" : isSuccess ? "border-green/40" : "border-border",
        fading ? "opacity-0" : "opacity-100",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Transaction status"
    >
      {/* Hash + link al explorer */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-text-muted">TX</span>
        <a
          href={`${EXPLORER_URL}/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-[11px] text-cyan hover:underline"
          aria-label={`View transaction ${truncatedHash} on explorer`}
        >
          {truncatedHash}
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </div>

      {/* Barra de progreso (solo mientras confirma) */}
      {isPending && (
        <div
          className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {/* Track animado de fondo mientras esperamos el bloque */}
          {confirmations === 0 && (
            <div
              className="absolute inset-0 rounded-full origin-left animate-pulse"
              style={{ background: "var(--violet-dim, rgba(139,92,246,0.25))" }}
              aria-hidden
            />
          )}
          {/* Barra de confirmaciones */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${progress * 100}%`,
              background: "var(--cyan, #22d3ee)",
            }}
            aria-hidden
          />
        </div>
      )}

      {/* Etiqueta de estado */}
      <div className="flex items-center justify-between gap-2">
        {isPending && (
          <span className="font-mono text-[11px] text-gold">
            ⏳ Confirming…
          </span>
        )}
        {isSuccess && (
          <span className="font-mono text-[11px] text-green">
            ✓ Confirmed
          </span>
        )}
        {isReverted && (
          <span className="font-mono text-[11px] text-red">
            ✗ Reverted
          </span>
        )}

        {/* Contador de confirmaciones */}
        {(isPending || isSuccess) && (
          <span className="font-mono text-[11px] text-text-muted tabular-nums">
            {cappedConf}/{requiredConfirmations} conf.
          </span>
        )}
      </div>
    </div>
  );
}
