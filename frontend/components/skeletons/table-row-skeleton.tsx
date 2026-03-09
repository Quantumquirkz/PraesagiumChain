"use client";

import { cn } from "@/lib/utils";

/** Skeleton para una fila de la tabla de posiciones */
export function TableRowSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "skeleton-shimmer flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3",
        className
      )}
      aria-hidden
    >
      {/* Badge de estado */}
      <div className="h-5 w-14 shrink-0 rounded bg-elevated" />
      {/* Pregunta */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="h-3.5 w-[70%] rounded bg-elevated" />
        <div className="h-3 w-[40%] rounded bg-elevated" />
      </div>
      {/* Stake */}
      <div className="hidden sm:block h-4 w-16 shrink-0 rounded bg-elevated" />
      {/* Outcome */}
      <div className="hidden md:block h-5 w-10 shrink-0 rounded-full bg-elevated" />
      {/* Action */}
      <div className="h-8 w-20 shrink-0 rounded-lg bg-elevated" />
    </div>
  );
}

/** Skeleton para las 3 stat cards del resumen de posiciones */
export function PositionsSummarySkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-3 gap-3", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="skeleton-shimmer rounded-xl border border-border bg-surface px-4 py-3 space-y-2"
        >
          <div className="h-3 w-20 rounded bg-elevated" />
          <div className="h-7 w-16 rounded bg-elevated" />
        </div>
      ))}
    </div>
  );
}
