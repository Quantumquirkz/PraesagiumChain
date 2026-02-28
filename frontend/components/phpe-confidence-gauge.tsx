"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PhpeConfidenceGaugeProps {
  confidence: number;
  label?: string;
  size?: number;
  className?: string;
}

function confidenceColor(c: number): string {
  if (c >= 0.75) return "var(--green)";
  if (c >= 0.5)  return "var(--cyan)";
  if (c >= 0.25) return "var(--gold)";
  return "var(--red)";
}

function confidenceLabel(c: number): string {
  if (c >= 0.75) return "HIGH";
  if (c >= 0.5)  return "MEDIUM";
  if (c >= 0.25) return "LOW";
  return "VERY LOW";
}

// Generate tick marks around the 270° arc
function buildTicks(cx: number, cy: number, outerR: number, count: number) {
  const startAngle = 135; // degrees — matches the SVG rotation
  const totalDeg = 270;
  const ticks = [];
  for (let i = 0; i <= count; i++) {
    const angle = startAngle + (i / count) * totalDeg;
    const rad = (angle * Math.PI) / 180;
    const isMajor = i % (count / 5) === 0;
    const innerR = outerR - (isMajor ? 10 : 6);
    ticks.push({
      x1: cx + outerR * Math.cos(rad),
      y1: cy + outerR * Math.sin(rad),
      x2: cx + innerR * Math.cos(rad),
      y2: cy + innerR * Math.sin(rad),
      isMajor,
    });
  }
  return ticks;
}

export function PhpeConfidenceGauge({
  confidence,
  label = "PHPE CONFIDENCE",
  size = 160,
  className,
}: PhpeConfidenceGaugeProps) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 1400;
    const raf = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimated(ease * confidence);
      if (t < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [confidence]);

  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = size * 0.07;
  const trackWidth  = size * 0.025;
  const radius      = (size - strokeWidth * 2 - 8) / 2;
  const outerRadius = radius + strokeWidth / 2 + 6;
  const circumference = 2 * Math.PI * radius;

  const arcFraction  = 0.75;
  const arcLength    = circumference * arcFraction;
  const gapLength    = circumference * (1 - arcFraction);
  const progressLen  = arcLength * Math.min(Math.max(animated, 0), 1);

  const color       = confidenceColor(confidence);
  const pct         = Math.round(confidence * 100);
  const animatedPct = Math.round(animated * 100);

  // Ticks — 20 segments = 21 ticks
  const ticks = buildTicks(cx, cy, outerRadius, 20);

  // Segment thresholds for the colored track (0.25, 0.5, 0.75)
  const segColors = [
    { from: 0,    to: 0.25, color: "var(--red)"  },
    { from: 0.25, to: 0.5,  color: "var(--gold)" },
    { from: 0.5,  to: 0.75, color: "var(--cyan)" },
    { from: 0.75, to: 1.0,  color: "var(--green)"},
  ];

  return (
    <div
      className={cn("flex flex-col items-center gap-2", className)}
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label}: ${pct}%`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden
        >
          <defs>
            {/* Glow filter */}
            <filter id="gauge-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Strong glow for progress arc */}
            <filter id="gauge-glow-strong" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Outer tick ring ── */}
          <g transform={`rotate(0, ${cx}, ${cy})`}>
            {ticks.map((t, i) => (
              <line
                key={i}
                x1={t.x1} y1={t.y1}
                x2={t.x2} y2={t.y2}
                stroke={t.isMajor ? "var(--border-bright)" : "var(--border)"}
                strokeWidth={t.isMajor ? 1.5 : 1}
                strokeLinecap="round"
              />
            ))}
          </g>

          {/* ── Background track ── */}
          <g transform={`rotate(135, ${cx}, ${cy})`}>
            <circle
              cx={cx} cy={cy} r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcLength} ${gapLength}`}
              strokeLinecap="round"
            />

            {/* Colored segment hints on track */}
            {segColors.map((seg, i) => {
              const segStart  = arcLength * seg.from;
              const segLen    = arcLength * (seg.to - seg.from);
              const dashOffset = -segStart;
              return (
                <circle
                  key={i}
                  cx={cx} cy={cy} r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={trackWidth}
                  strokeDasharray={`${segLen - 2} ${circumference - segLen + 2}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                  opacity={0.18}
                />
              );
            })}

            {/* Progress arc */}
            <circle
              cx={cx} cy={cy} r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${progressLen} ${circumference - progressLen}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              filter="url(#gauge-glow-strong)"
              style={{ transition: "stroke 0.4s ease" }}
            />

            {/* Thin bright highlight on top of progress */}
            <circle
              cx={cx} cy={cy} r={radius}
              fill="none"
              stroke="white"
              strokeWidth={strokeWidth * 0.2}
              strokeDasharray={`${progressLen * 0.3} ${circumference - progressLen * 0.3}`}
              strokeDashoffset={-(progressLen * 0.7)}
              strokeLinecap="round"
              opacity={0.25}
            />
          </g>
        </svg>

        {/* Center content */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ paddingTop: size * 0.04 }}
        >
          {/* Percentage */}
          <span
            className="font-display font-extrabold tabular-nums leading-none"
            style={{
              fontSize: size * 0.28,
              color,
              textShadow: `0 0 ${size * 0.12}px ${color}88`,
            }}
          >
            {animatedPct}
            <span style={{ fontSize: size * 0.13, opacity: 0.7 }}>%</span>
          </span>

          {/* Label */}
          <span
            className="font-mono uppercase tracking-widest mt-1 font-bold"
            style={{
              fontSize: size * 0.072,
              color,
              opacity: 0.85,
            }}
          >
            {confidenceLabel(confidence)}
          </span>

          {/* Sub-label */}
          <span
            className="font-mono text-text-muted uppercase tracking-widest mt-0.5"
            style={{ fontSize: size * 0.055 }}
          >
            confidence
          </span>
        </div>
      </div>

      {/* External label */}
      <p className="font-mono text-[11px] text-text-muted uppercase tracking-widest text-center">
        {label}
      </p>
    </div>
  );
}
