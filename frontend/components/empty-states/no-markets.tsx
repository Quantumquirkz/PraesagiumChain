"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/** Empty state: no markets found — illustration + CTA to create */
export function NoMarkets({
  className,
  description,
}: {
  className?: string;
  /** Override subtitle (e.g. "Try changing filters or search.") */
  description?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      <div className="mb-6 w-32 h-24 flex items-center justify-center" aria-hidden>
        <svg width="128" height="96" viewBox="0 0 128 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-cyan/80">
          <path d="M16 72V56L32 40L48 52L64 36L80 48L96 28L112 44V72" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          <path d="M24 64H40V72H24V64ZM56 48H72V72H56V48ZM88 56H104V72H88V56Z" fill="var(--violet)" fillOpacity="0.5" />
          <circle cx="64" cy="32" r="12" stroke="var(--violet)" strokeWidth="2" fill="none" />
          <text x="64" y="36" textAnchor="middle" fill="var(--text-muted)" fontSize="14" fontFamily="var(--font-body), DM Sans, sans-serif">?</text>
        </svg>
      </div>
      <h2 className="font-display font-bold text-[24px] text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
        No markets found
      </h2>
      <p className="text-[14px] text-text-secondary mb-6 max-w-sm">
        {description ?? "Create the first prediction market"}
      </p>
      <Link
        href="/markets/create"
        className={cn(
          "inline-flex items-center gap-2 rounded-md px-4 py-2.5 font-body text-sm font-medium",
          "bg-gradient-to-r from-cyan to-violet text-foreground",
          "hover:opacity-90 transition-opacity"
        )}
      >
        Create Market →
      </Link>
    </div>
  );
}
