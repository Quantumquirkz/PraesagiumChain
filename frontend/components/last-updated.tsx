"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LastUpdatedProps {
  /** Timestamp (Date.now()) del último refresco exitoso */
  updatedAt: number | undefined;
  /** Umbral en ms para considerar los datos "frescos" (default: 15 000) */
  freshThresholdMs?: number;
  className?: string;
}

export function LastUpdated({
  updatedAt,
  freshThresholdMs = 15_000,
  className,
}: LastUpdatedProps) {
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  useEffect(() => {
    if (updatedAt == null) return;

    const tick = () => {
      setSecondsAgo(Math.floor((Date.now() - updatedAt) / 1000));
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [updatedAt]);

  if (updatedAt == null || secondsAgo == null) return null;

  const isFresh = secondsAgo * 1000 < freshThresholdMs;

  const label =
    secondsAgo === 0
      ? "just now"
      : secondsAgo === 1
      ? "1s ago"
      : `${secondsAgo}s ago`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[11px] text-text-muted select-none",
        className
      )}
      aria-live="polite"
      aria-label={`Last updated ${label}`}
    >
      {/* Punto de estado */}
      <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden>
        {isFresh && (
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
            style={{ background: "var(--green, #22c55e)" }}
          />
        )}
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{
            background: isFresh
              ? "var(--green, #22c55e)"
              : "var(--gold, #f5a623)",
          }}
        />
      </span>
      Last updated: {label}
    </span>
  );
}
