import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Github, ExternalLink, CheckCircle2, Circle } from "lucide-react";
import { HowItWorks } from "@/components/how-it-works";
import { UncertaintyBar } from "@/components/uncertainty-bar";

export const metadata: Metadata = {
  title: "About — PraesagiumChain",
  description:
    "Learn about PraesagiumChain: decentralized prediction markets powered by the PHPE hybrid AI engine on Ethereum.",
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  label,
  title,
  children,
  className = "",
}: {
  label: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`py-16 md:py-24 ${className}`}>
      <p className="font-mono text-xs text-cyan uppercase tracking-widest mb-3">{label}</p>
      <h2
        className="font-display font-extrabold leading-none text-foreground mb-10"
        style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroHex() {
  return (
    <svg
      width="180"
      height="180"
      viewBox="0 0 180 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto mb-8 opacity-80"
      aria-hidden
    >
      {/* Outer hex */}
      <path
        d="M90 10L162 52V136L90 178L18 136V52L90 10Z"
        stroke="url(#hexGrad)"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Inner hex */}
      <path
        d="M90 35L140 63V119L90 147L40 119V63L90 35Z"
        stroke="url(#hexGrad)"
        strokeWidth="1"
        strokeDasharray="4 3"
        fill="none"
        opacity="0.5"
      />
      {/* Chain links */}
      <circle cx="68" cy="90" r="14" stroke="url(#hexGrad)" strokeWidth="1.5" fill="none" />
      <circle cx="90" cy="68" r="14" stroke="url(#hexGrad)" strokeWidth="1.5" fill="none" />
      <circle cx="112" cy="90" r="14" stroke="url(#hexGrad)" strokeWidth="1.5" fill="none" />
      <circle cx="90" cy="112" r="14" stroke="url(#hexGrad)" strokeWidth="1.5" fill="none" />
      {/* Connectors */}
      <path d="M79 79L101 57M101 101L79 123M57 101L79 79M123 79L101 101" stroke="url(#hexGrad)" strokeWidth="1" />
      <defs>
        <linearGradient id="hexGrad" x1="18" y1="10" x2="162" y2="178" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00D4FF" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── PHPE Engine sources ──────────────────────────────────────────────────────

const PHPE_SOURCES = [
  { name: "Binance",        weight: 25, probability: 0.71, color: "#F0B90B" },
  { name: "Kraken",         weight: 20, probability: 0.68, color: "#5741D9" },
  { name: "CryptoCompare",  weight: 15, probability: 0.74, color: "#00D4FF" },
  { name: "Chainlink",      weight: 20, probability: 0.76, color: "#375BD2" },
  { name: "Finnhub",        weight: 12, probability: 0.65, color: "#1DB954" },
  { name: "ExchangeRate",   weight: 8,  probability: 0.69, color: "#FF6B35" },
];

// ─── Tech stack ───────────────────────────────────────────────────────────────

const TECH_STACK = [
  {
    name: "Ethereum",
    description: "Smart contract platform",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8" aria-hidden>
        <path d="M16 2L6 17.5L16 22.5L26 17.5L16 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M6 19.5L16 30L26 19.5L16 24.5L6 19.5Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    ),
    accent: "text-violet",
  },
  {
    name: "Solidity",
    description: "Smart contract language",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8" aria-hidden>
        <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M10 13h12M10 16h12M10 19h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    accent: "text-cyan",
  },
  {
    name: "Chainlink",
    description: "Decentralized oracle network",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8" aria-hidden>
        <path d="M16 4L8 8.5V17.5L16 22L24 17.5V8.5L16 4Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="16" cy="13" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M16 22V28M10 25L16 28L22 25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    accent: "text-[#375BD2]",
  },
  {
    name: "Rust",
    description: "Backend prediction engine",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8" aria-hidden>
        <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M10 12h6a4 4 0 010 8H10V12z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M16 20l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    accent: "text-[#CE422B]",
  },
  {
    name: "Next.js 14",
    description: "React app framework",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8" aria-hidden>
        <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M11 21V11l14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    accent: "text-foreground",
  },
  {
    name: "Wagmi v2",
    description: "Ethereum React hooks",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8" aria-hidden>
        <path d="M4 16c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 20l4-8 4 8 4-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    accent: "text-cyan",
  },
  {
    name: "Viem",
    description: "TypeScript Ethereum utils",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8" aria-hidden>
        <path d="M6 10l10 14L26 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11 10l5 7 5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    accent: "text-violet",
  },
  {
    name: "TanStack Query",
    description: "Async state management",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8" aria-hidden>
        <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M16 4v4M16 24v4M4 16h4M24 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7.76 7.76l2.83 2.83M21.41 21.41l2.83 2.83M7.76 24.24l2.83-2.83M21.41 10.59l2.83-2.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    accent: "text-[#FF4154]",
  },
];

// ─── Team ─────────────────────────────────────────────────────────────────────

function addressToGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  const h2 = (h + 120) % 360;
  return `linear-gradient(135deg, hsl(${h}, 70%, 55%), hsl(${h2}, 70%, 45%))`;
}

const TEAM = [
  {
    name: "QuantumQuirkz",
    role: "Founder & Lead Engineer",
    bio: "Full-stack blockchain developer. Architected the PHPE engine and smart contract system.",
    github: "https://github.com/quantumquirkz",
    seed: "quantumquirkz-founder",
  },
];

// ─── Roadmap ──────────────────────────────────────────────────────────────────

const ROADMAP = [
  { label: "Q4 2024", title: "Smart Contract Development",      description: "PredictionMarket.sol deployed on Sepolia testnet with full YES/NO mechanics.",                    done: true  },
  { label: "Q1 2025", title: "PHPE Engine v1",                  description: "Hybrid prediction engine integrating 6 real-time data sources with Bayesian fusion.",             done: true  },
  { label: "Q1 2025", title: "Frontend Launch",                 description: "Next.js 14 dashboard with live signals, market creation wizard, and reputation system.",          done: true  },
  { label: "Q2 2025", title: "Commit-Reveal Betting",           description: "Privacy-preserving bet submission using commit-reveal scheme to prevent front-running.",          done: true  },
  { label: "Q3 2025", title: "Conditional Markets",             description: "Nested prediction trees where outcomes of one market affect another.",                            done: false },
  { label: "Q4 2025", title: "Mainnet Deployment",              description: "Ethereum mainnet launch with audited contracts and production-grade infrastructure.",             done: false },
  { label: "Q1 2026", title: "DAO Governance",                  description: "On-chain governance for market resolution disputes and protocol parameter updates.",              done: false },
  { label: "Q2 2026", title: "Cross-chain Expansion",           description: "Expand to Arbitrum and Base with unified liquidity and cross-chain resolution oracles.",         done: false },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden py-20 md:py-28 text-center hero-gradient rounded-2xl mt-4">
        {/* Background hex decorations */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {[
            { x: "5%",  y: "10%", size: 60,  cls: "hex-float"   },
            { x: "88%", y: "8%",  size: 80,  cls: "hex-float-2" },
            { x: "80%", y: "70%", size: 50,  cls: "hex-float-3" },
            { x: "3%",  y: "65%", size: 40,  cls: "hex-float"   },
          ].map((h, i) => (
            <svg
              key={i}
              className={h.cls}
              style={{ position: "absolute", left: h.x, top: h.y, width: h.size, height: h.size }}
              viewBox="0 0 100 100"
              fill="none"
            >
              <path d="M50 5L90 27.5V72.5L50 95L10 72.5V27.5L50 5Z" stroke="var(--cyan)" strokeWidth="1.5" />
            </svg>
          ))}
        </div>

        <div className="relative z-10">
          <HeroHex />
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan-dim px-4 py-1.5">
            <span className="font-mono text-[11px] text-cyan uppercase tracking-widest">
              Decentralized · Transparent · On-Chain
            </span>
          </div>
          <h1
            className="font-display font-extrabold leading-none tracking-tight mt-4"
            style={{ fontSize: "clamp(36px, 7vw, 72px)" }}
          >
            <span className="block text-foreground">BUILT FOR THE</span>
            <span className="block text-gradient-cyan-violet">FUTURE OF PREDICTION</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl font-body text-base text-text-secondary leading-relaxed">
            PraesagiumChain is an open, permissionless prediction market protocol on Ethereum.
            Anyone can create a market, stake ETH on outcomes, and let the PHPE hybrid AI engine
            provide real-time probability signals — all verifiable on-chain.
          </p>
        </div>
      </div>

      {/* ── Mission ── */}
      <section className="py-16 md:py-24">
        <p className="font-mono text-xs text-cyan uppercase tracking-widest mb-3">Our Mission</p>
        <div className="card-gradient-border rounded-2xl p-8 md:p-12 text-center">
          <blockquote
            className="font-display font-extrabold text-foreground leading-tight"
            style={{ fontSize: "clamp(24px, 4vw, 40px)" }}
          >
            "Make prediction markets as accessible and transparent as reading a price chart —
            powered by AI signals, secured by Ethereum."
          </blockquote>
          <p className="mt-6 font-body text-text-secondary max-w-2xl mx-auto leading-relaxed">
            We believe that collective intelligence, when properly incentivized and made transparent,
            produces more accurate forecasts than any single analyst or algorithm. PraesagiumChain
            combines decentralized finance primitives with hybrid machine learning to create a
            prediction layer for the open web.
          </p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <Section label="The Process" title="HOW IT WORKS">
        <HowItWorks />
      </Section>

      {/* ── PHPE Engine ── */}
      <Section label="AI Engine" title="THE PHPE ENGINE">
        <div className="card-glow rounded-2xl overflow-hidden">
          <div className="relative scanlines p-6 md:p-8">
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-start md:gap-10">
                {/* Left: description */}
                <div className="md:w-1/2 mb-8 md:mb-0">
                  <p className="font-body text-sm text-text-secondary leading-relaxed mb-6">
                    The <span className="text-cyan font-mono">Probabilistic Hybrid Prediction Engine</span> fuses
                    signals from 6 independent real-time data sources using a weighted Bayesian model.
                    Each source contributes a probability estimate and confidence score, which are
                    combined into a single prediction with an uncertainty band.
                  </p>

                  <div className="space-y-3">
                    {PHPE_SOURCES.map((src) => (
                      <div key={src.name} className="flex items-center gap-3">
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: src.color, boxShadow: `0 0 6px ${src.color}` }}
                          aria-hidden
                        />
                        <span className="font-mono text-xs text-text-secondary w-32 shrink-0">{src.name}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-elevated overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${src.weight * 4}%`,
                              background: src.color,
                              opacity: 0.7,
                            }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-text-muted w-8 text-right shrink-0">
                          {src.weight}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: live demo bar */}
                <div className="md:w-1/2">
                  <p className="font-mono text-xs text-text-muted uppercase tracking-widest mb-4">
                    Sample Output
                  </p>
                  <div className="card-gradient-border rounded-xl p-5 space-y-4">
                    <div>
                      <p className="font-mono text-xs text-text-muted mb-1">BTC/USD — Will close above $100k?</p>
                      <UncertaintyBar probability={0.73} uncertainty={0.08} label="PHPE Probability" />
                    </div>
                    <div className="border-t border-border pt-4 grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="font-mono text-[10px] text-text-muted uppercase">Sources</p>
                        <p className="font-display font-bold text-[22px] text-cyan">6</p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] text-text-muted uppercase">Confidence</p>
                        <p className="font-display font-bold text-[22px] text-green">HIGH</p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] text-text-muted uppercase">Latency</p>
                        <p className="font-display font-bold text-[22px] text-foreground">&lt;2s</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Tech Stack ── */}
      <Section label="Technology" title="BUILT WITH">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {TECH_STACK.map((tech) => (
            <div
              key={tech.name}
              className="card-glow rounded-xl p-4 flex flex-col items-center text-center gap-2"
            >
              <span className={tech.accent}>{tech.icon}</span>
              <span className="font-display font-bold text-[14px] text-foreground">{tech.name}</span>
              <span className="font-body text-[11px] text-text-muted leading-tight">{tech.description}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Team ── */}
      <Section label="The People" title="THE TEAM">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {TEAM.map((member) => (
            <div key={member.name} className="card-glow card-gradient-border rounded-2xl p-6 flex flex-col items-center text-center">
              {/* Avatar */}
              <div
                className="h-16 w-16 rounded-full mb-4 shrink-0"
                style={{ background: addressToGradient(member.seed) }}
                aria-hidden
              />
              <h3 className="font-display font-extrabold text-[20px] text-foreground leading-tight">
                {member.name}
              </h3>
              <p className="font-mono text-xs text-cyan mt-1">{member.role}</p>
              <p className="font-body text-sm text-text-secondary mt-3 leading-relaxed">{member.bio}</p>
              <div className="mt-4 flex gap-3">
                {member.github && (
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 font-mono text-xs text-text-secondary hover:text-foreground transition-colors"
                    aria-label={`${member.name} on GitHub`}
                  >
                    <Github className="h-3.5 w-3.5" aria-hidden />
                    GitHub
                  </a>
                )}
              </div>
            </div>
          ))}

          {/* Open source card */}
          <div className="card-glow rounded-2xl p-6 flex flex-col items-center text-center border border-dashed border-border-bright">
            <div
              className="h-16 w-16 rounded-full mb-4 flex items-center justify-center bg-elevated border border-border-bright"
              aria-hidden
            >
              <span className="font-display font-bold text-[28px] text-text-muted">+</span>
            </div>
            <h3 className="font-display font-bold text-[18px] text-text-secondary">Open Source</h3>
            <p className="font-mono text-xs text-text-muted mt-1">Contributions Welcome</p>
            <p className="font-body text-sm text-text-secondary mt-3 leading-relaxed">
              PraesagiumChain is open source. Review the contracts, contribute to the engine,
              or build on top of the protocol.
            </p>
            <a
              href="https://github.com/quantumquirkz/PraesagiumChain"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-1.5 font-mono text-xs text-cyan hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              View on GitHub
            </a>
          </div>
        </div>
      </Section>

      {/* ── Roadmap ── */}
      <Section label="Timeline" title="ROADMAP">
        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute left-[11px] top-0 bottom-0 w-px"
            style={{
              background: "linear-gradient(180deg, var(--green), var(--cyan), var(--border))",
            }}
            aria-hidden
          />

          <div className="space-y-0">
            {ROADMAP.map((item, i) => (
              <div key={i} className="relative flex gap-5 pb-8 last:pb-0">
                {/* Dot */}
                <div className="relative z-10 mt-1 shrink-0">
                  {item.done ? (
                    <CheckCircle2
                      className="h-[22px] w-[22px] text-green"
                      style={{ filter: "drop-shadow(0 0 4px var(--green))" }}
                      aria-hidden
                    />
                  ) : (
                    <Circle className="h-[22px] w-[22px] text-border-bright" aria-hidden />
                  )}
                </div>

                {/* Content */}
                <div
                  className={`flex-1 rounded-xl border p-4 ${
                    item.done
                      ? "border-green/20 bg-green-dim"
                      : "border-dashed border-border-bright bg-elevated"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span
                      className={`font-mono text-[11px] uppercase tracking-widest ${
                        item.done ? "text-green" : "text-text-muted"
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.done && (
                      <span className="font-mono text-[10px] text-green border border-green/30 rounded-full px-2 py-0.5">
                        COMPLETE
                      </span>
                    )}
                  </div>
                  <h4
                    className={`font-display font-bold text-[16px] leading-tight ${
                      item.done ? "text-foreground" : "text-text-secondary"
                    }`}
                  >
                    {item.title}
                  </h4>
                  <p className="mt-1 font-body text-sm text-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── CTA ── */}
      <section className="py-16 md:py-24 text-center">
        <div className="card-gradient-border rounded-2xl py-16 px-8 relative overflow-hidden">
          {/* Background glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,212,255,0.06) 0%, transparent 70%)",
            }}
            aria-hidden
          />
          <div className="relative z-10">
            <p className="font-mono text-xs text-cyan uppercase tracking-widest mb-3">
              Ready to Predict?
            </p>
            <h2
              className="font-display font-extrabold text-foreground leading-none"
              style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
            >
              START PREDICTING
              <br />
              <span className="text-gradient-cyan-violet">ON-CHAIN TODAY</span>
            </h2>
            <p className="mt-4 font-body text-text-secondary max-w-md mx-auto">
              Connect your wallet, browse open markets, or create your own prediction market in minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg p-[1px] bg-gradient-to-r from-cyan to-violet hover:shadow-[0_0_20px_rgba(0,212,255,0.3)] transition-shadow"
              >
                <span className="flex items-center gap-2 rounded-[calc(0.5rem-1px)] bg-surface hover:bg-cyan-dim transition-colors px-6 py-3">
                  <span className="font-body font-semibold text-sm text-foreground">Browse Markets</span>
                </span>
              </Link>
              <Link
                href="/markets/create"
                className="inline-flex items-center gap-2 rounded-lg border border-border-bright bg-elevated hover:border-violet/50 hover:bg-violet-dim transition-colors px-6 py-3"
              >
                <span className="font-body font-semibold text-sm text-foreground">Create a Market</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
