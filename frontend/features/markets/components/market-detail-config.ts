import type { IndicatorId } from "@/components/tv-chart";
import type { Timeframe } from "@/lib/ohlcv-utils";

export const TIMEFRAMES: { tf: Timeframe; label: string; desc: string }[] = [
  { tf: "15m", label: "15m", desc: "15 minutes — scalping view" },
  { tf: "1h", label: "1H", desc: "1 hour — intraday trend" },
  { tf: "4h", label: "4H", desc: "4 hours — swing trading" },
  { tf: "24h", label: "1D", desc: "1 day — daily candles" },
  { tf: "1W", label: "1W", desc: "1 week — macro trend" },
  { tf: "1M", label: "1M", desc: "1 month — long-term view" },
];

export const INDICATOR_GROUPS: {
  group: string;
  items: { id: IndicatorId; label: string; desc: string; color: string }[];
}[] = [
  {
    group: "Moving Averages",
    items: [
      { id: "ma7", label: "MA 7", desc: "7-period moving average — short-term momentum", color: "#FFD700" },
      { id: "ma25", label: "MA 25", desc: "25-period moving average — medium-term trend", color: "#00D4FF" },
      { id: "ma99", label: "MA 99", desc: "99-period moving average — long-term trend", color: "#8B5CF6" },
    ],
  },
  {
    group: "Bands & Volume",
    items: [
      { id: "bb", label: "Bollinger", desc: "Bollinger Bands — volatility envelope (±2σ)", color: "#8B5CF6" },
      { id: "volume", label: "Volume", desc: "Trading volume bars — market participation", color: "#00E87A" },
    ],
  },
  {
    group: "Oscillators",
    items: [
      { id: "macd", label: "MACD", desc: "Moving Avg Convergence/Divergence — trend momentum", color: "#00D4FF" },
      { id: "rsi", label: "RSI", desc: "Relative Strength Index — overbought/oversold (14)", color: "#F5A623" },
    ],
  },
];

export const STATUS_BADGE_CLASS: Record<string, string> = {
  Open: "badge-open",
  Locked: "badge-locked",
  Resolved: "badge-resolved",
  Cancelled: "badge-cancelled",
};
