"use client";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNetworkGuard } from "@/hooks/use-network-guard";
import { useIsMounted } from "@/hooks/use-is-mounted";

export function WrongNetworkBanner() {
  const { isWrongNetwork, switchToRequired, isSwitching } = useNetworkGuard();
  const mounted = useIsMounted();

  // No renderizar nada hasta el montaje para evitar hydration mismatch
  if (!mounted || !isWrongNetwork) return null;

  return (
    <div
      className="flex items-center justify-between gap-3 border-b border-red/30 bg-red/10 px-4 py-2"
      role="alert"
      aria-live="assertive"
    >
      <span className="font-mono text-xs text-red">
        ⚠ Wrong Network — PraesagiumChain requires Sepolia Testnet
      </span>
      <button
        type="button"
        onClick={async () => {
          try {
            await switchToRequired();
          } catch (e) {
            toast.error("Failed to switch network", {
              description: e instanceof Error ? e.message : "Please switch manually in your wallet.",
            });
          }
        }}
        disabled={isSwitching}
        className="shrink-0 rounded-md border border-red/40 bg-red/10 px-3 py-1 font-mono text-xs text-red transition-colors hover:bg-red/20 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Switch to Sepolia network"
      >
        {isSwitching ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Switching…
          </span>
        ) : (
          "Switch to Sepolia →"
        )}
      </button>
    </div>
  );
}
