"use client";

import { useEffect, useRef, useState } from "react";
import { useWaitForTransactionReceipt, useBlockNumber } from "wagmi";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { EXPLORER_URL } from "@/lib/constants";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TxStatusProps {
  hash: `0x${string}` | undefined;
  /** Number of confirmations required to consider the tx final (default 3) */
  requiredConfirmations?: number;
  /** Callback called when the tx confirms successfully */
  onConfirmed?: () => void;
  /** ms after confirmation before fading out (default 5 000) */
  dismissAfterMs?: number;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TxStatus({
  hash,
  requiredConfirmations = 3,
  onConfirmed,
  dismissAfterMs = 5_000,
  className,
}: TxStatusProps) {
  const { data: receipt, isLoading } = useWaitForTransactionReceipt({ hash });

  // Only watch the block number while the tx is pending confirmations
  const { data: currentBlock } = useBlockNumber({ watch: isLoading });

  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;

  // Show the widget as soon as there is a hash
  useEffect(() => {
    if (hash) {
      setVisible(true);
      setFading(false);
    }
  }, [hash]);

  // Fade out 5 s after successful confirmation. Dismiss when receipt status or dismissAfterMs changes;
  // omit receipt ref to avoid re-running on receipt object identity.
  useEffect(() => {
    if (receipt?.status !== "success") return;
    onConfirmedRef.current?.();
    const fadeTimer = setTimeout(() => setFading(true), dismissAfterMs);
    const hideTimer = setTimeout(() => setVisible(false), dismissAfterMs + 500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
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
      {/* Hash + link to explorer */}
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

      {/* Progress bar (only while confirming) */}
      {isPending && (
        <div
          className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {/* Animated background track while waiting for the block */}
          {confirmations === 0 && (
            <div
              className="absolute inset-0 rounded-full origin-left animate-pulse"
              style={{ background: "var(--violet-dim, rgba(139,92,246,0.25))" }}
              aria-hidden
            />
          )}
          {/* Confirmations bar */}
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

      {/* Status label */}
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

        {/* Confirmation counter */}
        {(isPending || isSuccess) && (
          <span className="font-mono text-[11px] text-text-muted tabular-nums">
            {cappedConf}/{requiredConfirmations} conf.
          </span>
        )}
      </div>
    </div>
  );
}
