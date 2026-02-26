"use client";

// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export default function ReputationPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [searchAddress, setSearchAddress] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchAddress.trim();
    if (!ADDRESS_REGEX.test(trimmed)) return;
    router.push(`/reputation/${trimmed}`);
  };

  const isValid = ADDRESS_REGEX.test(searchAddress.trim());

  return (
    <div className="container py-8 px-4 flex flex-col items-center min-h-[60vh]">
      {isConnected && address && (
        <div className="mb-8 w-full max-w-xl">
          <Link
            href={`/reputation/${address}`}
            className="block rounded-md border border-cyan bg-cyan-dim px-4 py-3 text-center font-body text-sm text-cyan hover:bg-cyan-dim/80 transition-colors"
          >
            View Your Profile →
          </Link>
        </div>
      )}

      <h1 className="font-display font-extrabold text-[36px] text-foreground mb-2">
        REPUTATION
      </h1>
      <p className="font-body text-sm text-text-secondary mb-8 text-center max-w-md">
        Look up a creator&apos;s reputation score and activity
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-4">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted pointer-events-none"
            aria-hidden
          />
          <input
            type="text"
            placeholder="Enter wallet address..."
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            className={cn(
              "w-full rounded-md border bg-elevated py-4 pl-12 pr-4 font-body text-base text-foreground placeholder:text-text-muted",
              "focus:outline-none focus:border-cyan focus:ring-[3px] focus:ring-cyan-dim",
              searchAddress.length > 0 && !isValid && "border-red focus:border-red focus:ring-red-dim"
            )}
            aria-label="Wallet address"
            aria-invalid={searchAddress.length > 0 && !isValid}
          />
        </div>
        {searchAddress.length > 0 && !isValid && (
          <p className="text-sm text-red font-body">
            Enter a valid Ethereum address (0x + 40 hex characters)
          </p>
        )}
        <Button
          type="submit"
          disabled={!isValid}
          className="w-full h-12 font-display font-bold text-base bg-cyan text-black hover:bg-cyan/90 border-0"
          aria-label="View profile"
        >
          VIEW PROFILE
          <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Button>
      </form>
    </div>
  );
}
