"use client";

const TICKER_ITEMS = [
  "BTC $67,432",
  "ETH $3,521",
  "Market #4 resolved YES",
  "New bet: 0.5 ETH on #7",
  "PHPE uncertainty: ±8%",
  "SOL $142",
  "Market #12 closes in 2h",
  "1.2 ETH staked on #3",
];

function renderItem(text: string) {
  const parts: { str: string; cyan: boolean }[] = [];
  const re = /(\$\d[\d.,]*|[\d.]+\s*ETH|\d[\d.,]*\s*%|±\d[\d.,]*%|#\d+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ str: text.slice(last, m.index), cyan: false });
    }
    parts.push({ str: m[0], cyan: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push({ str: text.slice(last), cyan: false });
  }
  return parts.length ? parts : [{ str: text, cyan: false }];
}

function TickerContent() {
  const duplicated = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <>
      {duplicated.map((item, i) => (
        <span key={`${i}-${item}`} className="inline-flex items-center shrink-0 font-mono text-xs whitespace-nowrap">
          {i > 0 && <span className="mx-2 text-text-muted">·</span>}
          {renderItem(item).map((part, j) => (
            <span key={j} className={part.cyan ? "text-cyan" : "text-text-secondary"}>
              {part.str}
            </span>
          ))}
        </span>
      ))}
    </>
  );
}

export function LiveTicker() {
  return (
    <div
      className="flex h-9 items-center overflow-hidden border-b border-border bg-elevated"
      style={{ height: 36 }}
      role="marquee"
      aria-live="polite"
      aria-label="Live feed"
    >
      <span className="shrink-0 pl-4 pr-3 font-mono text-[11px] text-cyan flex items-center gap-1">
        ◈ LIVE
      </span>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="ticker-track flex items-center w-max py-2">
          <TickerContent />
        </div>
      </div>
    </div>
  );
}
