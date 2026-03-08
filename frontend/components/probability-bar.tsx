"use client";

import { useState, useEffect } from "react";

interface ProbabilityBarProps {
  /** YES percentage (0–100). NO = 100 - yesPct. */
  initialYesPct: number;
  /** Oscillate +/- 1% every 3000ms */
  animate?: boolean;
}

export function ProbabilityBar({
  initialYesPct,
  animate = true,
}: ProbabilityBarProps) {
  const [yesPct, setYesPct] = useState(initialYesPct);
  const noPct = 100 - yesPct;

  useEffect(() => {
    setYesPct(initialYesPct);
  }, [initialYesPct]);

  useEffect(() => {
    if (!animate) return;
    const interval = setInterval(() => {
      setYesPct((prev) => {
        const delta = Math.floor(Math.random() * 3) - 1;
        const next = Math.max(20, Math.min(80, prev + delta));
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [animate]);

  return (
    <div className="mb-4" role="group" aria-label="Probability bar">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-elevated">
        <div
          className="bg-cyan transition-all duration-500 ease-out"
          style={{ width: `${yesPct}%` }}
        />
        <div
          className="bg-red transition-all duration-500 ease-out"
          style={{ width: `${noPct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[11px] tabular-nums">
        <span className="text-cyan">YES {yesPct}%</span>
        <span className="text-red">NO {noPct}%</span>
      </div>
    </div>
  );
}
