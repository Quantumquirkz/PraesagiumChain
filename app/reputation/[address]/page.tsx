"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { getReputation } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { EXPLORER_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function addressToGradient(address: string): { gradient: string; hue: number } {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  const h2 = (h + 120) % 360;
  return {
    gradient: `linear-gradient(135deg, hsl(${h}, 70%, 55%), hsl(${h2}, 70%, 45%))`,
    hue: h,
  };
}

function getInitials(address: string): string {
  const clean = address.replace(/^0x/i, "").slice(0, 4).toUpperCase();
  return "0x" + (clean || "??");
}

function scoreColor(score: number): string {
  if (score < 40) return "#FF3D5A";
  if (score <= 70) return "#F5A623";
  return "#00E87A";
}

const BADGES: { id: string; emoji: string; label: string; show: (rep: { markets_created: number; correct_predictions: number; reputation_score: number }) => boolean; borderClass: string; tooltip: string }[] = [
  { id: "early", emoji: "⚡", label: "Early Adopter", show: () => true, borderClass: "border-border", tooltip: "Joined PraesagiumChain in the early days" },
  { id: "whale", emoji: "🐋", label: "Whale", show: (r) => r.markets_created > 10, borderClass: "border-gold", tooltip: "Created more than 10 markets" },
  { id: "oracle", emoji: "🎯", label: "Oracle", show: (r) => r.correct_predictions > 20, borderClass: "border-cyan", tooltip: "More than 20 correct predictions" },
  { id: "streak", emoji: "🔥", label: "Streak Master", show: (r) => r.reputation_score > 80, borderClass: "border-violet shadow-[0_0_12px_rgba(139,92,246,0.4)]", tooltip: "Reputation score above 80" },
];

/** Mock activity - in a real app would come from API */
function getRecentActivity(rep: { creator_address: string; markets_created: number; markets_resolved: number; correct_predictions: number; updated_at: number }): { text: string; timeAgo: string }[] {
  const now = Math.floor(Date.now() / 1000);
  const activities: { text: string; timeAgo: string }[] = [];
  if (rep.markets_created > 0) {
    activities.push({ text: `Created market #${rep.markets_created}`, timeAgo: formatRelativeTime(rep.updated_at - 86400 * 2) });
  }
  if (rep.correct_predictions > 0) {
    activities.push({ text: `Won on ${rep.correct_predictions} prediction(s)`, timeAgo: formatRelativeTime(rep.updated_at - 86400 * 7) });
  }
  if (rep.markets_resolved > 0) {
    activities.push({ text: `Resolved ${rep.markets_resolved} market(s)`, timeAgo: formatRelativeTime(rep.updated_at - 86400 * 14) });
  }
  activities.push({ text: "Joined PraesagiumChain", timeAgo: formatRelativeTime(rep.updated_at - 86400 * 30) });
  return activities.slice(0, 6);
}

export default function ReputationAddressPage() {
  const params = useParams();
  const address = params?.address as string | undefined;
  const [gaugeReady, setGaugeReady] = useState(false);

  const { data: rep, isLoading, isError, error } = useQuery({
    queryKey: ["reputation", address],
    queryFn: () => getReputation(address!),
    enabled: !!address && /^0x[a-fA-F0-9]{40}$/.test(address),
  });

  useEffect(() => {
    if (!rep) return;
    const t = setTimeout(() => setGaugeReady(true), 150);
    return () => clearTimeout(t);
  }, [rep]);

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return (
      <div className="container py-8 px-4">
        <p className="font-body text-text-muted">Invalid address</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container py-8 px-4">
        <div className="rounded-md border border-red/40 bg-red-dim p-6 text-center">
          <p className="font-body text-red">{error instanceof Error ? error.message : "Failed to load reputation"}</p>
        </div>
      </div>
    );
  }

  if (isLoading || !rep) {
    return (
      <div className="container py-8 px-4">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
          <Skeleton className="h-[420px] rounded-md" />
          <Skeleton className="h-80 rounded-md" />
        </div>
      </div>
    );
  }

  const { gradient, hue } = addressToGradient(rep.creator_address);
  const score = rep.reputation_score;
  const color = scoreColor(score);
  const winRate = rep.markets_resolved > 0 ? Math.round((rep.correct_predictions / rep.markets_resolved) * 100) : 0;
  const circumference = 2 * Math.PI * 54;
  const strokeDash = (score / 100) * circumference;
  const activity = getRecentActivity(rep);
  const visibleBadges = BADGES.filter((b) => b.show(rep));

  return (
    <div className="container py-8 px-4">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        {/* ——— COLUMNA IZQUIERDA ——— */}
        <div className="card-gradient-border rounded-md p-6">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div
              className="relative flex h-20 w-20 items-center justify-center rounded-lg"
              style={{
                background: gradient,
                boxShadow: `0 0 24px hsla(${hue}, 70%, 50%, 0.5)`,
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              }}
              aria-hidden
            >
              <span className="font-display font-extrabold text-[24px] text-white drop-shadow-md">
                {getInitials(rep.creator_address)}
              </span>
            </div>
            <p className="mt-4 font-mono text-[13px] text-text-secondary break-all text-center">
              {rep.creator_address}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy} aria-label="Copy address">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild aria-label="View on Etherscan">
                <Link href={`${EXPLORER_URL}/address/${rep.creator_address}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Reputation Score */}
          <div className="mt-8 flex flex-col items-center">
            <div className="relative inline-flex items-center justify-center">
              <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke={color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - strokeDash}
                  className="transition-[stroke-dashoffset] duration-1000 ease-out"
                  style={{ strokeDashoffset: gaugeReady ? circumference - strokeDash : circumference }}
                />
              </svg>
              <span
                className="absolute font-display font-extrabold text-[64px] tabular-nums leading-none"
                style={{ color }}
              >
                {score}
              </span>
            </div>
            <p className="mt-2 font-display font-bold text-[11px] text-text-muted tracking-widest uppercase">
              REPUTATION SCORE
            </p>
          </div>

          {/* Stats grid 2x2 */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-md border border-border bg-elevated/50 p-3">
              <p className="font-mono text-2xl text-foreground">{rep.markets_created}</p>
              <p className="font-body text-[11px] text-text-muted uppercase tracking-wider mt-0.5">Markets Created</p>
            </div>
            <div className="rounded-md border border-border bg-elevated/50 p-3">
              <p className="font-mono text-2xl text-foreground">{rep.markets_resolved}</p>
              <p className="font-body text-[11px] text-text-muted uppercase tracking-wider mt-0.5">Markets Resolved</p>
            </div>
            <div className="rounded-md border border-border bg-elevated/50 p-3">
              <p className="font-mono text-2xl text-foreground">{rep.correct_predictions}</p>
              <p className="font-body text-[11px] text-text-muted uppercase tracking-wider mt-0.5">Correct Predictions</p>
            </div>
            <div className="rounded-md border border-border bg-elevated/50 p-3">
              <p className="font-mono text-2xl text-foreground">{winRate}%</p>
              <p className="font-body text-[11px] text-text-muted uppercase tracking-wider mt-0.5">Win Rate</p>
            </div>
          </div>

          {/* Badges */}
          {visibleBadges.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {visibleBadges.map((b) => (
                <span
                  key={b.id}
                  title={b.tooltip}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border bg-elevated px-3 py-1.5 font-body text-xs",
                    b.borderClass
                  )}
                >
                  <span aria-hidden>{b.emoji}</span>
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ——— COLUMNA DERECHA ——— */}
        <div>
          <h2 className="font-display font-bold text-[13px] text-text-muted tracking-widest uppercase mb-4">
            RECENT ACTIVITY
          </h2>
          <div className="relative pl-6">
            {/* Vertical dotted line */}
            <div
              className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
              style={{
                background: "repeating-linear-gradient(to bottom, var(--cyan) 0, var(--cyan) 4px, transparent 4px, transparent 10px)",
                opacity: 0.8,
              }}
            />
            <ul className="space-y-4">
              {activity.map((evt, i) => (
                <li key={i} className="relative flex gap-3">
                  <span
                    className="absolute left-[-26px] top-1.5 h-2 w-2 rounded-full bg-cyan shrink-0"
                    aria-hidden
                  />
                  <div>
                    <p className="font-body text-sm text-foreground">{evt.text}</p>
                    <p className="font-mono text-[11px] text-text-muted mt-0.5">{evt.timeAgo}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
