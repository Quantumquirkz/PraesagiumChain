"use client";

import { useState } from "react";
import { DollarSign, Cloud, Trophy, Brain } from "lucide-react";
import { Input } from "@/components/ui/input";
import { WeatherChart } from "@/components/weather-chart";
import { resolveMapsLocation } from "@/lib/api";
import { cn } from "@/lib/utils";

type ResolutionSourceType = "price_above" | "weather_rained" | "sports_winner" | "ai_sentiment";

export interface ResolutionSourceParams {
  type: ResolutionSourceType;
  // price_above
  symbol?: string;
  threshold?: string;
  priceSource?: string;
  // weather_rained
  lat?: string;
  lon?: string;
  date?: string;
  /** Google Maps link: when pasted, lat/lon are extracted automatically */
  googleMapsUrl?: string;
  // sports_winner
  fixtureId?: string;
  winnerTeam?: string;
  // ai_sentiment
  sentimentText?: string;
  sentimentThreshold?: string;
}

interface ResolutionSourcePickerProps {
  value: ResolutionSourceParams;
  onChange: (params: ResolutionSourceParams) => void;
  className?: string;
  /** When true, render a more compact layout (e.g. on create market step). */
  compactMode?: boolean;
  /** When true, show only asset price resolution options. */
  onlyAssetPrice?: boolean;
}

const SOURCES = [
  {
    type: "price_above" as const,
    label: "Asset price",
    endpoint: "/api/price/above",
    icon: DollarSign,
    description: "Resolves if price exceeds a threshold",
    color: "text-amber-400",
    borderColor: "border-amber-400/40",
    bgColor: "bg-amber-400/10",
  },
  {
    type: "weather_rained" as const,
    label: "Weather",
    endpoint: "/api/weather/rained",
    icon: Cloud,
    description: "Resolves if it rained at a location and date",
    color: "text-blue-400",
    borderColor: "border-blue-400/40",
    bgColor: "bg-blue-400/10",
  },
  {
    type: "sports_winner" as const,
    label: "Sports result",
    endpoint: "/api/sports/winner",
    icon: Trophy,
    description: "Resolves by match winner",
    color: "text-green-400",
    borderColor: "border-green-400/40",
    bgColor: "bg-green-400/10",
  },
  {
    type: "ai_sentiment" as const,
    label: "AI sentiment",
    endpoint: "/api/ai/sentiment",
    icon: Brain,
    description: "Resolves by text sentiment analysis",
    color: "text-violet",
    borderColor: "border-violet/40",
    bgColor: "bg-violet-dim",
  },
] as const;

function PriceParams({
  params,
  onChange,
}: {
  params: ResolutionSourceParams;
  onChange: (p: Partial<ResolutionSourceParams>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Symbol ({params.priceSource === "chainlink" ? "ETH_USD or BTC_USD" : "e.g. BTCUSDT"})
        </label>
        <Input
          placeholder={params.priceSource === "chainlink" ? "BTC_USD" : "BTCUSDT"}
          value={params.symbol ?? ""}
          onChange={(e) => onChange({ symbol: e.target.value })}
          className="font-mono text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Threshold (USD)
        </label>
        <Input
          type="number"
          placeholder="100000"
          value={params.threshold ?? ""}
          onChange={(e) => onChange({ threshold: e.target.value })}
          className="font-mono text-sm"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Source
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "binance", label: "Binance" },
            { id: "coingecko", label: "CoinGecko" },
            { id: "chainlink", label: "Chainlink Data Feeds" },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                onChange({
                  priceSource: id,
                  symbol: id === "chainlink" ? "BTC_USD" : (params.symbol ?? "BTCUSDT"),
                });
              }}
              className={cn(
                "rounded-lg border py-1.5 px-3 font-mono text-xs transition-all",
                (params.priceSource ?? "binance") === id
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
                  : "border-border bg-elevated text-text-muted hover:border-border-bright"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {(params.priceSource ?? "binance") === "chainlink" && (
          <p className="mt-2 font-mono text-[10px] text-green">
            Resolves with Chainlink Automation + Data Feeds on-chain
          </p>
        )}
      </div>
    </div>
  );
}

function WeatherParams({
  params,
  onChange,
}: {
  params: ResolutionSourceParams;
  onChange: (p: Partial<ResolutionSourceParams>) => void;
}) {
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  /** Extract lat,lon from a Google Maps URL: @lat,lon (place or maps), ?q=lat,lon, ll=lat,lon. */
  const parseGoogleMapsUrl = (url: string): { lat: string; lon: string } | null => {
    const u = url.trim();
    if (!u) return null;
    // @lat,lon,zoom or @lat,lon,1549m (place format: google.com/maps/place/.../@8.95,-79.54,...)
    const atMatch = u.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) return { lat: atMatch[1], lon: atMatch[2] };
    const qMatch = u.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) return { lat: qMatch[1], lon: qMatch[2] };
    const llMatch = u.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (llMatch) return { lat: llMatch[1], lon: llMatch[2] };
    return null;
  };

  const isShortMapsLink = (url: string) => {
    const u = url.trim();
    return /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps)\//i.test(u);
  };

  const handleMapsUrlChange = (value: string) => {
    setResolveError(null);
    onChange({ googleMapsUrl: value || undefined });
    const coords = parseGoogleMapsUrl(value);
    if (coords) onChange({ lat: coords.lat, lon: coords.lon });
  };

  const handleMapsUrlBlur = async () => {
    const url = (params.googleMapsUrl ?? "").trim();
    if (!url) return;
    if (parseGoogleMapsUrl(url)) return;
    if (!isShortMapsLink(url)) return;
    setResolving(true);
    setResolveError(null);
    try {
      const { lat, lon } = await resolveMapsLocation(url);
      onChange({ lat: String(lat), lon: String(lon) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not get location";
      setResolveError(
        /404|not found/i.test(msg)
          ? "Short link is not available. Use the long link: in Google Maps open the place → Share → Copy link."
          : msg
      );
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Google Maps link
        </label>
        <Input
          type="url"
          placeholder="https://www.google.com/maps/place/.../@8.95,-79.54,15z"
          value={params.googleMapsUrl ?? ""}
          onChange={(e) => handleMapsUrlChange(e.target.value)}
          onBlur={handleMapsUrlBlur}
          disabled={resolving}
          className="font-mono text-sm"
        />
        <p className="font-mono text-[10px] text-text-muted">
          Use the <strong>long link</strong> from Google Maps: open the place in Maps → Share → Copy link (e.g. google.com/maps/place/.../@lat,lon,...). This provides weather data and the chart when creating the market.
        </p>
        {resolving && <p className="font-mono text-[10px] text-cyan">Resolving link…</p>}
        {resolveError && <p className="font-mono text-[10px] text-red" role="alert">{resolveError}</p>}
      </div>
      <div className="space-y-1.5">
        <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Date
        </label>
        <Input
          type="date"
          value={params.date ?? ""}
          onChange={(e) => onChange({ date: e.target.value })}
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}

function SportsParams({
  params,
  onChange,
}: {
  params: ResolutionSourceParams;
  onChange: (p: Partial<ResolutionSourceParams>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Match ID
        </label>
        <Input
          placeholder="12345"
          value={params.fixtureId ?? ""}
          onChange={(e) => onChange({ fixtureId: e.target.value })}
          className="font-mono text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Winning team
        </label>
        <Input
          placeholder="TeamA"
          value={params.winnerTeam ?? ""}
          onChange={(e) => onChange({ winnerTeam: e.target.value })}
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}

function SentimentParams({
  params,
  onChange,
}: {
  params: ResolutionSourceParams;
  onChange: (p: Partial<ResolutionSourceParams>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Text to analyze
        </label>
        <textarea
          placeholder="Describe the event or context to analyze sentiment..."
          value={params.sentimentText ?? ""}
          onChange={(e) => onChange({ sentimentText: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-border bg-elevated px-3 py-2 font-body text-sm text-foreground placeholder:text-text-muted focus:border-cyan focus:outline-none focus:ring-[3px] focus:ring-cyan-dim resize-none"
        />
      </div>
      <div className="space-y-1.5">
        <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Probability threshold (0–1)
        </label>
        <Input
          type="number"
          step="0.05"
          min="0"
          max="1"
          placeholder="0.6"
          value={params.sentimentThreshold ?? ""}
          onChange={(e) => onChange({ sentimentThreshold: e.target.value })}
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}

export function ResolutionSourcePicker({
  value,
  onChange,
  className,
  compactMode: _compactMode,
  onlyAssetPrice: _onlyAssetPrice,
}: ResolutionSourcePickerProps) {
  const handleTypeChange = (type: ResolutionSourceType) => {
    onChange({ type });
  };

  const handleParamChange = (partial: Partial<ResolutionSourceParams>) => {
    onChange({ ...value, ...partial });
  };

  const selectedSource = SOURCES.find((s) => s.type === value.type);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1.5">
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          How will this market be resolved?
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SOURCES.map((source) => {
            const Icon = source.icon;
            const isSelected = value.type === source.type;
            return (
              <button
                key={source.type}
                type="button"
                onClick={() => handleTypeChange(source.type)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                  isSelected
                    ? `${source.borderColor} ${source.bgColor}`
                    : "border-border bg-elevated hover:border-border-bright"
                )}
              >
                <Icon
                  className={cn("mt-0.5 h-4 w-4 shrink-0", isSelected ? source.color : "text-text-muted")}
                />
                <div className="min-w-0">
                  <p
                    className={cn(
                      "font-mono text-xs font-bold",
                      isSelected ? source.color : "text-foreground"
                    )}
                  >
                    {source.label}
                  </p>
                  <p className="font-body text-[11px] text-text-muted mt-0.5">
                    {source.description}
                  </p>
                  <p className="font-mono text-[10px] text-text-muted mt-1 opacity-70">
                    {source.endpoint}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedSource && (
        <div className="rounded-xl border border-border bg-elevated p-4 space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Resolution parameters
        </p>
          {value.type === "price_above" && (
            <PriceParams params={value} onChange={handleParamChange} />
          )}
          {value.type === "weather_rained" && (
            <>
              <WeatherParams params={value} onChange={handleParamChange} />
              {value.lat != null &&
                value.lon != null &&
                Number.isFinite(parseFloat(value.lat)) &&
                Number.isFinite(parseFloat(value.lon)) && (
                  <WeatherChart
                    lat={parseFloat(value.lat)}
                    lon={parseFloat(value.lon)}
                    className="mt-3"
                  />
                )}
            </>
          )}
          {value.type === "sports_winner" && (
            <SportsParams params={value} onChange={handleParamChange} />
          )}
          {value.type === "ai_sentiment" && (
            <SentimentParams params={value} onChange={handleParamChange} />
          )}
        </div>
      )}
    </div>
  );
}
