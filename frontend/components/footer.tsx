"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Github, Twitter, MessageCircle } from "lucide-react";
import { checkHealth } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

const EXPLORER_URL = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ?? "https://sepolia.etherscan.io";

const FOOTER_COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Markets",    href: "/"               },
      { label: "Create",     href: "/markets/create" },
      { label: "Signals",    href: "/signals"        },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Block Explorer",  href: EXPLORER_URL,                                    external: true                },
      { label: "GitHub",          href: "https://github.com/quantumquirkz/PraesagiumChain", external: true             },
    ],
  },
  {
    heading: "Community",
    links: [
      { label: "GitHub",    href: "https://github.com/quantumquirkz", external: true },
      { label: "Twitter/X", href: "https://twitter.com",              external: true },
      { label: "Discord",   href: "https://discord.com",              external: true },
    ],
  },
] as const;

export function Footer() {
  const { data: isHealthy } = useQuery({
    queryKey: ["health"],
    queryFn: checkHealth,
    refetchInterval: 120_000,
    placeholderData: true,
  });

  return (
    <footer className="border-t border-border bg-surface mt-auto rounded-t-2xl">
      {/* Main columns */}
      <div className="container px-4 py-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div className="space-y-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 transition-[filter] duration-150 hover:[filter:drop-shadow(0_0_6px_var(--cyan))]"
              aria-label="PraesagiumChain home"
            >
              <span className="text-black dark:text-white">
                <Logo size="footer" />
              </span>
              <span className="font-display font-extrabold text-[15px] tracking-widest text-foreground">
                PRAESAGIUM
              </span>
              <span className="font-display font-extrabold text-[15px] tracking-widest text-cyan" aria-hidden>
                ·CHAIN
              </span>
            </Link>
            <p className="font-mono text-xs text-text-muted leading-relaxed max-w-[200px]">
              Decentralized prediction markets, on-chain.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://github.com/quantumquirkz/PraesagiumChain"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-foreground transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" aria-hidden />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-foreground transition-colors"
                aria-label="Twitter/X"
              >
                <Twitter className="h-4 w-4" aria-hidden />
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-foreground transition-colors"
                aria-label="Discord"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="font-mono text-xs text-text-muted uppercase tracking-widest mb-3">
                {col.heading}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-body text-sm text-text-secondary hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="font-body text-sm text-text-secondary hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="container flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4 font-mono text-xs text-text-secondary">
            <span className="flex items-center gap-2">
              <span
                className={cn("h-2 w-2 rounded-full", isHealthy ? "bg-green" : "bg-red")}
                style={
                  isHealthy
                    ? { boxShadow: "0 0 6px var(--green)" }
                    : { boxShadow: "0 0 6px var(--red)" }
                }
                aria-hidden
              />
              <span>{isHealthy ? "API Online" : "API Offline"}</span>
            </span>
            <span className="text-text-muted">·</span>
            <span className="text-text-muted">Ethereum Sepolia</span>
          </div>
          <p className="font-mono text-xs text-text-muted">
            Powered by Chainlink CRE · Automation · Data Feeds · PraesagiumChain v1.0
          </p>
        </div>
      </div>
    </footer>
  );
}
