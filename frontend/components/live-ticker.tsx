"use client";

import { useTickerPrices } from "@/hooks/use-ticker-prices";
import { useIsMounted } from "@/hooks/use-is-mounted";

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface TickerItem {
  key: string;
  label: string;
  value: string;
  change?: number | null;
}

// ─── Items de eventos de mercado (estáticos / mock) ───────────────────────────

const MARKET_EVENTS: TickerItem[] = [
  { key: "ev1", label: "Market #4", value: "resolved YES" },
  { key: "ev2", label: "New bet:", value: "0.5 ETH on #7" },
  { key: "ev3", label: "PHPE:", value: "±8% uncertainty" },
  { key: "ev4", label: "Market #12", value: "closes in 2h" },
  { key: "ev5", label: "1.2 ETH", value: "staked on #3" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUSD(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  });
}

function formatRate(value: number): string {
  return value.toFixed(4);
}

function formatChange(change: number): string {
  return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
}

// ─── Subcomponente: un item del ticker ────────────────────────────────────────

function PriceItem({ item }: { item: TickerItem }) {
  const hasChange = item.change != null;
  const isPositive = (item.change ?? 0) >= 0;
  const arrow = isPositive ? "▲" : "▼";
  const changeColor = isPositive ? "var(--green)" : "var(--red)";

  return (
    <span className="inline-flex items-center gap-1 shrink-0 font-mono text-xs whitespace-nowrap">
      <span className="text-text-muted">{item.label}</span>
      <span className="text-cyan">{item.value}</span>
      {hasChange && (
        <span style={{ color: changeColor }}>
          {arrow} {formatChange(item.change!)}
        </span>
      )}
    </span>
  );
}

function EventItem({ item }: { item: TickerItem }) {
  return (
    <span className="inline-flex items-center gap-1 shrink-0 font-mono text-xs whitespace-nowrap">
      <span className="text-text-muted">{item.label}</span>
      <span className="text-text-secondary">{item.value}</span>
    </span>
  );
}

function Separator() {
  return <span className="mx-3 shrink-0 text-text-muted select-none">◆</span>;
}

// ─── Placeholders mientras carga ─────────────────────────────────────────────

const LOADING_ITEMS: TickerItem[] = [
  { key: "btc-loading", label: "BTC:", value: "--" },
  { key: "eth-loading", label: "ETH:", value: "--" },
  { key: "eur-loading", label: "EUR/USD:", value: "--" },
];

// ─── Contenido del ticker ─────────────────────────────────────────────────────

function TickerContent() {
  const { data: prices, isLoading } = useTickerPrices();
  const mounted = useIsMounted();

  // Antes del montaje renderizar siempre los placeholders para evitar mismatch
  if (!mounted) {
    return (
      <>
        {LOADING_ITEMS.map((item, i) => (
          <span key={`${item.key}-${i}`} className="inline-flex items-center shrink-0">
            {i > 0 && <Separator />}
            <PriceItem item={item} />
          </span>
        ))}
      </>
    );
  }

  // Construye los items de precio
  const priceItems: TickerItem[] = [];

  if (isLoading) {
    priceItems.push(...LOADING_ITEMS);
  } else {
    if (prices?.btc?.price != null) {
      priceItems.push({
        key: "btc",
        label: "BTC:",
        value: formatUSD(prices.btc.price),
        change: prices.btc.change_24h ?? null,
      });
    }
    if (prices?.eth?.price != null) {
      priceItems.push({
        key: "eth",
        label: "ETH:",
        value: formatUSD(prices.eth.price),
        change: prices.eth.change_24h ?? null,
      });
    }
    if (prices?.eur?.rate != null) {
      priceItems.push({
        key: "eur",
        label: "EUR/USD:",
        value: formatRate(prices.eur.rate),
        change: prices.eur.change_24h ?? null,
      });
    }
  }

  // Combina precios + eventos, duplicados para el loop continuo
  const allItems = [...priceItems, ...MARKET_EVENTS];
  const duplicated = [...allItems, ...allItems];

  return (
    <>
      {duplicated.map((item, i) => {
        const isPrice = priceItems.some((p) => p.key === item.key) || LOADING_ITEMS.some((p) => p.key === item.key);
        return (
          <span key={`${item.key}-${i}`} className="inline-flex items-center shrink-0">
            {i > 0 && <Separator />}
            {isPrice ? (
              <PriceItem item={item} />
            ) : (
              <EventItem item={item} />
            )}
          </span>
        );
      })}
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function LiveTicker() {
  return (
    <div
      className="flex h-9 items-center overflow-hidden border-b border-border bg-elevated"
      style={{ height: 36 }}
      role="marquee"
      aria-live="polite"
      aria-label="Live market feed"
    >
      <span className="shrink-0 pl-4 pr-3 font-mono text-[11px] text-cyan flex items-center gap-1 border-r border-border">
        ◈ LIVE
      </span>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="ticker-track flex items-center w-max py-2 pl-4">
          <TickerContent />
        </div>
      </div>
    </div>
  );
}
