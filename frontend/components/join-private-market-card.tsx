"use client";

import { useState } from "react";
import { Lock, Unlock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validatePrivateMarketKey } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "praesagium_private_markets";

export function getStoredPrivateMarketIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is number => typeof v === "number") : [];
  } catch {
    return [];
  }
}

export function addStoredPrivateMarketId(marketId: number): void {
  const ids = getStoredPrivateMarketIds();
  if (!ids.includes(marketId)) {
    ids.push(marketId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }
}

interface JoinPrivateMarketCardProps {
  initialKey?: string;
  onJoined?: (marketId: number) => void;
  className?: string;
}

export function JoinPrivateMarketCard({
  initialKey = "",
  onJoined,
  className,
}: JoinPrivateMarketCardProps) {
  const [key, setKey] = useState(initialKey);
  const [isLoading, setIsLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) {
      toast.error("Please enter an access key");
      return;
    }

    setIsLoading(true);
    try {
      const data = await validatePrivateMarketKey(trimmed);
      addStoredPrivateMarketId(data.market_id);
      setUnlocked(true);
      onJoined?.(data.market_id);
      toast.success("Market unlocked! You can now view and interact with it.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid or expired key";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-violet/30 bg-surface/80 p-6 backdrop-blur-sm",
        "bg-gradient-to-br from-violet/5 via-surface to-cyan/5",
        "shadow-[0_0_24px_rgba(139,92,246,0.08)]",
        className
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-300",
            unlocked ? "border-cyan/50 bg-cyan-dim text-cyan" : "border-violet/40 bg-violet-dim text-violet"
          )}
          aria-hidden
        >
          {unlocked ? (
            <Unlock className="h-6 w-6" aria-hidden />
          ) : (
            <Lock className="h-6 w-6" aria-hidden />
          )}
        </div>
        <div>
          <h3 className="font-display font-bold text-lg text-foreground">
            {unlocked ? "Market unlocked" : "Have an invite code?"}
          </h3>
          <p className="font-mono text-[11px] text-text-muted">
            {unlocked
              ? "The market has been added to your list below."
              : "Ask the creator for the access code. It looks like PRIV-XXXXXXXX."}
          </p>
        </div>
      </div>

      {!unlocked && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="PRIV-XXXXXXXX"
            className="w-full rounded-lg border border-border-bright bg-elevated px-4 py-3 font-mono text-sm text-foreground placeholder:text-text-muted focus:border-violet/50 focus:outline-none focus:ring-2 focus:ring-violet/20"
            disabled={isLoading}
            aria-label="Access key"
          />
          <Button
            type="submit"
            disabled={isLoading || !key.trim()}
            className="w-full border-violet/40 bg-violet-dim text-violet hover:bg-violet/20 font-mono text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Validating...
              </>
            ) : (
              <>
                <Unlock className="mr-2 h-4 w-4" aria-hidden />
                Unlock / Join market
              </>
            )}
          </Button>
        </form>
      )}

      {unlocked && (
        <Button
          variant="outline"
          className="w-full border-cyan/40 text-cyan hover:bg-cyan-dim font-mono text-sm"
          onClick={() => setUnlocked(false)}
        >
          Enter another code
        </Button>
      )}
    </div>
  );
}
