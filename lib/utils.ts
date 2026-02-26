import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const ETH_DECIMALS = 18;
const TEN_18 = BigInt("1000000000000000000"); // 10**18

export function formatEth(wei: bigint): string {
  const whole = wei / TEN_18;
  const frac = wei % TEN_18;
  const fracStr = frac.toString().padStart(ETH_DECIMALS, "0").slice(0, 4).replace(/0+$/, "") || "0";
  if (fracStr === "0") return `${whole}.0 ETH`;
  return `${whole}.${fracStr} ETH`;
}

export function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const RELATIVE_FORMAT = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatRelativeTime(unix: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = unix - now;
  const abs = Math.abs(diff);
  if (abs < 60) return diff >= 0 ? "in less than a minute" : "a moment ago";
  if (abs < 3600) {
    const minutes = Math.floor(abs / 60);
    return diff >= 0 ? RELATIVE_FORMAT.format(minutes, "minute") : RELATIVE_FORMAT.format(-minutes, "minute");
  }
  if (abs < 86400) {
    const hours = Math.floor(abs / 3600);
    return diff >= 0 ? RELATIVE_FORMAT.format(hours, "hour") : RELATIVE_FORMAT.format(-hours, "hour");
  }
  const days = Math.floor(abs / 86400);
  return diff >= 0 ? RELATIVE_FORMAT.format(days, "day") : RELATIVE_FORMAT.format(-days, "day");
}

export function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatCountdown(unix: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = unix - now;
  if (diff <= 0) return "Expired";
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

export function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === "open") return "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30";
  if (s === "locked") return "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30";
  if (s === "resolved") return "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30";
  if (s === "cancelled") return "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30";
  return "bg-muted text-muted-foreground border border-border";
}
