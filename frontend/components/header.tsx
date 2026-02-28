"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Menu, X, LogOut, Loader2, LayoutGrid, PlusCircle, Wallet, Star, Radio, Info, ShieldCheck } from "lucide-react";
import { useAccount, useBalance, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { truncateAddress, formatEth } from "@/lib/utils";
import { config } from "@/lib/wagmi";
import { cn } from "@/lib/utils";

const EXPECTED_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID
  ? Number(process.env.NEXT_PUBLIC_CHAIN_ID)
  : 11155111;

const NAV_LINKS = [
  { href: "/",               label: "Markets",    icon: LayoutGrid,  accent: "cyan"   },
  { href: "/markets/create", label: "Create",     icon: PlusCircle,  accent: "violet" },
  { href: "/positions",      label: "Positions",  icon: Wallet,      accent: "green"  },
  { href: "/reputation",     label: "Reputation", icon: Star,        accent: "gold"   },
  { href: "/signals",        label: "Signals",    icon: Radio,       accent: "cyan"   },
  { href: "/markets/private", label: "Private",    icon: ShieldCheck, accent: "violet" },
  { href: "/about",          label: "About",      icon: Info,        accent: "violet" },
] as const;

function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Hexagon */}
      <path
        d="M14 2L24 8V20L14 26L4 20V8L14 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Chain links inside */}
      <circle cx="10" cy="14" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="14" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="18" cy="14" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <circle cx="14" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path
        d="M12.5 12.5L15.5 9.5M15.5 15.5L12.5 18.5M9.5 15.5L12.5 12.5M18.5 12.5L15.5 15.5"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

function LiveIndicator() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t: number) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-1.5" role="status" aria-live="polite">
      <span
        className="h-2 w-2 rounded-full bg-green animate-pulse"
        style={{ boxShadow: "0 0 8px var(--green)" }}
      />
      <span className="font-mono text-[11px] text-green font-medium">LIVE</span>
    </div>
  );
}

function NetworkBadge() {
  const { chain } = useAccount();
  const name = chain?.name ?? "Unknown";
  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 border border-border-bright bg-elevated"
      aria-label={`Network: ${name}`}
    >
      <span className="font-mono text-xs text-text-secondary" aria-hidden>
        ⬡
      </span>
      <span className="font-mono text-xs text-text-primary">{name}</span>
    </div>
  );
}

function addressToGradient(address: string): string {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  const h2 = (h + 120) % 360;
  return `linear-gradient(135deg, hsl(${h}, 70%, 55%), hsl(${h2}, 70%, 45%))`;
}

function WalletButtonInner() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [connectOpen, setConnectOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isConnected && address) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((o: boolean) => !o)}
          className="flex items-center gap-2 rounded-lg border border-border-bright bg-elevated px-2.5 py-1.5 transition-colors hover:border-cyan/50"
          aria-label="Wallet menu"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          <div
            className="h-6 w-6 shrink-0 rounded"
            style={{ background: addressToGradient(address) }}
            aria-hidden
          />
          <div className="hidden sm:flex flex-col items-end">
            <span className="font-mono text-xs text-text-primary leading-tight">
              {truncateAddress(address)}
            </span>
            <span className="font-mono text-[11px] text-cyan leading-tight">
              {balance ? formatEth(balance.value) : "—"}
            </span>
          </div>
        </button>
        {dropdownOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-elevated py-1 shadow-lg z-50"
            role="menu"
          >
            <button
              type="button"
              onClick={() => {
                disconnect();
                setDropdownOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 font-mono text-sm text-red hover:bg-red-dim transition-colors"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="rounded-lg p-[1px] bg-gradient-to-r from-cyan to-violet hover:shadow-[0_0_12px_rgba(0,212,255,0.25)] transition-shadow text-left"
          aria-label="Connect wallet"
        >
          <span className="flex items-center justify-center rounded-[calc(0.5rem-1px)] bg-surface hover:bg-cyan-dim transition-colors px-3 py-2 w-full">
            <span className="font-body font-medium text-[13px] text-foreground">Connect Wallet</span>
          </span>
        </button>
      </DialogTrigger>
      <DialogContent
        showClose={true}
        className="bg-surface border-border"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      >
        <DialogHeader>
          <DialogTitle className="font-display font-extrabold text-foreground">
            Connect Wallet
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {config.connectors.map((connector) => (
            <Button
              key={connector.uid}
              variant="outline"
              className="w-full justify-start font-mono border-border hover:bg-cyan-dim"
              onClick={() => {
                connectAsync({ connector }).then(() => setConnectOpen(false));
              }}
              disabled={isPending}
              aria-label={"Connect with " + connector.name}
            >
              {connector.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Mobile: avatar + balance only */
function WalletButtonMobile() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [connectOpen, setConnectOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!isConnected || !address) {
    return (
      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="font-body font-medium text-[13px] border-border"
            aria-label="Connect wallet"
          >
            Connect Wallet
          </Button>
        </DialogTrigger>
        <DialogContent showClose={true} className="bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold">Connect Wallet</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {config.connectors.map((connector) => (
              <Button
                key={connector.uid}
                variant="outline"
                className="w-full justify-start font-mono"
                onClick={() => connectAsync({ connector }).then(() => setConnectOpen(false))}
                disabled={isPending}
                aria-label={"Connect with " + connector.name}
              >
                {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" aria-hidden /> : null}
                {connector.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setDropdownOpen((o: boolean) => !o)}
        className="flex items-center gap-2 rounded-lg border border-border-bright bg-elevated px-2 py-1.5"
        aria-label="Wallet"
        aria-expanded={dropdownOpen}
      >
        <div
          className="h-6 w-6 shrink-0 rounded"
          style={{ background: addressToGradient(address) }}
        />
        <span className="font-mono text-xs text-cyan">
          {balance ? formatEth(balance.value) : "—"}
        </span>
      </button>
      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-border bg-elevated py-1 z-50">
          <span className="block px-3 py-1 font-mono text-xs text-text-secondary">
            {truncateAddress(address)}
          </span>
          <button
            type="button"
            onClick={() => { disconnect(); setDropdownOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 font-mono text-sm text-red hover:bg-red-dim"
          >
            <LogOut className="h-4 w-4" /> Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const { isConnected } = useAccount();
  const mounted = useIsMounted();

  // Solo evaluar red incorrecta tras el montaje para evitar hydration mismatch
  const isWrongNetwork = mounted && chainId !== undefined && chainId !== EXPECTED_CHAIN_ID;

  return (
    <div key="header-root">
      {isWrongNetwork && (
        <div
          className="flex h-9 items-center justify-between px-4 w-full shrink-0"
          style={{
            background: "linear-gradient(90deg, var(--red-dim), transparent, var(--red-dim))",
            borderBottom: "1px solid rgba(255, 61, 90, 0.3)",
          }}
          role="alert"
          aria-live="polite"
        >
          <span className="font-body text-sm text-red">
            ⚠ Wrong Network — Connect to Sepolia to use PraesagiumChain
          </span>
          <Button
            size="sm"
            variant="outline"
            className="border-red text-red hover:bg-red-dim font-mono text-xs"
            onClick={() => switchChain?.({ chainId: EXPECTED_CHAIN_ID as 11155111 })}
            disabled={isPending}
            aria-label="Switch to Sepolia network"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 inline" aria-hidden /> : null}
            {isPending ? "Switching…" : "Switch Network"}
          </Button>
        </div>
      )}

      <header
        className="sticky top-0 z-50 w-full shrink-0 border-b backdrop-blur-md"
        style={{
          height: 56,
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="container flex h-full items-center justify-between gap-4 px-4">
          {/* Left — Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 transition-[filter] duration-150 hover:[filter:drop-shadow(0_0_6px_var(--cyan))]"
            aria-label="PraesagiumChain home"
          >
            <span className="text-cyan">
              <LogoIcon />
            </span>
            <span className="font-display font-extrabold text-[18px] tracking-widest text-foreground">
              PRAESAGIUM
            </span>
            <span className="font-display font-extrabold text-[18px] tracking-widest text-cyan" aria-hidden>
              ·CHAIN
            </span>
          </Link>

          {/* Center — Nav (hidden on mobile) */}
          <nav
            className="hidden md:flex items-center gap-0.5 rounded-xl border border-border bg-elevated p-1"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map(({ href, label, icon: Icon, accent }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                    isActive
                      ? cn(
                          "text-foreground",
                          accent === "cyan"   && "bg-cyan-dim text-cyan",
                          accent === "violet" && "bg-violet-dim text-violet",
                          accent === "green"  && "bg-green-dim text-green",
                          accent === "gold"   && "bg-[rgba(245,166,35,0.12)] text-gold",
                        )
                      : "text-text-secondary hover:text-foreground hover:bg-surface"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110",
                      isActive && accent === "cyan"   && "text-cyan",
                      isActive && accent === "violet" && "text-violet",
                      isActive && accent === "green"  && "text-green",
                      isActive && accent === "gold"   && "text-gold",
                    )}
                    aria-hidden
                  />
                  <span className="hidden lg:inline">{label}</span>
                  {/* Punto indicador activo en md (cuando el label está oculto) */}
                  {isActive && (
                    <span
                      className={cn(
                        "absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full lg:hidden",
                        accent === "cyan"   && "bg-cyan",
                        accent === "violet" && "bg-violet",
                        accent === "green"  && "bg-green",
                        accent === "gold"   && "bg-gold",
                      )}
                      aria-hidden
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3">
            <LiveIndicator />
            {mounted && isConnected && (
              <NetworkBadge />
            )}
            <div className="hidden md:block">
              {mounted ? <WalletButtonInner /> : <div className="h-9 w-32" />}
            </div>
            <ThemeToggle />

            {/* Mobile menu trigger */}
            <button
              type="button"
              className="md:hidden p-2 text-text-secondary hover:text-foreground"
              onClick={() => setMobileOpen((o: boolean) => !o)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
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
              className="absolute right-0 top-0 bottom-0 w-64 border-l bg-surface drawer-slide-in"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex flex-col gap-1 p-4 pt-14">
                {NAV_LINKS.map(({ href, label, icon: Icon, accent }) => {
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 font-body font-medium text-sm py-3 px-3 rounded-lg transition-colors",
                        isActive
                          ? cn(
                              accent === "cyan"   && "text-cyan bg-cyan-dim",
                              accent === "violet" && "text-violet bg-violet-dim",
                              accent === "green"  && "text-green bg-green-dim",
                              accent === "gold"   && "text-gold bg-[rgba(245,166,35,0.12)]",
                            )
                          : "text-text-secondary hover:text-foreground hover:bg-elevated"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {label}
                    </Link>
                  );
                })}
                <div className="mt-4 pt-4 border-t border-border">
                  <WalletButtonMobile />
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}
