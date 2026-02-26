"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { checkHealth } from "@/lib/api";
import { cn } from "@/lib/utils";

const EXPLORER_URL = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ?? "https://sepolia.etherscan.io";

export function Footer() {
  const { data: isHealthy } = useQuery({
    queryKey: ["health"],
    queryFn: checkHealth,
    refetchInterval: 30 * 1000,
    placeholderData: true,
  });

  return (
    <footer className="border-t border-border card-bg mt-auto">
      <div className="container flex flex-wrap items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-4 font-mono text-sm text-text-secondary">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isHealthy ? "bg-green-500" : "bg-red-500"
              )}
              aria-hidden
            />
            <span>{isHealthy ? "API Online" : "API Offline"}</span>
          </span>
          <Link
            href={EXPLORER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Block Explorer
          </Link>
        </div>
        <p className="font-mono text-xs text-text-secondary">
          Powered by Chainlink CRE • PraesagiumChain v1.0
        </p>
      </div>
    </footer>
  );
}
