"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { dtf } from "../../lib/datetime";
import {
  clockTicks,
  HERO_CHART_HEIGHT,
  HERO_CHART_MARGIN,
  HERO_AXIS_TICK,
} from "./StationWindChart";

const TZ = "Europe/Lisbon";

/**
 * Wave y-ticks need room for "0.9" / "1.0" — the shared station margin clips
 * the leading digit. Slightly wider left gutter, same outer height.
 */
const WAVE_CHART_MARGIN = {
  ...HERO_CHART_MARGIN,
  left: 6,
};

const timeLabel = (ms) =>
  Number.isFinite(ms)
    ? dtf("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(
        new Date(ms)
      )
    : "";

function WaveTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-ui border border-card bg-page px-2.5 py-1.5 shadow-nav">
      <div className="font-data text-[9px] text-dim tabular-nums mb-0.5">
        {timeLabel(point.time)}
      </div>
      <div className="font-data text-[11px] text-ink tabular-nums whitespace-nowrap">
        <span className="text-accent font-bold">
          {Number(point.height).toFixed(1)}
        </span>
        <span className="text-faded-ink"> m</span>
        {Number.isFinite(point.period) && (
          <span className="text-faded-ink"> @ {Math.round(point.period)}s</span>
        )}
      </div>
    </div>
  );
}

/**
 * Forecast wave-height over time, with high/low tide marks on the x-axis.
 *
 * Y domain hugs the data (not 0→max). Swell often sits in a 0.2 m band all
 * day — pinning the floor at zero made a real series look like a flat cap.
 *
 * @param {Array<{ time: number, height: number, period?: number|null }>} history
 * @param {Array<{ time: number, type: string, height?: number }>} tides
 * @param {boolean} compact
 */
export function WaveTideChart({ history = [], tides = [], compact: _compact = false }) {
  const series = useMemo(
    () =>
      history
        .filter((p) => Number.isFinite(p.time) && Number.isFinite(p.height))
        .map((p) => ({
          time: p.time,
          height: p.height,
          period: Number.isFinite(p.period) ? p.period : null,
        }))
        .sort((a, b) => a.time - b.time),
    [history]
  );

  const domain = useMemo(() => {
    if (series.length === 0) return null;
    let minMs = series[0].time;
    let maxMs = series[series.length - 1].time;
    for (const t of tides) {
      if (!Number.isFinite(t.time)) continue;
      if (t.time < minMs) minMs = t.time;
      if (t.time > maxMs) maxMs = t.time;
    }
    if (maxMs <= minMs) maxMs = minMs + 1;
    return [minMs, maxMs];
  }, [series, tides]);

  const yDomain = useMemo(() => {
    if (series.length === 0) return [0, 1];
    const heights = series.map((p) => p.height);
    const min = Math.min(...heights);
    const max = Math.max(...heights);
    // At least 0.3 m of vertical range so a calm day still reads as a line.
    const span = Math.max(max - min, 0.3);
    const pad = span * 0.2;
    return [Math.max(0, min - pad), max + pad];
  }, [series]);

  const ticks = useMemo(() => {
    if (!domain) return [];
    return clockTicks(domain[0], domain[1]);
  }, [domain]);

  const tideMarks = useMemo(() => {
    if (!domain) return [];
    return (tides || [])
      .filter(
        (t) =>
          Number.isFinite(t.time) &&
          t.time >= domain[0] &&
          t.time <= domain[1] &&
          (t.type === "high" || t.type === "low")
      )
      .sort((a, b) => a.time - b.time);
  }, [tides, domain]);

  if (series.length < 2 || !domain) return null;

  return (
    <div
      className="w-full"
      style={{ height: HERO_CHART_HEIGHT }}
      role="img"
      aria-label="Forecast wave height over time with high and low tide marks"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={WAVE_CHART_MARGIN}>
          <CartesianGrid
            vertical={false}
            stroke="var(--wm-border)"
            strokeDasharray="2 3"
          />
          <XAxis
            dataKey="time"
            type="number"
            domain={domain}
            ticks={ticks}
            tickFormatter={timeLabel}
            tick={HERO_AXIS_TICK}
            axisLine={{ stroke: "var(--wm-border)" }}
            tickLine={false}
            dy={4}
            allowDataOverflow
          />
          <YAxis
            domain={yDomain}
            width={30}
            tick={HERO_AXIS_TICK}
            tickFormatter={(v) => Number(v).toFixed(1)}
            axisLine={false}
            tickLine={false}
            // Enough inset that "0.9" is not clipped to ".9".
            dx={0}
          />
          <Tooltip
            content={<WaveTooltip />}
            cursor={{ stroke: "var(--wm-dim)", strokeDasharray: "2 2" }}
            isAnimationActive={false}
          />
          {tideMarks.map((t) => {
            const isHigh = t.type === "high";
            return (
              <ReferenceLine
                key={`${t.time}-${t.type}`}
                x={t.time}
                stroke="var(--wm-dim)"
                strokeWidth={1}
                strokeDasharray="3 3"
                label={{
                  value: isHigh ? "HIGH" : "LOW",
                  // HIGH sits at the top of the plot, LOW at the bottom.
                  position: isHigh ? "insideTopRight" : "insideBottomRight",
                  fill: "var(--wm-dim)",
                  fontSize: 9,
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                  offset: 4,
                }}
              />
            );
          })}
          <Line
            type="monotone"
            dataKey="height"
            name="height"
            stroke="rgb(var(--wm-accent))"
            strokeWidth={2}
            // Slot trail is sparse (3h). Dots make each forecast step readable.
            dot={{
              r: 2.5,
              strokeWidth: 0,
              fill: "rgb(var(--wm-accent))",
            }}
            activeDot={{ r: 4, strokeWidth: 0, fill: "rgb(var(--wm-accent))" }}
            isAnimationActive={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
