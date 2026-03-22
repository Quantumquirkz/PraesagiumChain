"use client";

import { cn } from "@/lib/utils";

/** Skeleton with same dimensions as MarketCard + shimmer animation */
export function MarketCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "skeleton-shimmer block w-full min-h-[200px] rounded-xl border border-border bg-surface p-5",
        className
      )}
      style={{ padding: 20 }}
      aria-hidden
    >
      <div className="flex items-center justify-between gap-2">
        <div className="h-5 w-16 rounded bg-elevated" />
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="h-5 w-5 rounded bg-elevated" />
          <div className="h-4 w-20 rounded bg-elevated" />
        </div>
      </div>
      <div className="mt-3 h-4 w-[85%] rounded bg-elevated" style={{ marginTop: 12 }} />
      <div className="mt-4 flex flex-col gap-2" style={{ marginTop: 16 }}>
        <div className="flex items-center justify-between gap-3">
          <div className="h-3 w-14 rounded bg-elevated" />
          <div className="flex-1 h-1.5 min-w-0 rounded-[3px] bg-elevated" style={{ height: 6, borderRadius: 3 }} />
          <div className="h-3 w-14 rounded bg-elevated" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3" style={{ marginTop: 16 }}>
        <div className="h-3 w-20 rounded bg-elevated" />
        <div className="h-6 w-16 rounded bg-elevated" />
      </div>
    </div>
  );
}
