"use client";

import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AutomationStatusBadgeProps {
  className?: string;
}

export function AutomationStatusBadge({ className }: AutomationStatusBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-violet/30 bg-violet-dim px-3 py-1.5",
        className
      )}
      title="Chainlink Automation resolves price-based markets automatically via Data Feeds"
    >
      <Zap className="h-3.5 w-3.5 text-violet" aria-hidden />
      <span className="font-mono text-[10px] text-violet uppercase tracking-widest">
        Chainlink Automation + Data Feeds
      </span>
    </div>
  );
}
