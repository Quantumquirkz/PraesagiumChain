"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
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
  Clock,
  Trash2,
  Pencil,
} from "lucide-react";
import { formatDate, formatEth } from "@/lib/utils";
import { OUTCOME, EXPLORER_URL, getMarketCategoryFromMetadata, getBetTokenFromMetadata, BET_TOKENS } from "@/lib/constants";
import type { IndicatorId } from "@/components/tv-chart";
import { CountdownBlocks } from "@/components/countdown";
import { BetForm } from "./bet-form";
import { ShareMarketButton } from "@/components/share-market-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { deleteMarket, updateMarket } from "@/lib/api";
import type { Timeframe } from "@/lib/ohlcv-utils";
import { SignalFusionPanel } from "@/features/markets/components/signal-fusion-panel";
import { ConditionalTree } from "@/features/markets/components/conditional-tree";
import { CommitRevealWizard } from "@/features/markets/components/commit-reveal-wizard";
import { WeatherDetailChart } from "@/features/markets/components/weather-detail-chart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { INDICATOR_GROUPS, STATUS_BADGE_CLASS, TIMEFRAMES } from "./market-detail-config";
import { parseGoogleMapsUrl } from "./market-detail-utils";
import type { MarketDetailProps, MarketOnChain, UserStakeOnChain } from "./market-detail-types";
import {
  AIAnalysisBlock,
  InfoRow,
  PHPEWidget,
  PredictionRow,
  StatPill,
  TimelineBar,
} from "./market-detail-widgets";

export type { MarketOnChain, UserStakeOnChain };

const PHPEHistoryChart = dynamic(
  () =>
    import("@/features/markets/components/phpe-history-chart").then((m) => ({
      default: m.PHPEHistoryChart,
    })),
  { ssr: false }
);

const TVChart = dynamic(
  () => import("@/components/tv-chart").then((m) => ({ default: m.TVChart })),
  { ssr: false }
);

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

  const safePredictions = predictions ?? [];

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
      const upper = raw.toUpperCase().replace(/USDT$/, "");
      if (!upper) return undefined;
      return `${upper}USDT`;
    } catch {
      return undefined;
    }
  })();

  const weatherChartParams = (() => {
    try {
      const meta = market.metadata ? JSON.parse(market.metadata) : ({} as Record<string, unknown>);
      const res = meta.resolution as
        | { type?: string; lat?: string | number; lon?: string | number; date?: string; googleMapsUrl?: string }
        | undefined;
      if (!res || (res.type ?? "") !== "weather_rained") return null;
      const lat = res.lat != null ? parseFloat(String(res.lat)) : NaN;
      const lon = res.lon != null ? parseFloat(String(res.lon)) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return {
        lat,
        lon,
        resolutionDate: typeof res.date === "string" && res.date.trim() ? res.date.trim() : undefined,
        googleMapsUrl: typeof res.googleMapsUrl === "string" ? res.googleMapsUrl : undefined,
      };
    } catch {
      return null;
    }
  })();
  const isWeatherMarket = getMarketCategoryFromMetadata(market.metadata) === "weather";

  const [localWeatherParams, setLocalWeatherParams] = useState<{
    lat: number;
    lon: number;
    googleMapsUrl?: string;
    resolutionDate?: string;
  } | null>(null);
  const [localMapsInputValue, setLocalMapsInputValue] = useState("");
  const effectiveWeatherParams = weatherChartParams ?? localWeatherParams;

  const router = useRouter();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editQuestion, setEditQuestion] = useState(market.question);
  const [editBetTokenSymbol, setEditBetTokenSymbol] = useState<string>(() => {
    try {
      const m = market.metadata ? JSON.parse(market.metadata) : {};
      return (m.betToken ?? "ETH").toUpperCase();
    } catch {
      return "ETH";
    }
  });
  const [editSaving, setEditSaving] = useState(false);

  const { address, isConnected } = useAccount();

  let totalYes = marketOnChain
    ? marketOnChain.totalYesStake
    : BigInt(Math.floor(Number(market.total_yes_stake ?? 0)));
  let totalNo = marketOnChain
    ? marketOnChain.totalNoStake
    : BigInt(Math.floor(Number(market.total_no_stake ?? 0)));
  if (totalYes + totalNo === BigInt(0) && userStake && userStake.yesStake + userStake.noStake > BigInt(0)) {
    totalYes = userStake.yesStake;
    totalNo = userStake.noStake;
  }
  const totalStake = totalYes + totalNo;
  const yesPct =
    totalStake > BigInt(0) ? Number((totalYes * BigInt(100)) / totalStake) : 50;
  const noPct = typeof yesPct === "number" && !Number.isNaN(yesPct) ? 100 - yesPct : 50;

  const isResolved = market.status === "Resolved";
  const outcomeYes = market.outcome === "Yes" || marketOnChain?.outcome === OUTCOME.YES;
  const outcomeNo = market.outcome === "No" || marketOnChain?.outcome === OUTCOME.NO;

  const isCreator =
    !!address && !!market.creator && address.toLowerCase() === market.creator.toLowerCase();

  const betToken = getBetTokenFromMetadata(market.metadata);
  const formatAmount = (wei: bigint): string => formatEth(wei).replace(/\s*ETH$/i, "");

  let stakeSummary: string | null = null;
  if (userStake) {
    const hasYes = userStake.yesStake > BigInt(0);
    const hasNo = userStake.noStake > BigInt(0);
    if (hasYes && !hasNo) {
      stakeSummary = `You are currently staked on YES with ${formatAmount(userStake.yesStake)} ${betToken.symbol}.`;
    } else if (!hasYes && hasNo) {
      stakeSummary = `You are currently staked on NO with ${formatAmount(userStake.noStake)} ${betToken.symbol}.`;
    } else if (hasYes && hasNo) {
      stakeSummary = `You are currently staked on YES with ${formatAmount(userStake.yesStake)} and NO with ${formatAmount(userStake.noStake)} ${betToken.symbol}.`;
    }
  }

  const totalStakeEth = Number(formatEther(totalStake));

  useEffect(() => {
    const t = setTimeout(() => setStakesMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const closeUnix = market.close_time;
  const resolveUnix = market.resolve_time;

  return (
    <div className="space-y-0">
      <div className="pb-5 border-b border-border">
        <nav className="flex items-center gap-1.5 font-mono text-xs text-text-muted mb-3" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground transition-colors">
            Markets
          </Link>
          <ChevronRight className="h-3 w-3 opacity-50" />
          <span className="text-text-secondary">#{marketId}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h1 className="font-display font-extrabold text-[22px] leading-tight text-foreground">{market.question}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <span
              className={cn(
                "rounded-full px-3 py-1 font-mono text-[11px] uppercase font-bold",
                STATUS_BADGE_CLASS[market.status] ?? "badge-cancelled"
              )}
            >
              {market.status}
            </span>
            <span className="rounded-full border border-border bg-elevated px-3 py-1 font-mono text-[11px] uppercase text-text-secondary">
              {market.market_type || "Base"}
            </span>
            {market.on_chain_market_id != null ? (
              <span className="flex items-center gap-1.5 rounded-full border border-green/30 bg-green-dim px-3 py-1 font-mono text-[11px] text-green">
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className={cn(
                      "absolute inline-flex h-full w-full rounded-full bg-green",
                      onChainLoading && "animate-ping opacity-60"
                    )}
                  />
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
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 font-display font-bold text-sm",
                  outcomeYes
                    ? "bg-green-dim text-green border border-green/30"
                    : "bg-red-dim text-red border border-red/30"
                )}
              >
                {outcomeYes ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {outcomeYes ? "YES" : "NO"}
              </span>
            )}
            {isCreator && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-cyan/40 text-cyan hover:bg-cyan-dim font-mono text-xs"
                onClick={() => {
                  setEditQuestion(market.question);
                  try {
                    const m = market.metadata ? JSON.parse(market.metadata) : {};
                    setEditBetTokenSymbol((m.betToken ?? "ETH").toUpperCase());
                  } catch {
                    setEditBetTokenSymbol("ETH");
                  }
                  setEditOpen(true);
                }}
                aria-label="Edit market"
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                Edit
              </Button>
            )}
            <ShareMarketButton market={market} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <StatPill
            icon={<BarChart2 className="h-3.5 w-3.5" />}
            label="Total Pool"
            value={`${totalStakeEth.toFixed(4)} ${betToken.symbol}`}
            accent="cyan"
          />
          <StatPill icon={<TrendingUp className="h-3.5 w-3.5" />} label="YES Odds" value={`${yesPct}%`} accent="green" />
          <StatPill icon={<TrendingDown className="h-3.5 w-3.5" />} label="NO Odds" value={`${noPct}%`} accent="red" />
          <StatPill icon={<Clock className="h-3.5 w-3.5" />} label="Closes" value={formatDate(closeUnix)} accent="violet" />
          <StatPill icon={<Clock className="h-3.5 w-3.5" />} label="Resolves" value={formatDate(resolveUnix)} accent="violet" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-0 pt-0">
        <div className="min-w-0 border-r border-border pr-0 lg:pr-5 pt-5">
          {market.market_type === "conditional" && (
            <div className="mb-4">
              <ConditionalTree marketId={marketId} />
            </div>
          )}

          {!isWeatherMarket && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
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

                <div className="flex items-center gap-1.5 rounded-full border border-green/25 bg-elevated px-2.5 py-1 shrink-0">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green" />
                  </span>
                  <span className="font-mono text-[10px] text-green font-medium">Updates every 2s</span>
                </div>
              </div>

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
            </>
          )}

          {isWeatherMarket && effectiveWeatherParams ? (
            <WeatherDetailChart
              lat={effectiveWeatherParams.lat}
              lon={effectiveWeatherParams.lon}
              resolutionDate={effectiveWeatherParams.resolutionDate}
              googleMapsUrl={effectiveWeatherParams.googleMapsUrl}
              className="mb-6"
            />
          ) : isWeatherMarket ? (
            <div className="rounded-xl border border-border bg-elevated/30 px-4 py-6">
              <p className="font-mono text-sm text-foreground mb-1 text-center">Weather chart (history + forecast)</p>
              <p className="font-mono text-xs text-text-muted text-center mb-4">
                Paste the Google Maps link for the location (Share location) to see the chart with real data and forecast.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
                <Input
                  type="url"
                  placeholder="https://www.google.com/maps/@9.03,-79.51,12z"
                  value={localMapsInputValue}
                  onChange={(e) => setLocalMapsInputValue(e.target.value)}
                  className="font-mono text-sm flex-1"
                  aria-label="Google Maps link"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-cyan text-cyan hover:bg-cyan/10 font-mono shrink-0"
                  onClick={() => {
                    const coords = parseGoogleMapsUrl(localMapsInputValue);
                    if (coords) {
                      setLocalWeatherParams({
                        lat: coords.lat,
                        lon: coords.lon,
                        googleMapsUrl: localMapsInputValue.trim() || undefined,
                      });
                    } else {
                      toast.error("Invalid link. Paste a Google Maps location link (e.g. from Share location).");
                    }
                  }}
                >
                  View chart
                </Button>
              </div>
            </div>
          ) : (
            <TVChart
              height={480}
              embedded
              symbol={chartSymbol}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              indicators={indicators}
              onIndicatorsChange={setIndicators}
            />
          )}

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-[12px] text-text-muted tracking-widest uppercase">Market Stakes</h2>
              <span className="font-mono text-xs text-text-muted">
                {totalStakeEth.toFixed(4)} {betToken.symbol} total
              </span>
            </div>

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
                  YES — {formatAmount(totalYes)} {betToken.symbol} ({yesPct}%)
                </span>
                <span className="flex items-center gap-1.5 text-red">
                  NO — {formatAmount(totalNo)} {betToken.symbol} ({noPct}%)
                  <span className="h-2 w-2 rounded-full bg-red" />
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div
                className={cn(
                  "rounded-xl border p-4 text-center transition-all",
                  yesPct >= noPct ? "border-green/40 bg-green-dim" : "border-border bg-elevated"
                )}
              >
                <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider mb-1">YES Implied</p>
                <p className={cn("font-display font-extrabold text-3xl", yesPct >= noPct ? "text-green" : "text-foreground")}>
                  {yesPct}%
                </p>
                <p className="font-mono text-xs text-text-muted mt-1">
                  {formatAmount(totalYes)} {betToken.symbol} staked
                </p>
              </div>
              <div
                className={cn(
                  "rounded-xl border p-4 text-center transition-all",
                  noPct > yesPct ? "border-red/40 bg-red-dim" : "border-border bg-elevated"
                )}
              >
                <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider mb-1">NO Implied</p>
                <p className={cn("font-display font-extrabold text-3xl", noPct > yesPct ? "text-red" : "text-foreground")}>
                  {noPct}%
                </p>
                <p className="font-mono text-xs text-text-muted mt-1">
                  {formatAmount(totalNo)} {betToken.symbol} staked
                </p>
              </div>
            </div>
          </div>

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

            <AIAnalysisBlock marketId={marketId} binanceSymbol={chartSymbol ?? "BTCUSDT"} />

            {safePredictions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <BarChart2 className="h-8 w-8 text-text-muted opacity-30" />
                <p className="font-mono text-sm text-text-muted">No predictions yet</p>
                <p className="font-mono text-xs text-text-muted opacity-60">Use the AI Preview in the sidebar to generate one</p>
              </div>
            ) : safePredictions.length > 1 ? (
              <ul className="space-y-3">
                {safePredictions.map((p, i) => (
                  <PredictionRow key={i} p={p} />
                ))}
              </ul>
            ) : (
              <PredictionRow p={safePredictions[0]} />
            )}
          </div>

          <div className="mt-6">
            <SignalFusionPanel defaultParams={{ binanceSymbol: chartSymbol ?? "BTCUSDT", marketId }} />
          </div>

          <div className="mt-6">
            <PHPEHistoryChart predictions={safePredictions} />
          </div>
        </div>

        <aside className="lg:pl-5 pt-5 space-y-4 min-w-0">
          <div className="lg:sticky lg:top-4 space-y-4">
            <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
              <CountdownBlocks targetUnix={closeUnix} label="CLOSES IN" />
              <div className="border-t border-border pt-4">
                <CountdownBlocks
                  targetUnix={resolveUnix}
                  label="RESOLVES IN"
                  urgentClassName="border-violet/60 bg-violet-dim text-violet"
                />
              </div>
              <TimelineBar closeUnix={closeUnix} resolveUnix={resolveUnix} />
            </div>

            {isConnected && stakeSummary && (
              <p className="font-mono text-[11px] text-text-muted px-1">{stakeSummary}</p>
            )}

            {market.market_type === "private" ? (
              <CommitRevealWizard marketId={marketId} />
            ) : (
              <div className="rounded-xl border border-border bg-surface p-4">
                <h3 className="font-display font-bold text-[11px] text-text-muted tracking-widest uppercase mb-4">Place Bet</h3>
                {market.on_chain_market_id == null && onChainLoading && !marketOnChain && (
                  <p className="mb-3 font-mono text-[10px] text-text-muted animate-pulse">Checking on-chain status…</p>
                )}
                {market.on_chain_market_id == null && !onChainLoading && (onChainError || !marketOnChain) && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/8 px-3 py-2">
                    <span className="text-cyan-400 text-sm shrink-0 mt-0.5" aria-hidden>
                      ℹ
                    </span>
                    <p className="font-mono text-[10px] text-cyan-200/90 leading-relaxed">
                      To bet on-chain, the market must be deployed on the network. You can create it from{" "}
                      <Link href="/markets/create" className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200">
                        Create Market
                      </Link>
                      .
                    </p>
                  </div>
                )}
                <BetForm
                  marketId={marketId}
                  marketStatus={market.status}
                  closeTime={market.close_time}
                  question={market.question}
                  metadata={market.metadata}
                  onBetSuccess={onBetSuccess}
                />
              </div>
            )}

            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center justify-between p-4 text-left"
                onClick={() => setAiCollapsed(!aiCollapsed)}
                aria-expanded={!aiCollapsed}
              >
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-[11px] text-text-muted tracking-widest uppercase">AI Preview</span>
                  <span className="rounded-full border border-violet/30 bg-violet-dim px-2 py-0.5 font-mono text-[9px] text-violet uppercase">
                    PHPE v2
                  </span>
                </div>
                {aiCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-text-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-muted" />
                )}
              </button>
              {!aiCollapsed && (
                <div className="border-t border-border p-4">
                  <PHPEWidget marketId={marketId} />
                </div>
              )}
            </div>

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
              <div className="mt-4 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-red/50 text-red hover:bg-red-dim font-mono text-xs"
                  disabled={isDeleting}
                  onClick={async () => {
                    if (!confirm("Delete this market from the app? (Development only)")) return;
                    setIsDeleting(true);
                    try {
                      await deleteMarket(market.id);
                      await queryClient.invalidateQueries({ queryKey: ["markets"] });
                      await queryClient.invalidateQueries({ queryKey: ["markets-infinite"] });
                      await queryClient.invalidateQueries({ queryKey: ["market", market.id] });
                      await queryClient.invalidateQueries({ queryKey: ["stats"] });
                      toast.success("Market deleted");
                      router.push("/");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Error deleting");
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  aria-label="Delete market (development only)"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" aria-hidden />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                  )}
                  Delete market
                </Button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md border-border bg-surface" showClose>
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">Edit market</DialogTitle>
            <DialogDescription>
              You can only change the displayed question and the bet currency. On-chain times and status are immutable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block font-mono text-[11px] text-text-muted uppercase tracking-wider mb-2">Question</label>
              <Textarea
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                className="min-h-[100px] font-body text-foreground"
                placeholder="Market question"
                maxLength={500}
              />
              <p className="mt-1 font-mono text-[10px] text-text-muted">{editQuestion.length}/500</p>
            </div>
            <div>
              <label className="block font-mono text-[11px] text-text-muted uppercase tracking-wider mb-2">Bet currency</label>
              <Select value={editBetTokenSymbol} onValueChange={setEditBetTokenSymbol}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BET_TOKENS.map((t) => (
                    <SelectItem key={t.symbol} value={t.symbol}>
                      <span className="flex items-center gap-2">
                        <span style={{ color: t.color }}>{t.icon}</span>
                        {t.symbol} — {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-cyan text-black hover:bg-cyan/90"
              disabled={editSaving || editQuestion.trim().length < 10}
              onClick={async () => {
                setEditSaving(true);
                try {
                  const currentMeta = market.metadata ? JSON.parse(market.metadata) : {};
                  const newMetadata = JSON.stringify({
                    ...currentMeta,
                    betToken: editBetTokenSymbol,
                  });
                  await updateMarket(market.id, {
                    question: editQuestion.trim(),
                    metadata: newMetadata,
                  });
                  await queryClient.invalidateQueries({ queryKey: ["market", market.id] });
                  await queryClient.invalidateQueries({ queryKey: ["market", marketId] });
                  await queryClient.invalidateQueries({ queryKey: ["markets"] });
                  await queryClient.invalidateQueries({ queryKey: ["markets-infinite"] });
                  toast.success("Market updated");
                  setEditOpen(false);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to save");
                } finally {
                  setEditSaving(false);
                }
              }}
            >
              {editSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
