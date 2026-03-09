"use client";

import { cn } from "@/lib/utils";

/** 4 stat cards with shimmer, matching StatsCards layout */
export function StatsSkeleton({ className }: { className?: string }) {
  return (
    <section
      className={cn("grid grid-cols-2 gap-px lg:grid-cols-4 bg-border rounded-xl overflow-hidden", className)}
      aria-hidden
    >
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="skeleton-shimmer bg-surface rounded-none"
          style={{ padding: "20px 24px" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3.5 w-3.5 rounded bg-elevated" />
            <div className="h-3 w-20 rounded bg-elevated" />
          </div>
          <div className="h-9 w-16 rounded bg-elevated" />
          <div className="mt-1 h-3 w-24 rounded bg-elevated" />
        </div>
      ))}
    </section>
  );
}
