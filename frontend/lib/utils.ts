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

// ─── Category detection ───────────────────────────────────────────────────────

export type MarketCategory = "Crypto" | "Sports" | "Weather" | "Other";

const CATEGORY_RULES: { category: MarketCategory; keywords: RegExp }[] = [
  {
    category: "Crypto",
    keywords:
      /\b(btc|eth|bitcoin|ethereum|crypto|defi|nft|solana|sol|bnb|usdt|usdc|chainlink|link|polygon|matic|avax|avalanche|dao|web3|blockchain|token|coin|altcoin|stablecoin)\b/i,
  },
  {
    category: "Sports",
    keywords:
      /\b(win|wins|winning|match|matches|score|scores|league|leagues|championship|tournament|team|teams|player|players|game|games|cup|final|playoff|season|goal|goals|nba|nfl|fifa|ufc|mls|mlb|nhl|f1|formula)\b/i,
  },
  {
    category: "Weather",
    keywords:
      /\b(rain|rains|raining|rainfall|weather|temperature|degrees|celsius|fahrenheit|storm|hurricane|tornado|flood|drought|snow|snowing|sunshine|climate|forecast|heatwave|frost)\b/i,
  },
];

export function detectCategory(question: string): MarketCategory {
  for (const { category, keywords } of CATEGORY_RULES) {
    if (keywords.test(question)) return category;
  }
  return "Other";
}
