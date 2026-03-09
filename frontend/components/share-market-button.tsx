"use client";

import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import type { MarketView } from "@/types/api";
import { cn } from "@/lib/utils";

interface ShareMarketButtonProps {
  market: MarketView;
  className?: string;
}

export function ShareMarketButton({ market, className }: ShareMarketButtonProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/markets/${market.id}`
      : `/markets/${market.id}`;

  const shareText = `🔮 Predict the outcome: "${market.question}" — Place your bet on PraesagiumChain`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const shareToX = () => {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=550,height=420,noopener,noreferrer");
    setOpen(false);
  };

  const shareToTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o: boolean) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-2.5 py-1.5 font-mono text-xs text-text-secondary transition-colors hover:border-border-bright hover:text-foreground"
        aria-label="Share market"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Share2 className="h-3.5 w-3.5" aria-hidden />
        Share
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="absolute right-0 top-full z-50 mt-1.5 min-w-[160px] rounded-xl border border-border bg-elevated py-1 shadow-lg"
            role="menu"
          >
            <button
              type="button"
              onClick={() => { copyLink(); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 font-mono text-xs text-text-secondary transition-colors hover:bg-surface hover:text-foreground"
              role="menuitem"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
              )}
              {copied ? "Copied!" : "Copy link"}
            </button>

            <button
              type="button"
              onClick={shareToX}
              className="flex w-full items-center gap-2 px-3 py-2 font-mono text-xs text-text-secondary transition-colors hover:bg-surface hover:text-foreground"
              role="menuitem"
            >
              <span className="font-bold text-[13px] leading-none" aria-hidden>𝕏</span>
              Tweet
            </button>

            <button
              type="button"
              onClick={shareToTelegram}
              className="flex w-full items-center gap-2 px-3 py-2 font-mono text-xs text-text-secondary transition-colors hover:bg-surface hover:text-foreground"
              role="menuitem"
            >
              <span aria-hidden>✈</span>
              Telegram
            </button>
          </div>
        </>
      )}
    </div>
  );
}
