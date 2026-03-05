"use client";

import { useState } from "react";
import { DollarSign, Cloud, Trophy, Brain } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ResolutionSourceType = "price_above" | "weather_rained" | "sports_winner" | "ai_sentiment";

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
}

const SOURCES = [
  {
    type: "price_above" as const,
    label: "Precio de activo",
    endpoint: "/api/price/above",
    icon: DollarSign,
    description: "Resuelve si el precio supera un umbral",
    color: "text-amber-400",
    borderColor: "border-amber-400/40",
    bgColor: "bg-amber-400/10",
  },
  {
    type: "weather_rained" as const,
    label: "Clima",
    endpoint: "/api/weather/rained",
    icon: Cloud,
    description: "Resuelve si llovió en una ubicación y fecha",
    color: "text-blue-400",
    borderColor: "border-blue-400/40",
    bgColor: "bg-blue-400/10",
  },
  {
    type: "sports_winner" as const,
    label: "Resultado deportivo",
    endpoint: "/api/sports/winner",
    icon: Trophy,
    description: "Resuelve según el ganador de un partido",
    color: "text-green-400",
    borderColor: "border-green-400/40",
    bgColor: "bg-green-400/10",
  },
  {
    type: "ai_sentiment" as const,
    label: "Sentimiento IA",
    endpoint: "/api/ai/sentiment",
    icon: Brain,
    description: "Resuelve según análisis de sentimiento de texto",
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
          Símbolo (ej: BTCUSDT)
        </label>
        <Input
          placeholder="BTCUSDT"
          value={params.symbol ?? ""}
          onChange={(e) => onChange({ symbol: e.target.value })}
          className="font-mono text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Umbral (USD)
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
          Fuente
        </label>
        <div className="flex gap-2">
          {["binance", "coingecko"].map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => onChange({ priceSource: src })}
              className={cn(
                "flex-1 rounded-md border py-1.5 font-mono text-xs transition-all",
                (params.priceSource ?? "binance") === src
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
                  : "border-border bg-elevated text-text-muted hover:border-border-bright"
              )}
            >
              {src}
            </button>
          ))}
        </div>
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
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Latitud
        </label>
        <Input
          type="number"
          placeholder="9.0"
          value={params.lat ?? ""}
          onChange={(e) => onChange({ lat: e.target.value })}
          className="font-mono text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Longitud
        </label>
        <Input
          type="number"
          placeholder="-79.5"
          value={params.lon ?? ""}
          onChange={(e) => onChange({ lon: e.target.value })}
          className="font-mono text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Fecha
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
          ID del partido
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
          Equipo ganador
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
          Texto a analizar
        </label>
        <textarea
          placeholder="Describe el evento o contexto para analizar el sentimiento..."
          value={params.sentimentText ?? ""}
          onChange={(e) => onChange({ sentimentText: e.target.value })}
          rows={3}
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 font-body text-sm text-foreground placeholder:text-text-muted focus:border-cyan focus:outline-none focus:ring-[3px] focus:ring-cyan-dim resize-none"
        />
      </div>
      <div className="space-y-1.5">
        <label className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Umbral de probabilidad (0–1)
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
          ¿Cómo se resolverá este mercado?
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
                  "flex items-start gap-3 rounded-md border p-3 text-left transition-all",
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
        <div className="rounded-md border border-border bg-elevated p-4 space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
            Parámetros de resolución
          </p>
          {value.type === "price_above" && (
            <PriceParams params={value} onChange={handleParamChange} />
          )}
          {value.type === "weather_rained" && (
            <WeatherParams params={value} onChange={handleParamChange} />
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
