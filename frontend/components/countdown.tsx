"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface CountdownValue {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
  totalSeconds: number;
  /** When expired, seconds since target (positive) */
  elapsedSeconds: number;
}

export function useCountdown(targetUnix: number): CountdownValue {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const update = () => setNow(Math.floor(Date.now() / 1000));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  const diff = targetUnix - now;
  const totalSeconds = Math.max(0, diff);
  const expired = diff <= 0;
  const elapsedSeconds = expired ? -diff : 0;
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return { days: d, hours: h, minutes: m, seconds: s, expired, totalSeconds, elapsedSeconds };
}

export function formatCountdownDisplay(value: CountdownValue, expiredLabel?: "days_ago"): string {
  if (value.expired && expiredLabel === "days_ago") {
    const days = Math.floor(value.elapsedSeconds / 86400);
    return days <= 0 ? "Expired" : `${days} day${days !== 1 ? "s" : ""} ago`;
  }
  if (value.expired) return "Expired";
  const parts: string[] = [];
  if (value.days > 0) parts.push(`${value.days}d`);
  parts.push(`${value.hours}h`);
  parts.push(`${value.minutes}m`);
  parts.push(`${value.seconds}s`);
  return parts.join(" ");
}

const URGENT_THRESHOLD_SEC = 3600; // 1 hour

/** Blocks [02]d [14]h [35]m [22]s for sidebar; red when < 1h */
export function CountdownBlocks({
  targetUnix,
  label,
  urgentClassName = "border-red/60 bg-red-dim text-red",
}: {
  targetUnix: number;
  label: string;
  urgentClassName?: string;
}) {
  const value = useCountdown(targetUnix);
  const isUrgent = !value.expired && value.totalSeconds < URGENT_THRESHOLD_SEC;
  const blocks = [
    { v: value.days, s: "d", full: "days" },
    { v: value.hours, s: "h", full: "hrs" },
    { v: value.minutes, s: "m", full: "min" },
    { v: value.seconds, s: "s", full: "sec" },
  ];

  if (value.expired) {
    return (
      <div className="space-y-1.5">
        <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-text-muted">{label}</p>
        <p className="font-display font-bold text-sm text-text-muted">Expired</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-text-muted">{label}</p>
      <div className="grid grid-cols-4 gap-1.5">
        {blocks.map(({ v, s, full }) => (
          <div
            key={s}
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border py-2 px-1 transition-colors",
              isUrgent ? urgentClassName : "border-border bg-elevated"
            )}
          >
            <span className={cn(
              "font-display font-extrabold text-[22px] tabular-nums leading-none",
              isUrgent ? "" : "text-foreground"
            )}>
              {String(v).padStart(2, "0")}
            </span>
            <span className={cn(
              "font-mono text-[9px] uppercase tracking-wider mt-0.5",
              isUrgent ? "opacity-80" : "text-text-muted"
            )}>
              {full}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
