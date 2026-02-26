"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
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

export interface CountdownProps {
  targetUnix: number;
  className?: string;
  pulseWhenUrgent?: boolean;
}

const URGENT_THRESHOLD_SEC = 3600; // 1 hour

export function Countdown({ targetUnix, className, pulseWhenUrgent = true }: CountdownProps) {
  const value = useCountdown(targetUnix);
  const isUrgent = !value.expired && value.totalSeconds < URGENT_THRESHOLD_SEC;
  const display = formatCountdownDisplay(value, "days_ago");

  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        isUrgent && pulseWhenUrgent && "text-red animate-pulse",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={value.expired ? display : `Time remaining: ${display}`}
    >
      {display}
    </span>
  );
}

/** Blocks [02]d [14]h [35]m [22]s for sidebar; red when < 1h */
export function CountdownBlocks({
  targetUnix,
  label,
  urgentClassName = "border-red bg-red-dim text-red",
}: {
  targetUnix: number;
  label: string;
  urgentClassName?: string;
}) {
  const value = useCountdown(targetUnix);
  const isUrgent = !value.expired && value.totalSeconds < URGENT_THRESHOLD_SEC;
  const blocks = [
    { v: value.days, s: "d" },
    { v: value.hours, s: "h" },
    { v: value.minutes, s: "m" },
    { v: value.seconds, s: "s" },
  ];
  return (
    <div className="space-y-2">
      <p className="font-body text-xs font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <div className="flex flex-wrap gap-2" role="status" aria-live="polite">
        {blocks.map(({ v, s }) => (
          <span
            key={s}
            className={cn(
              "inline-flex items-center justify-center rounded font-display font-extrabold text-[32px] tabular-nums",
              "border bg-elevated px-3 py-2",
              isUrgent && !value.expired ? urgentClassName : "border-border text-foreground"
            )}
            style={{ padding: "8px 12px", borderRadius: 4 }}
          >
            {String(v).padStart(2, "0")}{s}
          </span>
        ))}
      </div>
    </div>
  );
}
