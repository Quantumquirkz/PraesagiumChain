"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ExternalLink } from "lucide-react";
import { getWeatherHistoryForecast } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface WeatherDetailChartProps {
  lat: number;
  lon: number;
  /** Resolution date YYYY-MM-DD for caption and to cap forecast */
  resolutionDate?: string;
  /** If set, show "View location on Google Maps" link */
  googleMapsUrl?: string;
  className?: string;
}

/**
 * Weather chart for the market detail page: history (real data until yesterday)
 * + forecast from today. Uses the location from the Google Maps link set when creating the market.
 */
export function WeatherDetailChart({
  lat,
  lon,
  resolutionDate,
  googleMapsUrl,
  className,
}: WeatherDetailChartProps) {
  const [data, setData] = useState<{
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    let cancelled = false;
    getWeatherHistoryForecast(lat, lon, resolutionDate)
      .then((res) => {
        if (!cancelled) {
          setData(res.daily);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error loading data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lon, resolutionDate]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.time.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio ?? 1;
    const W = canvas.width;
    const H = canvas.height;
    const w = W / dpr;
    const h = H / dpr;
    if (w <= 0 || h <= 0) return;

    const padding = { top: 12, right: 40, bottom: 24, left: 44 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const allTemps = [...data.temperature_2m_max, ...data.temperature_2m_min].filter(Number.isFinite);
    const tempMin = allTemps.length ? Math.min(...allTemps) - 2 : 0;
    const tempMax = allTemps.length ? Math.max(...allTemps) + 2 : 40;
    const tempRange = tempMax - tempMin || 1;
    const precMax = Math.max(0.1, ...data.precipitation_sum.filter(Number.isFinite));
    const n = data.time.length;
    const stepX = n > 1 ? chartW / (n - 1) : 0;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const toYTemp = (v: number) =>
      padding.top + chartH - ((v - tempMin) / tempRange) * chartH;
    const toYPrec = (v: number) =>
      padding.top + chartH - (v / precMax) * chartH * 0.35;

    for (let i = 0; i < n; i++) {
      const x = padding.left + i * stepX;
      const maxT = data.temperature_2m_max[i];
      if (i === 0) ctx.beginPath();
      if (i === 0) ctx.moveTo(x, toYTemp(maxT));
      else ctx.lineTo(x, toYTemp(maxT));
    }
    ctx.strokeStyle = "rgba(239, 68, 68, 0.95)";
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < n; i++) {
      const x = padding.left + i * stepX;
      const minT = data.temperature_2m_min[i];
      if (i === 0) ctx.beginPath();
      if (i === 0) ctx.moveTo(x, toYTemp(minT));
      else ctx.lineTo(x, toYTemp(minT));
    }
    ctx.strokeStyle = "rgba(56, 189, 248, 0.95)";
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < n; i++) {
      const x = padding.left + i * stepX;
      const prec = data.precipitation_sum[i];
      if (i === 0) ctx.beginPath();
      if (i === 0) ctx.moveTo(x, toYPrec(prec));
      else ctx.lineTo(x, toYPrec(prec));
    }
    ctx.strokeStyle = "rgba(168, 85, 247, 0.95)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "var(--text-muted)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    const labelStep = Math.max(1, Math.floor(n / 8));
    for (let i = 0; i < n; i += labelStep) {
      const label = data.time[i].slice(5);
      ctx.fillText(label, padding.left + i * stepX, h - 6);
    }

    ctx.restore();
  }, [data]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    if (!data) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio ?? 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    draw();
  }, [data, draw]);

  const resolutionLabel = resolutionDate
    ? new Date(resolutionDate + "T12:00:00").toLocaleDateString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).replace(/\//g, "/")
    : null;

  return (
    <section
      className={cn("rounded-xl border border-border bg-elevated/30 overflow-hidden", className)}
      aria-label="Weather history and forecast chart"
    >
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-display font-bold text-[11px] text-text-muted tracking-widest uppercase mb-1.5">
          Resolution
        </h3>
        <p className="font-mono text-xs text-foreground">
          Weather • Data for the Google Maps Link Location set when creating the market
        </p>
        {googleMapsUrl && googleMapsUrl.trim() && (
          <a
            href={googleMapsUrl.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 font-mono text-xs text-cyan hover:underline"
          >
            View location on Google Maps
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        )}
      </div>
      <div className="p-4">
        {error && (
          <p className="text-xs text-red mb-3" role="alert">
            {error}
          </p>
        )}
        {loading && !data && (
          <p className="font-mono text-xs text-text-muted mb-3">Loading weather data…</p>
        )}
        {data && data.time.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-4 mb-3">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="inline-block w-2 h-0.5 rounded bg-red-500" />
                Max temp
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="inline-block w-2 h-0.5 rounded bg-sky-400" />
                Min temp
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="inline-block w-2 h-0.5 rounded bg-violet-500" />
                Precip (mm)
              </span>
            </div>
            <div className="relative h-[280px] w-full rounded-lg bg-surface">
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full rounded-lg"
                style={{ width: "100%", height: "280px" }}
              />
            </div>
            <p className="mt-3 font-mono text-[10px] text-text-muted">
              Location from link when creating the market • Real data until yesterday • Forecast from today
              {resolutionLabel && ` • Resolution: ${resolutionLabel}`}
              {" • Open-Meteo"}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
