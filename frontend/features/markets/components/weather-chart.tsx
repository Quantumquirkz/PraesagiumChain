"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Cloud, Thermometer, Droplets } from "lucide-react";
import { getWeatherCurrent } from "@/lib/api";
import { cn } from "@/lib/utils";

const MAX_POINTS = 60;
const POLL_MS = 500;

interface WeatherPoint {
  t: number;
  temp: number;
  precipitation: number;
  humidity: number;
}

export interface WeatherChartProps {
  lat: number;
  lon: number;
  className?: string;
}

/**
 * Real-time weather data chart for the given location.
 * Updates every 0.5 s via GET /api/weather/current.
 */
export function WeatherChart({ lat, lon, className }: WeatherChartProps) {
  const [points, setPoints] = useState<WeatherPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    let cancelled = false;

    const fetchPoint = async () => {
      try {
        const data = await getWeatherCurrent(lat, lon);
        if (cancelled) return;
        setError(null);
        setPoints((prev) => {
          const next = [
            ...prev.slice(-(MAX_POINTS - 1)),
            {
              t: Date.now(),
              temp: data.temp,
              precipitation: data.precipitation,
              humidity: data.humidity,
            },
          ];
          return next;
        });
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Error loading weather";
          setError(
            /404|not found/i.test(msg)
              ? "Could not reach weather server. Start the backend (npm run backend) to see the real-time chart here; after creating the market the chart will appear on the market page."
              : msg
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPoint();
    const id = setInterval(fetchPoint, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [lat, lon]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio ?? 1;
    const W = canvas.width;
    const H = canvas.height;
    const w = W / dpr;
    const h = H / dpr;
    if (w <= 0 || h <= 0) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const pts = points;
    const tMin = pts[0].t;
    const tMax = pts[pts.length - 1].t;
    const tRange = tMax - tMin || 1;
    const temps = pts.map((p) => p.temp);
    const tempMin = Math.min(...temps);
    const tempMax = Math.max(...temps);
    const tempRange = tempMax - tempMin || 1;
    const padding = { top: 8, right: 8, bottom: 20, left: 36 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.strokeStyle = "rgba(0, 212, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const x = padding.left + ((pts[i].t - tMin) / tRange) * chartW;
      const y = padding.top + chartH - ((pts[i].temp - tempMin) / tempRange) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (pts.length > 0) {
      const last = pts[pts.length - 1];
      ctx.fillStyle = "var(--cyan)";
      ctx.font = "11px monospace";
      ctx.fillText(`${last.temp.toFixed(1)} °C`, padding.left + chartW + 4, padding.top + 10);
    }

    ctx.restore();
  }, [points]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio ?? 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    draw();
  }, [points.length, draw]);

  const last = points[points.length - 1];

  return (
    <section
      className={cn("rounded-xl border border-border bg-elevated/30 overflow-hidden", className)}
      aria-label="Real-time weather chart"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-blue-400" aria-hidden />
          <span className="font-mono text-xs font-semibold text-foreground">
            Real-time weather — {lat.toFixed(2)}, {lon.toFixed(2)}
          </span>
        </div>
        <span className="font-mono text-[10px] text-text-muted">Updates every 0.5 s</span>
      </div>
      <div className="p-3">
        {error && (
          <p className="text-xs text-red mb-2" role="alert">
            {error}
          </p>
        )}
        {loading && points.length === 0 && (
          <p className="font-mono text-xs text-text-muted mb-2">Loading data…</p>
        )}
        <div className="flex gap-4 mb-3">
          {last && (
            <>
              <span className="flex items-center gap-1.5 font-mono text-xs text-foreground">
                <Thermometer className="h-3.5 w-3.5 text-cyan" />
                {last.temp.toFixed(1)} °C
              </span>
              <span className="flex items-center gap-1.5 font-mono text-xs text-foreground">
                <Droplets className="h-3.5 w-3.5 text-blue-400" />
                {last.precipitation} mm
              </span>
              <span className="font-mono text-xs text-text-muted">
                Humidity {last.humidity.toFixed(0)}%
              </span>
            </>
          )}
        </div>
        <div className="relative h-[200px] w-full rounded-lg bg-surface">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full rounded-lg"
            style={{ width: "100%", height: "200px" }}
          />
        </div>
      </div>
    </section>
  );
}
