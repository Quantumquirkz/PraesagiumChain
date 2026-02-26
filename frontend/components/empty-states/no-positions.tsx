"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/** Wallet empty icon SVG */
function WalletEmptyIcon({ className }: { className?: string }) {
  return (
    <svg
      width="80"
      height="64"
      viewBox="0 0 80 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="8" y="16" width="64" height="40" rx="4" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.5" />
      <path d="M8 28h64" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <circle cx="52" cy="38" r="6" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6" />
      <path d="M24 24v-6a4 4 0 014-4h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/** Empty state: no positions — browse markets CTA */
export function NoPositions({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      <div className="mb-6 text-text-muted" aria-hidden>
        <WalletEmptyIcon />
      </div>
      <h2 className="font-display font-bold text-[24px] text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
        No positions yet
      </h2>
      <p className="text-[14px] text-text-secondary mb-6 max-w-sm">
        Browse markets to start predicting
      </p>
      <Link
        href="/markets"
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-border-bright bg-transparent px-4 py-2.5 font-body text-sm font-medium text-foreground",
          "hover:bg-cyan-dim hover:border-cyan hover:text-cyan transition-colors"
        )}
      >
        Browse markets →
      </Link>
    </div>
  );
}
