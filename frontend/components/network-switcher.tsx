"use client";

import { useChainId, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const EXPECTED_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID
  ? Number(process.env.NEXT_PUBLIC_CHAIN_ID)
  : 11155111;

export function NetworkSwitcher() {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const isWrongNetwork = chainId !== undefined && chainId !== EXPECTED_CHAIN_ID;

  if (!isWrongNetwork) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 bg-destructive/20 text-destructive border border-destructive/40 px-3 py-2 rounded-lg text-sm font-mono"
      role="alert"
      aria-live="polite"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      <span>Wrong Network — Switch to Sepolia</span>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => switchChain?.({ chainId: EXPECTED_CHAIN_ID as 11155111 })}
        disabled={isPending}
        aria-label="Switch to Sepolia network"
      >
        {isPending ? "Switching…" : "Switch"}
      </Button>
    </div>
  );
}
