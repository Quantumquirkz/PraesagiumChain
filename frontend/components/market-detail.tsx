"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAccount, useBalance, useWriteContract } from "wagmi";
import { formatEther } from "viem";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  TrendingUp,
  TrendingDown,
  BarChart2,
  ExternalLink,
  Trophy,
  Clock,
} from "lucide-react";
import type { MarketView, PredictionView } from "@/types/api";
import { formatDate, formatEth, formatRelativeTime } from "@/lib/utils";
import { predictionMarketContract, PREDICTION_MARKET_ADDRESS, OUTCOME, EXPLORER_URL } from "@/lib/constants";
import type { IndicatorId } from "@/components/tv-chart";
import { useCountdown, CountdownBlocks } from "@/components/countdown";
import { BetForm } from "@/components/bet-form";
import { ShareMarketButton } from "@/components/share-market-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePHPEPrediction } from "@/hooks/use-phpe-prediction";
import { useAIAnalysis } from "@/hooks/use-ai-analysis";
import type { Timeframe } from "@/lib/ohlcv-utils";

import { UncertaintyBar } from "@/components/uncertainty-bar";
import { ModelVerifier } from "@/components/model-verifier";
import { SignalFusionPanel } from "@/components/signal-fusion-panel";
import { ConditionalTree } from "@/components/conditional-tree";
import { CommitRevealWizard } from "@/components/commit-reveal-wizard";
import { ChainlinkPriceBadge } from "@/components/chainlink-price-badge";

const PHPEHistoryChart = dynamic(
  () =>
    import("@/components/phpe-history-chart").then((m) => ({
      default: m.PHPEHistoryChart,
    })),
  { ssr: false }
);

const TVChart = dynamic(
  () => import("@/components/tv-chart").then((m) => ({ default: m.TVChart })),
  { ssr: false }
);

export interface MarketOnChain {
  id: bigint;
  question: string;
  closeTime: bigint;
  resolveTime: bigint;
  status: number;
  outcome: number;
  totalYesStake: bigint;
  totalNoStake: bigint;
}

export interface UserStakeOnChain {
  yesStake: bigint;
  noStake: bigint;
}

const TIMEFRAMES: { tf: Timeframe; label: string; desc: string }[] = [
  { tf: "15m", label: "15m",  desc: "15 minutes — scalping view"       },
  { tf: "1h",  label: "1H",   desc: "1 hour — intraday trend"          },
  { tf: "4h",  label: "4H",   desc: "4 hours — swing trading"          },
  { tf: "24h", label: "1D",   desc: "1 day — daily candles"            },
  { tf: "1W",  label: "1W",   desc: "1 week — macro trend"             },
  { tf: "1M",  label: "1M",   desc: "1 month — long-term view"         },
];

const INDICATOR_GROUPS: {
  group: string;
  items: { id: IndicatorId; label: string; desc: string; color: string }[];
}[] = [
  {
    group: "Moving Averages",
    items: [
      { id: "ma7",  label: "MA 7",  desc: "7-period moving average — short-term momentum",  color: "#FFD700" },
      { id: "ma25", label: "MA 25", desc: "25-period moving average — medium-term trend",    color: "#00D4FF" },
      { id: "ma99", label: "MA 99", desc: "99-period moving average — long-term trend",      color: "#8B5CF6" },
    ],
  },
  {
    group: "Bands & Volume",
    items: [
      { id: "bb",     label: "Bollinger",  desc: "Bollinger Bands — volatility envelope (±2σ)",   color: "#8B5CF6" },
      { id: "volume", label: "Volume",     desc: "Trading volume bars — market participation",     color: "#00E87A" },
    ],
  },
  {
    group: "Oscillators",
    items: [
      { id: "macd", label: "MACD", desc: "Moving Avg Convergence/Divergence — trend momentum",  color: "#00D4FF" },
      { id: "rsi",  label: "RSI",  desc: "Relative Strength Index — overbought/oversold (14)",  color: "#F5A623" },
    ],
  },
];

const STATUS_BADGE_CLASS: Record<string, string> = {
  Open: "badge-open",
  Locked: "badge-locked",
  Resolved: "badge-resolved",
  Cancelled: "badge-cancelled",
};

export interface MarketDetailProps {
  marketId: number;
  market: MarketView;
  predictions: PredictionView[];
  marketOnChain: MarketOnChain | null;
  onChainLoading?: boolean;
  onChainError?: boolean;
  userStake: UserStakeOnChain | null;
  /** Llamado tras apostar con éxito para refrescar stake y totales on-chain */
  onBetSuccess?: () => void;
}

export function MarketDetail({
  marketId,
  market,
  predictions,
  marketOnChain,
  onChainLoading,
  onChainError,
  userStake,
  onBetSuccess,
}: MarketDetailProps) {
  const [aiCollapsed, setAiCollapsed] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [indicators, setIndicators] = useState<Set<IndicatorId>>(new Set<IndicatorId>(["ma7", "volume"]));
  const [stakesMounted, setStakesMounted] = useState(false);

  // Extract Binance symbol from market metadata.
  // Supports: meta.symbol, meta.resolution.symbol, meta.asset, meta.pair, meta.betToken
  const chartSymbol = (() => {
    try {
      const meta = market.metadata ? JSON.parse(market.metadata) : {};
      const raw: string = (
        meta.symbol ??
        meta.resolution?.symbol ??
        meta.asset ??
        meta.pair ??
        meta.betToken ??
        ""
      ) as string;
      if (!raw) return undefined;
      // Strip trailing "USDT" suffix before normalizing (avoid "BTCUSDTUSDT")
      const upper = raw.toUpperCase().replace(/USDT$/, "");
      if (!upper) return undefined;
      return `${upper}USDT`;
    } catch {
      return undefined;
    }
  })();

  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { writeContractAsync, isPending: writePending } = useWriteContract();

  let totalYes = marketOnChain ? marketOnChain.totalYesStake : BigInt(Number(market.total_yes_stake));
  let totalNo = marketOnChain ? marketOnChain.totalNoStake : BigInt(Number(market.total_no_stake));
  // Si el contrato devuelve totales 0 pero el usuario tiene stake, usar su stake como mínimo (evita 50/50 fantasma)
  if (totalYes + totalNo === BigInt(0) && userStake && (userStake.yesStake + userStake.noStake) > BigInt(0)) {
    totalYes = userStake.yesStake;
    totalNo = userStake.noStake;
  }
  const totalStake = totalYes + totalNo;
  const yesPct = totalStake > BigInt(0) ? Number((totalYes * BigInt(100)) / totalStake) : 50;
  const noPct = 100 - yesPct;

  const isResolved = market.status === "Resolved";
  const isOpen = market.status === "Open";
  const outcomeYes = market.outcome === "Yes" || marketOnChain?.outcome === OUTCOME.YES;
  const outcomeNo = market.outcome === "No" || marketOnChain?.outcome === OUTCOME.NO;
  const userWon = isResolved && userStake && ((outcomeYes && userStake.yesStake > BigInt(0)) || (outcomeNo && userStake.noStake > BigInt(0)));
  const claimable = userWon && userStake ? (outcomeYes ? userStake.yesStake : userStake.noStake) : BigInt(0);

  const totalStakeEth = Number(formatEther(totalStake));
  const userTotalStake = userStake ? Number(formatEther(userStake.yesStake + userStake.noStake)) : 0;

  useEffect(() => {
    const t = setTimeout(() => setStakesMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const onClaimPayout = async () => {
    try {
      toast.info("Confirm in wallet");
      const hash = await writeContractAsync({
        ...predictionMarketContract,
        functionName: "claimPayout",
        args: [BigInt(marketId)],
      });
      toast.success("Payout claimed!", {
        action: hash ? { label: "View on Etherscan", onClick: () => window.open(`${EXPLORER_URL}/tx/${hash}`, "_blank") } : undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Claim failed");
    }
  };

  const closeUnix = market.close_time;
  const resolveUnix = market.resolve_time;

  return (
    <div className="space-y-0">

      {/* ══════════════════════════════════════════════════════════
          ZONA 1 — HEADER + STATS (full width, estilo CoinGecko)
      ══════════════════════════════════════════════════════════ */}
      <div className="pb-5 border-b border-border">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 font-mono text-xs text-text-muted mb-3" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground transition-colors">Markets</Link>
          <ChevronRight className="h-3 w-3 opacity-50" />
          <span className="text-text-secondary">#{marketId}</span>
        </nav>

        {/* Título + badges + share */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h1 className="font-display font-extrabold text-[22px] leading-tight text-foreground">
              {market.question}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <span className={cn("rounded-full px-3 py-1 font-mono text-[11px] uppercase font-bold", STATUS_BADGE_CLASS[market.status] ?? "badge-cancelled")}>
              {market.status}
            </span>
            <span className="rounded-full border border-border bg-elevated px-3 py-1 font-mono text-[11px] uppercase text-text-secondary">
              {market.market_type || "Base"}
            </span>
            {/* On-chain indicator: si la API ya tiene on_chain_market_id, mostramos On-chain de inmediato (no "Checking…") */}
            {market.on_chain_market_id != null ? (
              <span className="flex items-center gap-1.5 rounded-full border border-green/30 bg-green-dim px-3 py-1 font-mono text-[11px] text-green">
                <span className="relative flex h-1.5 w-1.5">
                  <span className={cn("absolute inline-flex h-full w-full rounded-full bg-green", onChainLoading && "animate-ping opacity-60")} />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green" />
                </span>
                {onChainLoading ? "On-chain · Updating…" : "On-chain"}
              </span>
            ) : onChainLoading && !marketOnChain ? (
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-elevated px-3 py-1 font-mono text-[11px] text-text-muted animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-text-muted shrink-0" />
                Checking…
              </span>
            ) : marketOnChain ? (
              <span className="flex items-center gap-1.5 rounded-full border border-green/30 bg-green-dim px-3 py-1 font-mono text-[11px] text-green">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green" />
                </span>
                On-chain
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-[11px] text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                Off-chain
              </span>
            )}
            {isResolved && (
              <span className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 font-display font-bold text-sm",
                outcomeYes ? "bg-green-dim text-green border border-green/30" : "bg-red-dim text-red border border-red/30"
              )}>
                {outcomeYes ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {outcomeYes ? "YES" : "NO"}
              </span>
            )}
            <ShareMarketButton market={market} />
          </div>
        </div>

        {/* Stats row — 5 pills estilo CoinGecko */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <StatPill icon={<BarChart2 className="h-3.5 w-3.5" />} label="Total Pool" value={`${totalStakeEth.toFixed(4)} ETH`} accent="cyan" />
          <StatPill icon={<TrendingUp className="h-3.5 w-3.5" />} label="YES Odds" value={`${yesPct}%`} accent="green" />
          <StatPill icon={<TrendingDown className="h-3.5 w-3.5" />} label="NO Odds" value={`${noPct}%`} accent="red" />
          <StatPill icon={<Clock className="h-3.5 w-3.5" />} label="Closes" value={formatDate(closeUnix)} accent="violet" />
          <StatPill icon={<Clock className="h-3.5 w-3.5" />} label="Resolves" value={formatDate(resolveUnix)} accent="violet" />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ZONA 2 — GRÁFICA FULL WIDTH + SIDEBAR ACCIÓN
          Layout: [gráfica grande] | [sidebar estrecho]
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-0 pt-0">

        {/* ── GRÁFICA (columna izquierda, full height) ── */}
        <div className="min-w-0 border-r border-border pr-0 lg:pr-5 pt-5">

          {/* Árbol de condiciones */}
          {market.market_type === "conditional" && (
            <div className="mb-4">
              <ConditionalTree marketId={marketId} />
            </div>
          )}

          {/* ── Chart toolbar ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">

            {/* Timeframe selector */}
            <div className="flex items-center gap-1 bg-elevated rounded-lg p-1">
              {TIMEFRAMES.map(({ tf, label, desc }) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  title={desc}
                  className={cn(
                    "rounded-md px-3 py-1.5 font-mono text-xs transition-all",
                    timeframe === tf
                      ? "bg-surface border border-border text-foreground font-bold shadow-sm"
                      : "text-text-muted hover:text-foreground"
                  )}
                  aria-pressed={timeframe === tf}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Live refresh badge */}
            <div className="flex items-center gap-1.5 rounded-full border border-green/25 bg-elevated px-2.5 py-1 shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green" />
              </span>
              <span className="font-mono text-[10px] text-green font-medium">Updates every 2s</span>
            </div>
          </div>

          {/* Indicator groups */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 pb-3 border-b border-border">
            {INDICATOR_GROUPS.map(({ group, items }) => (
              <div key={group} className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest mr-0.5 hidden sm:inline">
                  {group}
                </span>
                {items.map(({ id, label, desc, color }) => (
                  <label
                    key={id}
                    title={desc}
                    className={cn(
                      "cursor-pointer rounded-md border px-2.5 py-1 font-mono text-[11px] transition-all select-none flex items-center gap-1.5",
                      indicators.has(id)
                        ? "border-current font-semibold"
                        : "bg-transparent border-border text-text-muted hover:text-foreground hover:border-border-bright"
                    )}
                    style={indicators.has(id) ? { color, borderColor: color, background: `${color}18` } : {}}
                  >
                    <input
                      type="checkbox"
                      checked={indicators.has(id)}
                      onChange={() => {
                        const next = new Set<IndicatorId>(indicators);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        setIndicators(next);
                      }}
                      className="sr-only"
                      aria-label={label}
                    />
                    {indicators.has(id) && (
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: color }}
                      />
                    )}
                    {label}
                  </label>
                ))}
              </div>
            ))}
          </div>

          {/* LA GRÁFICA — lightweight-charts con zoom/pan nativo */}
          <TVChart
            height={480}
            embedded
            symbol={chartSymbol}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            indicators={indicators}
            onIndicatorsChange={setIndicators}
          />

          {/* ── MARKET STAKES (debajo de la gráfica, full width) ── */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-[12px] text-text-muted tracking-widest uppercase">
                Market Stakes
              </h2>
              <span className="font-mono text-xs text-text-muted">{totalStakeEth.toFixed(4)} ETH total</span>
            </div>

            {/* Barra combinada */}
            <div className="space-y-1.5">
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-elevated">
                <div
                  className="absolute inset-y-0 left-0 rounded-l-full bg-gradient-to-r from-green to-green/60 transition-[width] duration-1000 ease-out"
                  style={{ width: stakesMounted ? `${yesPct}%` : "0%" }}
                />
                <div
                  className="absolute inset-y-0 right-0 rounded-r-full bg-gradient-to-l from-red to-red/60 transition-[width] duration-1000 ease-out"
                  style={{ width: stakesMounted ? `${noPct}%` : "0%" }}
                />
              </div>
              <div className="flex justify-between font-mono text-xs">
                <span className="flex items-center gap-1.5 text-green">
                  <span className="h-2 w-2 rounded-full bg-green" />
                  YES — {formatEth(totalYes)} ({yesPct}%)
                </span>
                <span className="flex items-center gap-1.5 text-red">
                  NO — {formatEth(totalNo)} ({noPct}%)
                  <span className="h-2 w-2 rounded-full bg-red" />
                </span>
              </div>
            </div>

            {/* Cards YES/NO */}
            <div className="grid grid-cols-2 gap-3">
              <div className={cn(
                "rounded-xl border p-4 text-center transition-all",
                yesPct >= noPct ? "border-green/40 bg-green-dim" : "border-border bg-elevated"
              )}>
                <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider mb-1">YES Implied</p>
                <p className={cn("font-display font-extrabold text-3xl", yesPct >= noPct ? "text-green" : "text-foreground")}>{yesPct}%</p>
                <p className="font-mono text-xs text-text-muted mt-1">{formatEth(totalYes)} staked</p>
              </div>
              <div className={cn(
                "rounded-xl border p-4 text-center transition-all",
                noPct > yesPct ? "border-red/40 bg-red-dim" : "border-border bg-elevated"
              )}>
                <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider mb-1">NO Implied</p>
                <p className={cn("font-display font-extrabold text-3xl", noPct > yesPct ? "text-red" : "text-foreground")}>{noPct}%</p>
                <p className="font-mono text-xs text-text-muted mt-1">{formatEth(totalNo)} staked</p>
              </div>
            </div>
          </div>

          {/* ── PHPE ANALYSIS ── */}
          <div className="mt-6 rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-display font-bold text-[12px] text-text-muted tracking-widest uppercase">PHPE Analysis</h2>
              <button
                type="button"
                className="text-text-muted hover:text-foreground transition-colors"
                title="Probabilistic Hybrid Prediction Engine — combines sentiment, market data and on-chain signals with calibrated uncertainty."
                aria-label="What is PHPE?"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Análisis y descripción generados por IA (mercado, datos, noticias) */}
            <AIAnalysisBlock
              marketId={marketId}
              binanceSymbol={chartSymbol ?? "BTCUSDT"}
            />

            {predictions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <BarChart2 className="h-8 w-8 text-text-muted opacity-30" />
                <p className="font-mono text-sm text-text-muted">No predictions yet</p>
                <p className="font-mono text-xs text-text-muted opacity-60">Use the AI Preview in the sidebar to generate one</p>
              </div>
            ) : predictions.length > 1 ? (
              <ul className="space-y-3">
                {predictions.map((p, i) => <PredictionRow key={i} p={p} />)}
              </ul>
            ) : (
              <PredictionRow p={predictions[0]} />
            )}
          </div>

          {/* ── SIGNAL FUSION ── */}
          <div className="mt-6">
            <SignalFusionPanel defaultParams={{ binanceSymbol: chartSymbol ?? "BTCUSDT", marketId }} />
          </div>

          {/* ── PHPE HISTORY ── */}
          <div className="mt-6">
            <PHPEHistoryChart predictions={predictions} />
          </div>
        </div>

        {/* ── SIDEBAR (columna derecha, sticky) ── */}
        <aside className="lg:pl-5 pt-5 space-y-4 min-w-0">
          <div className="lg:sticky lg:top-4 space-y-4">

            {/* CHAINLINK DATA FEEDS */}
            <div className="flex flex-wrap gap-2">
              <ChainlinkPriceBadge feed="ETH_USD" />
              <ChainlinkPriceBadge feed="BTC_USD" />
            </div>

            {/* COUNTDOWN */}
            <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
              <CountdownBlocks targetUnix={closeUnix} label="CLOSES IN" />
              <div className="border-t border-border pt-4">
                <CountdownBlocks targetUnix={resolveUnix} label="RESOLVES IN" urgentClassName="border-violet/60 bg-violet-dim text-violet" />
              </div>
              <TimelineBar closeUnix={closeUnix} resolveUnix={resolveUnix} />
            </div>

            {/* USER POSITION */}
            {isConnected && userStake !== null && (
              <div className="rounded-xl border border-cyan/20 bg-surface p-4" style={{ background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--cyan-dim) 100%)" }}>
                <h3 className="font-display font-bold text-[11px] text-text-muted tracking-widest uppercase mb-3">Your Position</h3>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-lg border border-green/20 bg-green-dim p-2.5 text-center">
                    <p className="font-mono text-[10px] text-text-muted mb-0.5">YES</p>
                    <p className="font-display font-bold text-green text-lg">{formatEth(userStake.yesStake)}</p>
                    <p className="font-mono text-[10px] text-text-muted">ETH</p>
                  </div>
                  <div className="rounded-lg border border-red/20 bg-red-dim p-2.5 text-center">
                    <p className="font-mono text-[10px] text-text-muted mb-0.5">NO</p>
                    <p className="font-display font-bold text-red text-lg">{formatEth(userStake.noStake)}</p>
                    <p className="font-mono text-[10px] text-text-muted">ETH</p>
                  </div>
                </div>
                {userTotalStake > 0 && (
                  <p className="font-mono text-xs text-text-muted text-center">Total: {userTotalStake.toFixed(4)} ETH</p>
                )}
                {userWon && claimable > BigInt(0) && (
                  <div className="mt-3 rounded-lg border border-green/40 bg-green-dim p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-4 w-4 text-green" />
                      <p className="font-display font-bold text-green text-sm">WINNER!</p>
                    </div>
                    <p className="font-mono text-xs text-foreground mb-3">
                      Claimable: <span className="text-green font-bold">{formatEth(claimable)}</span>
                    </p>
                    <Button
                      onClick={onClaimPayout}
                      disabled={writePending}
                      className="w-full h-10 font-display font-bold text-sm bg-green text-black hover:brightness-110 transition-all"
                      aria-label="Claim payout"
                    >
                      {writePending
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />Claiming...</>
                        : "CLAIM PAYOUT"
                      }
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* BET FORM */}
            {market.market_type === "private" ? (
              <CommitRevealWizard marketId={marketId} />
            ) : (
              <div className="rounded-xl border border-border bg-surface p-4">
                <h3 className="font-display font-bold text-[11px] text-text-muted tracking-widest uppercase mb-4">Place Bet</h3>
                {/* Aviso suave solo cuando la API no tiene on_chain_market_id y estamos cargando */}
                {market.on_chain_market_id == null && onChainLoading && !marketOnChain && (
                  <p className="mb-3 font-mono text-[10px] text-text-muted animate-pulse">
                    Checking on-chain status…
                  </p>
                )}
                {/* Aviso informativo si el mercado aún no está en la red (solo cuando no tenemos on_chain_market_id) */}
                {market.on_chain_market_id == null && !onChainLoading && (onChainError || !marketOnChain) && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/8 px-3 py-2">
                    <span className="text-cyan-400 text-sm shrink-0 mt-0.5" aria-hidden>ℹ</span>
                    <p className="font-mono text-[10px] text-cyan-200/90 leading-relaxed">
                      Para apostar on-chain, el mercado debe estar desplegado en la red. Puedes crearlo desde{" "}
                      <Link href="/markets/create" className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
                        Create Market
                      </Link>.
                    </p>
                  </div>
                )}
                <BetForm marketId={marketId} marketStatus={market.status} question={market.question} metadata={market.metadata} onBetSuccess={onBetSuccess} />
              </div>
            )}

            {/* AI PREVIEW */}
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center justify-between p-4 text-left"
                onClick={() => setAiCollapsed(!aiCollapsed)}
                aria-expanded={!aiCollapsed}
              >
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-[11px] text-text-muted tracking-widest uppercase">AI Preview</span>
                  <span className="rounded-full border border-violet/30 bg-violet-dim px-2 py-0.5 font-mono text-[9px] text-violet uppercase">PHPE v2</span>
                </div>
                {aiCollapsed
                  ? <ChevronRight className="h-4 w-4 text-text-muted" />
                  : <ChevronDown className="h-4 w-4 text-text-muted" />
                }
              </button>
              {!aiCollapsed && (
                <div className="border-t border-border p-4">
                  <PHPEWidget marketId={marketId} />
                </div>
              )}
            </div>

            {/* MARKET INFO */}
            <div className="rounded-xl border border-border bg-surface p-4">
              <h3 className="font-display font-bold text-[11px] text-text-muted tracking-widest uppercase mb-3">Market Info</h3>
              <div className="space-y-2">
                <InfoRow label="Market ID" value={`#${marketId}`} />
                <InfoRow label="Type" value={market.market_type || "Base"} />
                <InfoRow label="Status" value={market.status} />
                <InfoRow label="Close" value={formatDate(closeUnix)} />
                <InfoRow label="Resolve" value={formatDate(resolveUnix)} />
                {market.creator && (
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-text-muted">Creator</span>
                    <a
                      href={`${EXPLORER_URL}/address/${market.creator}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-[11px] text-cyan hover:underline"
                    >
                      {market.creator.slice(0, 6)}…{market.creator.slice(-4)}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>

          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatPill({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "cyan" | "green" | "red" | "violet";
}) {
  const accentClasses = {
    cyan: "text-cyan border-cyan/20 bg-cyan/5",
    green: "text-green border-green/20 bg-green/5",
    red: "text-red border-red/20 bg-red/5",
    violet: "text-violet border-violet/20 bg-violet/5",
  };
  return (
    <div className={cn("rounded-xl border p-3 space-y-1", accentClasses[accent])}>
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider opacity-70">
        {icon}
        {label}
      </div>
      <p className="font-display font-bold text-sm text-foreground">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[11px] text-text-muted">{label}</span>
      <span className="font-mono text-[11px] text-foreground">{value}</span>
    </div>
  );
}

function TimelineBar({ closeUnix, resolveUnix }: { closeUnix: number; resolveUnix: number }) {
  const now = Math.floor(Date.now() / 1000);
  const total = resolveUnix - closeUnix;
  const elapsed = now - closeUnix;
  const pct = total > 0 ? Math.max(0, Math.min(100, (elapsed / total) * 100)) : 0;
  const isBeforeClose = now < closeUnix;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between font-mono text-[10px] text-text-muted">
        <span>Close</span>
        <span>Resolve</span>
      </div>
      <div className="relative h-1 w-full rounded-full bg-elevated overflow-hidden">
        {!isBeforeClose && (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan to-violet transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-text-muted">
        <span>{new Date(closeUnix * 1000).toLocaleDateString()}</span>
        <span>{new Date(resolveUnix * 1000).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

// ─── AI Analysis Block ─────────────────────────────────────────────────────────

function AIAnalysisBlock({
  marketId,
  binanceSymbol,
}: {
  marketId: number;
  binanceSymbol: string;
}) {
  const [sentimentText, setSentimentText] = useState("");
  const { mutate: generate, data, isPending, error } = useAIAnalysis(marketId);

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <Textarea
          placeholder="Opcional: pega noticias, tweets o contexto de redes para enriquecer el análisis..."
          value={sentimentText}
          onChange={(e: { target: { value: string } }) => setSentimentText(e.target.value)}
          className="font-mono text-xs min-h-[60px] bg-elevated border-border resize-none flex-1"
          disabled={isPending}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            generate({
              sentimentText: sentimentText.trim() || undefined,
              binanceSymbol,
            })
          }
          disabled={isPending}
          className="border-violet text-violet hover:bg-violet-dim font-display font-bold tracking-widest h-9 shrink-0"
          aria-label="Generar análisis IA"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" aria-hidden />
              Generando…
            </>
          ) : (
            "Generar análisis IA"
          )}
        </Button>
      </div>
      {error && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 p-3" role="alert">
          <p className="font-mono text-xs text-amber-200">
            {error instanceof Error ? error.message : "Error al generar análisis"}
          </p>
          {(error instanceof Error && /429|quota|RESOURCE_EXHAUSTED|límite/i.test(error.message)) && (
            <p className="mt-2 font-mono text-[11px] text-amber-200/80">
              Espera 1–2 minutos y pulsa de nuevo «Generar análisis IA».
            </p>
          )}
        </div>
      )}
      {data && !isPending && (
        <div className="rounded-lg border border-violet/20 bg-violet-dim/30 p-4 space-y-4">
          <div>
            <p className="font-mono text-[10px] text-violet uppercase tracking-widest mb-1.5">Análisis IA</p>
            <p className="font-body text-sm text-foreground leading-relaxed">{data.analysis}</p>
          </div>
          <div className="border-t border-border/50 pt-3">
            <p className="font-mono text-[10px] text-violet uppercase tracking-widest mb-1.5">Fuentes de información</p>
            <p className="font-body text-sm text-text-secondary leading-relaxed">{data.description}</p>
          </div>
          <p className="font-mono text-[9px] text-text-muted italic">
            Generado a partir del mercado, datos de precio (Binance, Chainlink) y contexto de noticias/redes.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── PHPE Components ──────────────────────────────────────────────────────────

const BINANCE_SYMBOLS_PHPE = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"] as const;

function PHPEResult({ probability, uncertainty }: { probability: number; uncertainty?: number }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const target = probability * 100;
    let current = 0;
    let rafId: number;
    const step = () => {
      current = Math.min(current + 2, target);
      setDisplayed(current);
      if (current < target) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [probability]);

  const low = uncertainty != null ? Math.max(0, probability - uncertainty) * 100 : null;
  const high = uncertainty != null ? Math.min(1, probability + uncertainty) * 100 : null;
  const isPositive = displayed >= 50;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-baseline gap-2">
        <span className={cn("font-mono text-3xl font-bold tabular-nums", isPositive ? "text-green" : "text-red")}>
          {displayed.toFixed(1)}%
        </span>
        {uncertainty != null && <span className="font-mono text-sm text-violet">± {(uncertainty * 100).toFixed(1)}%</span>}
        <span className={cn("ml-auto font-display font-bold text-xs rounded-full px-2 py-0.5", isPositive ? "bg-green-dim text-green" : "bg-red-dim text-red")}>
          {isPositive ? "YES likely" : "NO likely"}
        </span>
      </div>
      <div className="relative h-2.5 w-full rounded-full bg-surface overflow-hidden" role="progressbar" aria-valuenow={Math.round(displayed)} aria-valuemin={0} aria-valuemax={100}>
        {low != null && high != null && (
          <div className="absolute top-0 h-full rounded-sm" style={{ left: `${low}%`, width: `${high - low}%`, background: "var(--violet-dim)", border: "1px solid var(--violet)", transition: "all 0.5s ease" }} aria-hidden />
        )}
        <div className="absolute top-0 left-0 h-full rounded-full" style={{ width: `${displayed}%`, background: isPositive ? "var(--green)" : "var(--red)", transition: "width 0.05s linear" }} aria-hidden />
      </div>
      <p className="font-mono text-[10px] text-text-muted italic">Model: PHPE v2 · Not stored on-chain</p>
    </div>
  );
}

function PHPEWidget({ marketId }: { marketId: number }) {
  const [sentimentText, setSentimentText] = useState("");
  const [binanceSymbol, setBinanceSymbol] = useState("ETHUSDT");
  const [useChainlink, setUseChainlink] = useState(true);
  const { mutate: predict, data, isPending, error, reset } = usePHPEPrediction(marketId);

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block font-mono text-[11px] text-text-muted uppercase tracking-widest">Sentiment context (optional)</label>
        <Textarea
          placeholder="Paste news, tweet, or any text context..."
          value={sentimentText}
          onChange={(e: { target: { value: string } }) => setSentimentText(e.target.value)}
          className="font-mono text-sm min-h-[64px] bg-elevated border-border resize-none"
          disabled={isPending}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={binanceSymbol} onValueChange={setBinanceSymbol} disabled={isPending}>
          <SelectTrigger className="font-mono text-xs bg-elevated border-border h-8 w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BINANCE_SYMBOLS_PHPE.map((s) => (
              <SelectItem key={s} value={s} className="font-mono text-xs">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input type="checkbox" checked={useChainlink} onChange={(e) => setUseChainlink(e.target.checked)} disabled={isPending} className="h-3.5 w-3.5 accent-cyan" />
          <span className="font-mono text-xs text-text-muted">Chainlink</span>
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { reset(); predict({ sentimentText: sentimentText.trim() || undefined, binanceSymbol, useChainlink }); }}
          disabled={isPending}
          className="ml-auto border-violet text-violet hover:bg-violet-dim font-display font-bold tracking-widest h-8 px-3 text-xs"
          aria-label="Get AI prediction"
        >
          {isPending ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" aria-hidden />Analyzing…</> : "ANALYZE"}
        </Button>
      </div>
      {error && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 p-3" role="alert">
          <p className="font-mono text-xs text-amber-200">{error instanceof Error ? error.message : "Prediction failed"}</p>
          {(error instanceof Error && /429|quota|RESOURCE_EXHAUSTED|límite/i.test(error.message)) && (
            <p className="mt-2 font-mono text-[11px] text-amber-200/80">Espera 1–2 minutos y vuelve a pulsar ANALYZE.</p>
          )}
        </div>
      )}
      {data && !isPending && <PHPEResult probability={data.probability} uncertainty={data.uncertainty} />}
    </div>
  );
}

function PredictionRow({ p }: { p: PredictionView }) {
  return (
    <div className="rounded-lg border border-border bg-elevated/50 p-3 space-y-2">
      <UncertaintyBar probability={p.probability} uncertainty={p.uncertainty} label="PHPE Probability" />
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] text-text-muted">{formatRelativeTime(p.timestamp)}</p>
        {(p.model_version || p.model_hash) && <ModelVerifier modelVersion={p.model_version} modelHash={p.model_hash} />}
      </div>
    </div>
  );
}
