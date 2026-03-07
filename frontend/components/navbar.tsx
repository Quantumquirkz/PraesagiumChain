"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConnect, useAccount } from "wagmi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { config } from "@/lib/wagmi";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NAV_LINKS = [
  { href: "/", label: "Markets" },
  { href: "/markets/create", label: "Create" },
  { href: "/positions", label: "Positions" },
  { href: "/about", label: "Reputation" },
] as const;

function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M13 2L22 7.5V18.5L13 24L4 18.5V7.5L13 2Z"
        stroke="#00D4FF"
        strokeWidth="1.5"
        fill="none"
      />
      <text
        x="13"
        y="16"
        textAnchor="middle"
        fill="#00D4FF"
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        P
      </text>
    </svg>
  );
}

function ConnectButton() {
  const { isConnected } = useAccount();
  const { connectAsync, isPending } = useConnect();
  const [open, setOpen] = useState(false);

  const handleConnect = async (connectorId: string) => {
    const connector = config.connectors.find((c) => c.id === connectorId);
    if (!connector) return;
    try {
      if (typeof window !== "undefined") window.focus();
      await connectAsync({ connector });
      setOpen(false);
    } catch (err: unknown) {
      const e = err as { message?: string; shortMessage?: string };
      toast.error(e?.shortMessage ?? (err instanceof Error ? err.message : "Connection failed"));
    }
  };

  if (useIsMounted() && isConnected) {
    return (
      <Link
        href="/positions"
        className="inline-flex items-center justify-center rounded-md border border-[rgba(0,212,255,0.35)] bg-transparent px-[18px] py-2 text-[13px] font-semibold text-[#00D4FF] transition-all duration-200 hover:border-[rgba(0,212,255,0.7)] hover:bg-[rgba(0,212,255,0.08)] hover:shadow-[0_0_16px_rgba(0,212,255,0.15)]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        Wallet
      </Link>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md border border-[rgba(0,212,255,0.35)] bg-transparent px-[18px] py-2 text-[13px] font-semibold text-[#00D4FF] transition-all duration-200 hover:border-[rgba(0,212,255,0.7)] hover:bg-[rgba(0,212,255,0.08)] hover:shadow-[0_0_16px_rgba(0,212,255,0.15)]"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
          aria-label="Connect wallet"
        >
          Connect Wallet
        </button>
      </DialogTrigger>
      <DialogContent showClose className="bg-[#0F1320] border-[rgba(255,255,255,0.08)]">
        <DialogHeader>
          <DialogTitle className="text-white font-display font-extrabold">Connect Wallet</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {config.connectors.map((connector) => (
            <Button
              key={connector.uid}
              variant="outline"
              className="w-full justify-start font-mono border-[rgba(255,255,255,0.15)] text-white hover:bg-[rgba(255,255,255,0.04)]"
              onClick={() => handleConnect(connector.id)}
              disabled={isPending}
              aria-label={`Connect with ${connector.name}`}
            >
              {connector.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between px-6 transition-all duration-[400ms] ease-out md:px-10"
      style={{
        backgroundColor: scrolled ? "rgba(8,11,18,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
      }}
      aria-label="Main navigation"
    >
      {/* Left — Logo */}
      <Link
        href="/"
        className="flex items-center gap-[10px] transition-transform duration-300 hover:[&_svg]:rotate-[15deg]"
        aria-label="PraesagiumChain home"
      >
        <LogoIcon />
        <span
          className="text-base font-extrabold tracking-[0.15em] text-white"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          PRAESAGIUM
        </span>
        <span
          className="text-base font-extrabold tracking-[0.15em] text-[#00D4FF]"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          CHAIN
        </span>
      </Link>

      {/* Center — Nav links (hidden mobile) */}
      <div className="hidden md:flex items-center gap-8">
        {NAV_LINKS.map(({ href, label }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative text-[13px] font-medium transition-colors duration-200",
                isActive ? "text-white" : "text-white/55 hover:text-white"
              )}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {label}
              {isActive && (
                <span
                  className="absolute left-0 -bottom-0.5 h-px w-full rounded-full"
                  style={{
                    background: "linear-gradient(90deg, #00D4FF, #8B5CF6)",
                  }}
                  aria-hidden
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5"
          style={{
            borderColor: "rgba(0,232,122,0.4)",
            background: "rgba(0,232,122,0.06)",
            color: "#00E87A",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.15em",
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-[#00E87A] animate-[navbar-pulse_2s_ease-in-out_infinite]"
            aria-hidden
          />
          <span className="uppercase">LIVE ON ETHEREUM SEPOLIA</span>
        </div>
        <div className="hidden md:block">
          <ConnectButton />
        </div>

        {/* Hamburger */}
        <button
          type="button"
          className="md:hidden flex flex-col justify-center gap-1.5 w-8 h-8 p-1 text-white"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          <span
            className={cn(
              "h-0.5 w-5 rounded-full bg-white transition-all duration-200",
              mobileOpen && "rotate-45 translate-y-1"
            )}
          />
          <span
            className={cn(
              "h-0.5 w-5 rounded-full bg-white transition-all duration-200",
              mobileOpen && "opacity-0 scale-0"
            )}
          />
          <span
            className={cn(
              "h-0.5 w-5 rounded-full bg-white transition-all duration-200",
              mobileOpen && "-rotate-45 -translate-y-1"
            )}
          />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          aria-modal="true"
          role="dialog"
          aria-label="Mobile menu"
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div
            className="absolute left-0 right-0 top-0 border-b border-white/10 bg-[#080B12] p-6 pt-20"
            style={{ boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}
          >
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "py-3 text-[15px] font-medium transition-colors",
                    pathname === href ? "text-white" : "text-white/70 hover:text-white"
                  )}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {label}
                </Link>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-white/10">
              <ConnectButton />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
