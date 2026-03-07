"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { DemoPanel } from "@/components/hero-demo-panel";
import { LiveTicker } from "@/components/live-ticker";

interface HeroSectionProps {
  marketsRef?: React.RefObject<HTMLElement | null>;
}

const PARTICLE_COLORS = ["rgba(0,212,255,0.5)", "rgba(139,92,246,0.5)", "rgba(0,232,122,0.4)"];

function HeroParticles() {
  const [mounted, setMounted] = useState(false);
  const particles = useMemo(() => {
    if (!mounted) return [];
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: 2 + Math.random() * 2,
      duration: 4 + Math.random() * 4,
      delay: Math.random() * 3,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    }));
  }, [mounted]);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: p.color,
            animation: `particle-float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function HeroSection({ marketsRef }: HeroSectionProps) {
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollTop(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToMarkets = useCallback(() => {
    marketsRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [marketsRef]);

  return (
    <section className="relative min-h-screen overflow-hidden pt-16" style={{ background: "#080B12" }} aria-label="Hero">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "radial-gradient(rgba(0,212,255,0.12) 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 40%, #080B12 100%)" }}
        aria-hidden
      />
      <HeroParticles />
      <div
        className="pointer-events-none absolute top-[20%] left-[-10%] h-[500px] w-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-[30%] right-[-5%] h-[500px] w-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)" }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-[60px] px-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:px-10">
        <div className="flex flex-col">
          <div
            className="inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5"
            style={{
              background: "rgba(139,92,246,0.1)",
              borderColor: "rgba(139,92,246,0.3)",
              color: "#8B5CF6",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.12em",
              animation: "fade-up 0.5s ease 0s both",
            }}
          >
            <span className="animate-pulse">✦</span> POWERED BY PHPE HYBRID AI ENGINE
          </div>
          <h1
            className="mt-4 font-display font-extrabold leading-[0.92] tracking-[-0.02em] text-white"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(64px, 10vw, 96px)", animation: "fade-up 0.5s ease 0.1s both" }}
          >
            <span className="block">PREDICT THE</span>
            <span className="gradient-text block">FUTURE.</span>
            <span className="block">ON-CHAIN.</span>
          </h1>
          <p
            className="mt-5 max-w-[440px] text-base leading-[1.7] text-white/50"
            style={{ fontFamily: "'DM Sans', sans-serif", animation: "fade-up 0.5s ease 0.2s both" }}
          >
            Decentralized prediction markets powered by the PHPE hybrid AI engine.
            Stake ETH, analyze signals, and claim winnings — all on-chain.
          </p>
          <div className="mt-6 flex flex-wrap gap-2" style={{ animation: "fade-up 0.5s ease 0.3s both" }}>
            {[
              { label: "Ethereum", bg: "rgba(98,126,234,0.1)", border: "rgba(98,126,234,0.3)", color: "#627EEA" },
              { label: "Chainlink", bg: "rgba(55,91,210,0.1)", border: "rgba(55,91,210,0.3)", color: "#375BD2" },
              { label: "PHPE AI", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.3)", color: "#8B5CF6" },
              { label: "Solidity", bg: "rgba(0,212,255,0.08)", border: "rgba(0,212,255,0.25)", color: "#00D4FF" },
              { label: "Next.js", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" },
            ].map((b) => (
              <span
                key={b.label}
                className="rounded px-2.5 py-1 font-mono text-[10px] uppercase"
                style={{ background: b.bg, border: `1px solid ${b.border}`, color: b.color }}
              >
                {b.label}
              </span>
            ))}
          </div>
          <div className="mt-8 flex items-center gap-3" style={{ animation: "fade-up 0.5s ease 0.4s both" }}>
            <button
              type="button"
              onClick={scrollToMarkets}
              className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3.5 text-sm font-bold text-[#080B12] transition-all duration-200 hover:-translate-y-px hover:bg-white/90 hover:shadow-[0_8px_24px_rgba(255,255,255,0.12)]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Browse Markets <span className="animate-[bounce-down_1.5s_ease-in-out_infinite]">↓</span>
            </button>
            <Link
              href="/markets/create"
              className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-transparent px-6 py-3.5 text-sm font-semibold text-white/70 transition-all duration-200 hover:border-white/40 hover:bg-white/5 hover:text-white"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              ⊕ Create Market
            </Link>
          </div>
        </div>
        <div className="flex w-full max-w-[680px] justify-center md:max-w-[680px] md:justify-end">
          <DemoPanel />
        </div>
      </div>

      {/* Infinity scroll — debajo del hero main */}
      <div className="relative z-10 w-full -mt-4">
        <LiveTicker />
      </div>

      {scrollTop < 20 && (
        <div className="absolute bottom-8 left-1/2 flex flex-col items-center gap-2 -translate-x-1/2">
          <span className="font-mono text-[9px] tracking-[0.3em] text-white/20">SCROLL</span>
          <div className="h-5 w-px animate-[scroll-hint_2s_ease-in-out_infinite] bg-gradient-to-b from-transparent to-white/30" aria-hidden />
        </div>
      )}
    </section>
  );
}
