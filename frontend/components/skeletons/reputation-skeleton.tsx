"use client";

import { cn } from "@/lib/utils";

/** Skeleton de dos columnas para la página de reputación */
export function ReputationSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]", className)}
      aria-hidden
    >
      {/* ── Columna izquierda: avatar + gauge + stats ── */}
      <div className="skeleton-shimmer rounded-md border border-border bg-surface p-6 space-y-6">
        {/* Avatar hexagonal */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-20 w-20 rounded-lg bg-elevated" />
          <div className="h-3 w-48 rounded bg-elevated" />
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-md bg-elevated" />
            <div className="h-8 w-8 rounded-md bg-elevated" />
          </div>
        </div>

        {/* Gauge circular */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-32 w-32 rounded-full bg-elevated" />
          <div className="h-3 w-28 rounded bg-elevated" />
        </div>

        {/* Stats 2×2 */}
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-md border border-border bg-elevated/50 p-3 space-y-1.5">
              <div className="h-6 w-10 rounded bg-elevated" />
              <div className="h-3 w-24 rounded bg-elevated" />
            </div>
          ))}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-7 w-24 rounded-full bg-elevated" />
          ))}
        </div>
      </div>

      {/* ── Columna derecha: actividad reciente ── */}
      <div className="skeleton-shimmer space-y-4">
        <div className="h-4 w-32 rounded bg-elevated" />
        <div className="relative pl-6 space-y-5">
          {/* Línea vertical */}
          <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-elevated" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="h-3.5 w-[65%] rounded bg-elevated" />
              <div className="h-3 w-20 rounded bg-elevated" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
