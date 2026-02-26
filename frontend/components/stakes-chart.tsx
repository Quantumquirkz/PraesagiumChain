// @ts-nocheck — recharts types vs React
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatEth } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface StakesChartProps {
  yesStake: bigint;
  noStake: bigint;
  className?: string;
}

const GREEN = "var(--green)"; // #00E87A YES
const RED = "var(--red)"; // #FF3D5A NO

export function StakesChart({ yesStake, noStake, className }: StakesChartProps) {
  const total = yesStake + noStake;
  const yesPct = total > BigInt(0) ? Number((yesStake * BigInt(100)) / total) : 50;
  const noPct = 100 - yesPct;

  const data = [
    { name: "YES", value: Number(yesStake), pct: yesPct, fill: GREEN },
    { name: "NO", value: Number(noStake), pct: noPct, fill: RED },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Large horizontal bars */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between font-mono text-sm">
            <span className="text-green">YES</span>
            <span className="text-text-secondary">
              {formatEth(yesStake)} · {yesPct}%
            </span>
          </div>
          <div className="h-6 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-green-500/90 transition-all duration-500"
              style={{ width: `${yesPct}%` }}
              role="presentation"
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between font-mono text-sm">
            <span className="text-red">NO</span>
            <span className="text-text-secondary">
              {formatEth(noStake)} · {noPct}%
            </span>
          </div>
          <div className="h-6 w-full overflow-hidden rounded-full bg-elevated">
            <div
              className="h-full rounded-full bg-red/90 transition-all duration-500"
              style={{ width: `${noPct}%` }}
              role="presentation"
            />
          </div>
        </div>
      </div>

      <p className="font-mono text-sm font-medium text-text-secondary">
        Total: {formatEth(total)} ETH
      </p>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={32} tick={{ fontSize: 12 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg border border-border bg-elevated px-3 py-2 font-mono text-sm shadow-lg">
                    <span className="font-medium">{d.name}: </span>
                    {formatEth(BigInt(d.value))} · {d.pct}%
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={4}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
