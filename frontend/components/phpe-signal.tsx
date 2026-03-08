"use client";

interface PHPESignalProps {
  signal: string;
  confidence: number;
  tooltip?: string;
}

export function PHPESignal({
  signal,
  confidence,
  tooltip = "Based on 847 on-chain data points",
}: PHPESignalProps) {
  return (
    <div
      className="relative mb-4 rounded-lg border border-green/30 bg-green-dim/50 px-3 py-2"
      title={tooltip}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm" aria-hidden>⚡</span>
        <span className="font-mono text-[11px] font-medium text-green">
          PHPE Signal: {signal}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
          <div
            className="php-confidence-shimmer h-full rounded-full bg-green transition-all duration-500"
            style={{ width: `${confidence}%` }}
          />
        </div>
        <span className="font-mono text-[10px] text-text-muted tabular-nums">
          Confidence: {confidence}%
        </span>
      </div>
    </div>
  );
}
