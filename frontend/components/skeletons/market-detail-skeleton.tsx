"use client";

import { cn } from "@/lib/utils";

/** Two-column layout outline for market detail page with shimmer */
export function MarketDetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("skeleton-shimmer", className)} aria-hidden>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left column */}
        <div className="space-y-4">
          <div className="h-6 w-48 rounded bg-elevated" />
          <div className="h-4 w-full max-w-xl rounded bg-elevated" />
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded bg-elevated" />
            <div className="h-6 w-20 rounded bg-elevated" />
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="h-8 w-32 rounded bg-elevated mb-4" />
            <div className="h-[320px] w-full rounded bg-elevated" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 rounded-xl bg-elevated" />
            <div className="h-24 rounded-xl bg-elevated" />
          </div>
        </div>
        {/* Right column */}
        <div className="space-y-4">
          <div className="h-10 w-full rounded-lg bg-elevated" />
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <div className="h-4 w-24 rounded bg-elevated" />
            <div className="h-10 w-full rounded bg-elevated" />
            <div className="h-10 w-full rounded bg-elevated" />
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <div className="h-4 w-32 rounded bg-elevated" />
            <div className="h-12 rounded bg-elevated" />
            <div className="h-12 rounded bg-elevated" />
          </div>
        </div>
      </div>
    </div>
  );
}
