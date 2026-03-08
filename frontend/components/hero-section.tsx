"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { ArrowDown, PlusCircle } from "lucide-react";
import { useMarketStats } from "@/hooks/use-markets";
import { Button } from "@/components/ui/button";
import { HeroDemoPanel } from "@/components/hero-demo-panel";
import { cn } from "@/lib/utils";

// ─── Typewriter hook ──────────────────────────────────────────────────────────

const TYPEWRITER_WORDS = ["FUTURE.", "MARKET.", "OUTCOME.", "CHAIN."];
const TYPEWRITER_SPEED = 75;
const TYPEWRITER_DELETE_SPEED = 45;
const TYPEWRITER_PAUSE = 2000;

function useTypewriter() {
  const [displayed, setDisplayed] = useState("FUTURE.");
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(7);
  const [deleting, setDeleting] = useState(false);
  const [pausing, setPausing] = useState(true);

  useEffect(() => {
    const word = TYPEWRITER_WORDS[wordIdx];
    if (pausing) {
      const t = setTimeout(() => setPausing(false), TYPEWRITER_PAUSE);
      return () => clearTimeout(t);
    }
    if (!deleting && charIdx < word.length) {
      const t = setTimeout(() => {
        setDisplayed(word.slice(0, charIdx + 1));
        setCharIdx((c: number) => c + 1);
      }, TYPEWRITER_SPEED);
      return () => clearTimeout(t);
    }
    if (!deleting && charIdx === word.length) {
      const t = setTimeout(() => setDeleting(true), TYPEWRITER_PAUSE);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx > 0) {
      const t = setTimeout(() => {
        setDisplayed(word.slice(0, charIdx - 1));
        setCharIdx((c: number) => c - 1);
      }, TYPEWRITER_DELETE_SPEED);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx === 0) {
      const nextIdx = (wordIdx + 1) % TYPEWRITER_WORDS.length;
      setWordIdx(nextIdx);
      setDeleting(false);
      setCharIdx(0);
      setPausing(false);
    }
  }, [displayed, wordIdx, charIdx, deleting, pausing]);

  return displayed;
}

// ─── Animated background ─────────────────────────────────────────────────────

interface Particle {
  id: number;
  left: string;
  top: string;
  duration: string;
  delay: string;
  color: string;
}

function HeroBackground() {
  const [mounted, setMounted] = useState(false);
  const particles = useMemo<Particle[]>(() => {
    const colors = ["var(--cyan)", "var(--violet)", "var(--green)"];
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${5 + (i * 4.7) % 90}%`,
      top: `${10 + (i * 7.3) % 80}%`,
      duration: `${6 + (i % 7) * 1.5}s`,
      delay: `${(i % 5) * 1.2}s`,
      color: colors[i % 3],
    }));
  }, []);

  useEffect(() => setMounted(true), []);

  const hexes = [
    { x: "6%",  y: "18%", size: 90,  delay: "0s",   cls: "hex-float"   },
    { x: "86%", y: "12%", size: 65,  delay: "1.5s", cls: "hex-float-2" },
    { x: "78%", y: "62%", size: 110, delay: "3s",   cls: "hex-float-3" },
    { x: "12%", y: "68%", size: 55,  delay: "0.8s", cls: "hex-float"   },
    { x: "48%", y: "3%",  size: 45,  delay: "2.2s", cls: "hex-float-2" },
    { x: "93%", y: "45%", size: 75,  delay: "4s",   cls: "hex-float-3" },
    { x: "35%", y: "80%", size: 50,  delay: "1s",   cls: "hex-float"   },
    { x: "60%", y: "25%", size: 40,  delay: "3.5s", cls: "hex-float-2" },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Grid */}
      <div className="hero-grid-bg absolute inset-0" />

      {/* Scan line */}
      <div className="hero-scan-line" />

      {/* Orbs */}
      <div className="hero-orb hero-orb-cyan" />
      <div className="hero-orb hero-orb-violet" />
      <div className="hero-orb hero-orb-green" />

      {/* Hexagons */}
      {hexes.map((h, i) => (
        <svg
          key={i}
          className={h.cls}
          style={{
            position: "absolute",
            left: h.x,
            top: h.y,
            width: h.size,
            height: h.size,
            animationDelay: h.delay,
          }}
          viewBox="0 0 100 100"
          fill="none"
        >
          <path
            d="M50 5L90 27.5V72.5L50 95L10 72.5V27.5L50 5Z"
            stroke="var(--cyan)"
            strokeWidth="1"
          />
        </svg>
      ))}

      {/* Particles */}
      {mounted && particles.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            top: p.top,
            background: p.color,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}

      {/* Corner accents */}
      <div
        className="absolute top-0 left-0 w-64 h-64 opacity-20"
        style={{
          background: "linear-gradient(135deg, rgba(0,212,255,0.15) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-64 h-64 opacity-20"
        style={{
          background: "linear-gradient(315deg, rgba(139,92,246,0.15) 0%, transparent 60%)",
        }}
      />
    </div>
  );
}

// ─── Stat row (métricas en fila con separadores verticales) ───────────────────

interface StatRowProps {
  stats: Array<{ value: string | number; label: string }>;
}

function StatRow({ stats }: StatRowProps) {
  return (
    <div className="flex items-center gap-4" role="list" aria-label="Métricas del producto">
      {stats.map((s, i) => (
        <div key={i} className="flex items-center gap-4" role="listitem">
          {i > 0 && (
            <div
              className="h-8 w-px shrink-0 bg-border"
              aria-hidden
            />
          )}
          <div className="flex flex-col">
            <span className="font-mono text-2xl font-bold tabular-nums text-cyan">
              {typeof s.value === "number" ? s.value.toLocaleString() : String(s.value)}
            </span>
            <span className="font-body text-xs text-text-secondary">{s.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

interface HeroSectionProps {
  marketsRef?: React.RefObject<HTMLElement | null>;
}

export function HeroSection({ marketsRef }: HeroSectionProps) {
  const word = useTypewriter();
  const { data: stats } = useMarketStats();

  const scrollToMarkets = useCallback(() => {
    if (marketsRef?.current) {
      marketsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [marketsRef]);

  const statRowData = [
    { value: stats?.open_markets ?? 847, label: "Active Markets" },
    { value: "$2.4M", label: "Total Staked" },
    { value: "94%", label: "PHPE Accuracy" },
  ];

  return (
    <section
      className="relative overflow-x-hidden"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
      aria-label="Hero"
    >
      <HeroBackground />

      {/* Vignette overlay — dark only; light uses none */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "var(--hero-vignette)",
        }}
        aria-hidden
      />

      {/* Split layout: 45fr left, 55fr right — responsive a 1 columna en móvil */}
      <div
        className="relative z-10 grid w-full grid-cols-1 gap-12 px-6 py-12 lg:grid-cols-[45fr_55fr] lg:gap-16 lg:px-16 lg:py-16"
        style={{
          width: "100%",
          maxWidth: "100%",
        }}
      >
        {/* COLUMNA IZQUIERDA (45%) — Copy, alineado a la izquierda */}
        <div className="flex flex-col items-start text-left">
          {/* Eyebrow badge */}
          <div
            className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-cyan/25 bg-cyan-dim px-5 py-2 backdrop-blur-sm"
            style={{ animation: "hero-sub-fade 0.5s ease 0.05s both" }}
          >
            <span
              className="h-2 w-2 rounded-full bg-green animate-pulse"
              style={{ boxShadow: "0 0 8px var(--green)" }}
              aria-hidden
            />
            <span className="font-mono text-[11px] text-cyan uppercase tracking-[0.2em]">
              Live on Ethereum Sepolia
            </span>
          </div>

          {/* Main headline */}
          <h1
            className="font-display font-extrabold text-left"
            style={{
              fontSize: "clamp(40px, 6vw, 80px)",
              lineHeight: 1.1,
              letterSpacing: "0.02em",
            }}
          >
          {/* Línea 1 — letras caen desde arriba */}
          <span className="block text-foreground" aria-label="PREDICT THE">
            {"PREDICT THE".split("").map((ch, i) =>
              ch === " " ? (
                <span key={i} className="hero-letter-space" aria-hidden />
              ) : (
                <span
                  key={i}
                  className="hero-letter"
                  style={{ animationDelay: `${0.1 + i * 0.045}s` }}
                  aria-hidden
                >
                  {ch}
                </span>
              )
            )}
          </span>

          {/* Línea 2 — typewriter con glow */}
          <span
            className="block relative"
            style={{ minHeight: "1.15em" }}
            aria-live="polite"
          >
            <span
              className="text-gradient-cyan-violet"
              style={{ filter: "drop-shadow(0 0 32px rgba(0,212,255,0.5))" }}
            >
              {word}
            </span>
            <span className="cursor-blink ml-1 text-cyan" aria-hidden>|</span>
          </span>

          {/* Línea 3 — letras suben desde abajo + shimmer de color continuo */}
          <span className="hero-line3-shimmer" aria-label="ON-CHAIN.">
            {"ON-CHAIN.".split("").map((ch, i) =>
              ch === " " ? (
                <span key={i} className="hero-letter-space" aria-hidden />
              ) : (
                <span
                  key={i}
                  className="hero-letter-rise shimmer-loop"
                  style={{
                    animationDelay: `${0.55 + i * 0.05}s`,
                    animationDuration: "0.55s, 3s",
                    animationIterationCount: "1, infinite",
                  }}
                  aria-hidden
                >
                  {ch}
                </span>
              )
            )}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="hero-sub mt-6 max-w-lg font-body text-sm text-text-secondary leading-relaxed">
          Decentralized prediction markets powered by the PHPE hybrid AI engine.
          Stake ETH, analyze signals, and claim winnings — all on-chain.
        </p>

        {/* StatRow — métricas en fila con separadores */}
        <div className="hero-stats mt-6">
          <StatRow stats={statRowData} />
        </div>

        {/* CTAs */}
        <div className="hero-cta mt-7 flex flex-wrap items-center justify-start gap-4">
          {/* Primary — gradient border button */}
          <button
            type="button"
            onClick={scrollToMarkets}
            className="group relative inline-flex items-center gap-2.5 rounded-xl overflow-hidden font-body font-semibold text-sm transition-all duration-300 hover:scale-[1.03]"
            style={{
              padding: "1px",
              background: "linear-gradient(135deg, var(--cyan), var(--violet))",
              boxShadow: "0 0 24px rgba(0,212,255,0.2)",
            }}
            aria-label="Browse markets"
          >
            <span className="flex items-center gap-2.5 rounded-[calc(0.75rem-1px)] bg-surface px-6 py-3 transition-colors group-hover:bg-transparent">
              <span className="text-foreground group-hover:text-black transition-colors">Browse Markets</span>
              <ArrowDown className="h-4 w-4 text-cyan group-hover:text-black transition-colors" aria-hidden />
            </span>
          </button>

          {/* Secondary */}
          <Button
            variant="outline"
            asChild
            className="rounded-xl border-border-bright bg-transparent hover:border-violet/50 hover:bg-violet-dim transition-all duration-300 hover:scale-[1.03] px-6 py-3 h-auto"
          >
            <Link href="/markets/create" className="flex items-center gap-2.5">
              <PlusCircle className="h-4 w-4 text-violet" aria-hidden />
              <span className="font-body font-semibold text-sm">Create Market</span>
            </Link>
          </Button>
        </div>

        {/* Scroll hint */}
        <div className="hero-stats mt-8 flex flex-col items-start gap-1.5 opacity-40">
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">Scroll</span>
          <div
            className="w-px h-6"
            style={{ background: "linear-gradient(to bottom, var(--cyan), transparent)" }}
            aria-hidden
          />
        </div>
        </div>

        {/* COLUMNA DERECHA (55%) — Panel de demo interactivo */}
        <div className="flex items-center justify-center lg:justify-end">
          <div className="w-full max-w-lg">
            <HeroDemoPanel />
          </div>
        </div>
      </div>
    </section>
  );
}
