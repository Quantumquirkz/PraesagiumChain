"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Eye,
  Trophy,
  ExternalLink,
  PlusCircle,
  AlertTriangle,
  Copy,
  CheckCircle,
} from "lucide-react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CommitRevealWizard } from "@/components/commit-reveal-wizard";
import { JoinPrivateMarketCard, getStoredPrivateMarketIds, addStoredPrivateMarketId } from "@/features/markets/components/join-private-market-card";
import { usePrivateMarket } from "@/features/markets/hooks/use-private-markets";
import { getPrivateMarketsByCreator } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PrivateMarketByCreatorItem } from "@/types/api";

const CHAINLINK_CRE_URL =
  "https://blog.chain.link/chainlink-confidential-compute/";

const PRIVATE_MARKET_ADDRESS =
  process.env.NEXT_PUBLIC_PRIVATE_MARKET_ADDRESS ?? "";

const IS_DEPLOYED =
  PRIVATE_MARKET_ADDRESS !== "" &&
  PRIVATE_MARKET_ADDRESS !== "0x0000000000000000000000000000000000000000";

// ─── How it works steps ───────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    icon: Lock,
    step: "01",
    title: "Commit",
    description:
      "Submit a cryptographic hash of your bet (outcome + amount + secret nonce). Your position is completely hidden on-chain.",
    accent: "violet" as const,
  },
  {
    icon: Eye,
    step: "02",
    title: "Reveal",
    description:
      "After the market resolves, reveal your nonce to prove your original position. The contract verifies the hash and registers your stake.",
    accent: "cyan" as const,
  },
  {
    icon: Trophy,
    step: "03",
    title: "Claim",
    description:
      "Winners claim their proportional share of the total committed pool. Losers' funds are distributed to winners transparently.",
    accent: "gold" as const,
  },
] as const;

const ACCENT = {
  violet: { icon: "text-violet bg-violet-dim border-violet/30", number: "text-violet" },
  cyan:   { icon: "text-cyan bg-cyan-dim border-cyan/30",       number: "text-cyan"   },
  gold:   { icon: "text-gold bg-[rgba(245,166,35,0.12)] border-gold/30", number: "text-gold" },
} as const;

// ─── Creator's private market card (list item with copy token) ─────────────────

function CreatorPrivateMarketCard({
  item,
  onEnsureInList,
}: {
  item: PrivateMarketByCreatorItem;
  onEnsureInList: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const closeDate = new Date(item.close_time * 1000).toLocaleDateString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });

  const copyToken = async () => {
    await navigator.clipboard.writeText(item.access_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/markets/private?key=${encodeURIComponent(item.access_key)}`
      : "";

  return (
    <div className="rounded-xl border border-violet/30 bg-violet-dim/30 p-4">
      <h3 className="font-display font-bold text-[15px] text-foreground leading-tight mb-2 line-clamp-2">
        {item.question}
      </h3>
      <p className="font-mono text-[11px] text-text-muted mb-3">Closes: {closeDate}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-violet/40 text-violet hover:bg-violet/20 font-mono text-xs"
          onClick={copyToken}
        >
          {copied ? (
            <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-green" aria-hidden />
          ) : (
            <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          )}
          {copied ? "Copied" : "Copy token"}
        </Button>
        {shareUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="font-mono text-xs text-text-secondary hover:text-foreground"
            onClick={async () => {
              await navigator.clipboard.writeText(shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            Copy link
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="border-cyan/40 text-cyan hover:bg-cyan/10 font-mono text-xs"
          onClick={onEnsureInList}
        >
          View market
        </Button>
      </div>
    </div>
  );
}

// ─── Single private market card ───────────────────────────────────────────────

function PrivateMarketCard({ marketId }: { marketId: number }) {
  const [expanded, setExpanded] = useState(false);
  const { market, isLoading, isError } = usePrivateMarket(marketId);

  if (isLoading) {
    return (
      <div className="card-glow rounded-xl p-5 space-y-3 animate-pulse">
        <div className="h-4 w-3/4 rounded bg-elevated" />
        <div className="h-3 w-1/2 rounded bg-elevated" />
      </div>
    );
  }

  if (isError || !market) {
    return (
      <div className="rounded-xl border border-border bg-elevated p-5 text-center">
        <p className="font-mono text-xs text-text-muted">Market #{marketId} not found</p>
      </div>
    );
  }

  const statusColor =
    market.status === "Open"
      ? "text-green border-green/30 bg-green-dim"
      : market.status === "Resolved"
      ? "text-cyan border-cyan/30 bg-cyan-dim"
      : market.status === "Locked"
      ? "text-gold border-gold/30 bg-[rgba(245,166,35,0.12)]"
      : "text-text-muted border-border bg-elevated";

  const closeDate = new Date(market.closeTime * 1000).toLocaleDateString();
  const isBettingOpen = market.status === "Open" && market.closeTime * 1000 > Date.now();

  return (
    <div className="card-glow rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-display font-bold text-[16px] text-foreground leading-tight flex-1">
            {market.question}
          </h3>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest",
              statusColor
            )}
          >
            {market.status}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg bg-elevated border border-border p-2.5 text-center">
            <p className="font-mono text-[9px] text-text-muted uppercase tracking-widest mb-0.5">
              Pool
            </p>
            <p className="font-mono text-sm font-bold text-violet">
              {parseFloat(market.totalCommittedEth).toFixed(4)} ETH
            </p>
          </div>
          <div className="rounded-lg bg-elevated border border-border p-2.5 text-center">
            <p className="font-mono text-[9px] text-text-muted uppercase tracking-widest mb-0.5">
              Closes
            </p>
            <p className="font-mono text-xs text-foreground">{closeDate}</p>
          </div>
          <div className="rounded-lg bg-elevated border border-border p-2.5 text-center">
            <p className="font-mono text-[9px] text-text-muted uppercase tracking-widest mb-0.5">
              Outcome
            </p>
            <p
              className={cn(
                "font-mono text-xs font-bold",
                market.outcome === "Yes"
                  ? "text-green"
                  : market.outcome === "No"
                  ? "text-red"
                  : "text-text-muted"
              )}
            >
              {market.outcome}
            </p>
          </div>
        </div>

        {isBettingOpen && (
          <Button
            variant="outline"
            className="w-full border-violet/40 text-violet hover:bg-violet-dim font-mono text-sm"
            onClick={() => setExpanded((e) => !e)}
          >
            <Lock className="mr-2 h-4 w-4" />
            {expanded ? "Hide Bet Form" : "Place Private Bet"}
          </Button>
        )}

        {(market.status === "Resolved" || market.status === "Locked") && (
          <Button
            variant="outline"
            className="w-full border-cyan/40 text-cyan hover:bg-cyan-dim font-mono text-sm"
            onClick={() => setExpanded((e) => !e)}
          >
            <Eye className="mr-2 h-4 w-4" />
            {expanded ? "Hide" : "Reveal / Claim"}
          </Button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border p-4">
          <CommitRevealWizard marketId={marketId} />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// Known deployed private market IDs (populated after deploy)
// In production this would come from an indexer; for now we seed from env
const KNOWN_MARKET_IDS: number[] = process.env.NEXT_PUBLIC_PRIVATE_MARKET_IDS
  ? process.env.NEXT_PUBLIC_PRIVATE_MARKET_IDS.split(",").map(Number).filter(Boolean)
  : [];

function PrivateMarketsPageInner() {
  const { isConnected, address } = useAccount();
  const searchParams = useSearchParams();
  const keyFromUrl = searchParams.get("key") ?? "";

  const [joinedIds, setJoinedIds] = useState<number[]>(() => getStoredPrivateMarketIds());

  const { data: creatorMarkets = [] } = useQuery({
    queryKey: ["private-markets-by-creator", address ?? ""],
    queryFn: () => getPrivateMarketsByCreator(address!),
    enabled: Boolean(address),
    staleTime: 60_000,
  });

  const creatorMarketIds = creatorMarkets.map((m) => m.market_id);
  const allMarketIds = [...new Set([...KNOWN_MARKET_IDS, ...joinedIds, ...creatorMarketIds])];

  // Sync joinedIds from localStorage on mount (e.g. from another tab)
  useEffect(() => {
    setJoinedIds(getStoredPrivateMarketIds());
  }, []);

  const joinSectionRef = useRef<HTMLDivElement>(null);
  const joinParam = searchParams.get("join");
  useEffect(() => {
    if (joinParam === "1" && joinSectionRef.current) {
      joinSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [joinParam]);

  return (
    <div className="space-y-10">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-2xl hero-gradient py-14 px-6 text-center">
        {/* Background: grid + orbs (Light/Dark via CSS vars) */}
        <div className="private-hero-grid" aria-hidden />
        <div className="private-hero-orb-violet" aria-hidden />
        <div className="private-hero-orb-cyan" aria-hidden />
        {/* Hexagons with float animation */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {[
            { x: "5%",  y: "15%", size: 60, extra: "" },
            { x: "88%", y: "10%", size: 80, extra: "private-hex-float-2" },
            { x: "80%", y: "65%", size: 50, extra: "private-hex-float-3" },
          ].map((h, i) => (
            <svg
              key={i}
              className={cn("private-hex-float", h.extra)}
              style={{ position: "absolute", left: h.x, top: h.y, width: h.size, height: h.size }}
              viewBox="0 0 100 100"
              fill="none"
            >
              <path d="M50 5L90 27.5V72.5L50 95L10 72.5V27.5L50 5Z" stroke="var(--violet)" strokeWidth="1.5" />
            </svg>
          ))}
        </div>

        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet-dim px-4 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-violet" aria-hidden />
            <span className="font-mono text-[11px] text-violet uppercase tracking-widest">
              Commit-Reveal · Privacy-Preserving
            </span>
          </div>

          <h1
            className="font-display font-extrabold leading-none tracking-tight"
            style={{ fontSize: "clamp(36px, 6vw, 64px)" }}
          >
            <span className="block text-foreground">PRIVATE</span>
            <span
              className="block"
              style={{
                background: "linear-gradient(90deg, var(--violet), var(--cyan))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              PREDICTION MARKETS
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl font-body text-base text-text-secondary leading-relaxed">
            Place bets without revealing your position until the market resolves.
            Powered by commit-reveal cryptography — the same architecture used by
            Chainlink Confidential Compute.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {IS_DEPLOYED ? (
              <Link
                href="/markets/create?type=private"
                className="inline-flex items-center gap-2 rounded-lg p-[1px] bg-gradient-to-r from-violet to-cyan hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-shadow"
              >
                <span className="flex items-center gap-2 rounded-[calc(0.5rem-1px)] bg-surface hover:bg-violet-dim transition-colors px-5 py-2.5">
                  <PlusCircle className="h-4 w-4 text-violet" aria-hidden />
                  <span className="font-body font-semibold text-sm text-foreground">
                    Create Private Market
                  </span>
                </span>
              </Link>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-lg border border-border-bright bg-elevated px-5 py-2.5 opacity-60 cursor-not-allowed">
                <PlusCircle className="h-4 w-4 text-text-muted" aria-hidden />
                <span className="font-body font-semibold text-sm text-text-muted">
                  Create Private Market
                </span>
              </div>
            )}

            <a
              href={CHAINLINK_CRE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border-bright bg-elevated hover:border-violet/50 hover:bg-violet-dim transition-colors px-5 py-2.5"
            >
              <ExternalLink className="h-4 w-4 text-text-muted" aria-hidden />
              <span className="font-body font-semibold text-sm text-text-secondary">
                Chainlink CRE Docs
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Contract not deployed banner ── */}
      {!IS_DEPLOYED && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="font-mono text-sm text-amber-400 font-bold">
              Contract not deployed
            </p>
            <p className="font-body text-sm text-text-secondary mt-1">
              The <code className="font-mono text-xs">PrivatePredictionMarket</code> contract
              has not been deployed yet. For <strong>Sepolia</strong>, run{" "}
              <code className="font-mono text-xs text-cyan">
                npx hardhat run scripts/deploy-private.js --network sepolia
              </code>
              . For <strong>localhost</strong>, run{" "}
              <code className="font-mono text-xs text-cyan">npm run deploy:private</code>.
              Then set <code className="font-mono text-xs">NEXT_PUBLIC_PRIVATE_MARKET_ADDRESS</code> in{" "}
              <code className="font-mono text-xs">.env</code>.
            </p>
          </div>
        </div>
      )}

      {/* ── Join private market ── */}
      <section ref={joinSectionRef}>
        <JoinPrivateMarketCard
          initialKey={keyFromUrl}
          onJoined={(marketId) => setJoinedIds((prev) => (prev.includes(marketId) ? prev : [...prev, marketId]))}
        />
      </section>

      {/* ── My private markets (only the creator can see them) ── */}
      {isConnected && address && creatorMarkets.length > 0 && (
        <section>
          <p className="font-mono text-xs text-violet uppercase tracking-widest mb-3">
            Only you can see these markets
          </p>
          <h2
            className="font-display font-extrabold text-foreground leading-none mb-2"
            style={{ fontSize: "clamp(22px, 3vw, 28px)" }}
          >
            My private markets
          </h2>
          <p className="font-body text-sm text-text-secondary mb-5">
            Markets you created. Share the access token so others can join. Nobody else can see them without the token.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {creatorMarkets.map((m) => (
              <CreatorPrivateMarketCard
                key={m.market_id}
                item={m}
                onEnsureInList={() => {
                  addStoredPrivateMarketId(m.market_id);
                  setJoinedIds(getStoredPrivateMarketIds());
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── How it works ── */}
      <section>
        <p className="font-mono text-xs text-violet uppercase tracking-widest mb-3">
          The Process
        </p>
        <h2
          className="font-display font-extrabold text-foreground leading-none mb-8"
          style={{ fontSize: "clamp(28px, 4vw, 40px)" }}
        >
          HOW COMMIT-REVEAL WORKS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {HOW_IT_WORKS.map((step, i) => {
            const Icon = step.icon;
            const ac = ACCENT[step.accent];
            return (
              <div key={step.step} className="card-glow rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border",
                      ac.icon
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <span className={cn("font-mono text-[11px] font-medium tracking-widest", ac.number)}>
                    {step.step}
                  </span>
                </div>
                <h3 className="font-display font-bold text-[18px] text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="font-body text-sm text-text-secondary leading-relaxed">
                  {step.description}
                </p>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-4 h-px bg-border-bright" aria-hidden />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Chainlink CRE info card ── */}
      <section className="card-gradient-border rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-violet/30 bg-violet-dim">
            <ShieldCheck className="h-7 w-7 text-violet" aria-hidden />
          </div>
          <div className="flex-1">
            <p className="font-mono text-xs text-violet uppercase tracking-widest mb-1">
              Powered by
            </p>
            <h3 className="font-display font-bold text-[20px] text-foreground leading-tight">
              Chainlink Confidential Compute Architecture
            </h3>
            <p className="mt-2 font-body text-sm text-text-secondary leading-relaxed">
              PraesagiumChain&apos;s private markets implement the commit-reveal pattern
              that underpins Chainlink&apos;s Confidential Compute service. When CRE
              General Access launches in 2026, this architecture will enable fully
              private smart contracts with TEE-backed computation — keeping positions,
              amounts, and logic confidential while remaining verifiable on-chain.
            </p>
          </div>
          <a
            href={CHAINLINK_CRE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-violet/40 bg-violet-dim hover:bg-violet/20 transition-colors px-4 py-2.5"
          >
            <ExternalLink className="h-4 w-4 text-violet" aria-hidden />
            <span className="font-mono text-xs text-violet">Read More</span>
          </a>
        </div>
      </section>

      {/* ── Market list ── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-mono text-xs text-violet uppercase tracking-widest mb-1">
              On-Chain
            </p>
            <h2
              className="font-display font-extrabold text-foreground leading-none"
              style={{ fontSize: "clamp(24px, 3vw, 36px)" }}
            >
              PRIVATE MARKETS
            </h2>
          </div>
          {IS_DEPLOYED && (
            <Link href="/markets/create?type=private">
              <Button
                variant="outline"
                className="border-violet/40 text-violet hover:bg-violet-dim font-mono text-sm"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New Market
              </Button>
            </Link>
          )}
        </div>

        {!isConnected && (
          <div className="rounded-xl border border-border-bright bg-elevated px-5 py-8 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-text-muted mb-3" aria-hidden />
            <p className="font-body text-sm text-text-secondary">
              Connect your wallet to interact with private markets.
            </p>
          </div>
        )}

        {isConnected && allMarketIds.length === 0 && (
          <div className="rounded-xl border border-dashed border-border-bright bg-elevated px-5 py-10 text-center">
            <Lock className="mx-auto h-8 w-8 text-text-muted mb-3" aria-hidden />
            <p className="font-display font-bold text-[16px] text-text-secondary mb-1">
              No private markets yet
            </p>
            <p className="font-body text-sm text-text-muted mb-4">
              Be the first to create a private prediction market.
            </p>
            {IS_DEPLOYED && (
              <Link href="/markets/create?type=private">
                <Button
                  variant="outline"
                  className="border-violet/40 text-violet hover:bg-violet-dim font-mono text-sm"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Private Market
                </Button>
              </Link>
            )}
          </div>
        )}

        {isConnected && allMarketIds.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allMarketIds.map((id) => (
              <PrivateMarketCard key={id} marketId={id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function PrivateMarketsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-10 animate-pulse">
        <div className="h-48 rounded-2xl bg-elevated" />
        <div className="h-32 rounded-xl bg-elevated" />
      </div>
    }>
      <PrivateMarketsPageInner />
    </Suspense>
  );
}
