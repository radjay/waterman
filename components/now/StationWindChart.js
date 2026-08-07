"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
} from "recharts";
import { averageWindow } from "../../lib/station";
import { dtf } from "../../lib/datetime";

/** Forecast slots are 3-hour blocks — same as lib/station FORECAST_SLOT_MS. */
const FORECAST_SLOT_MS = 3 * 60 * 60 * 1000;

/**
 * One shaded column pair per 3h forecast slot (base + gust heights).
 * Built from step-attached forecast values on history samples.
 */
function forecastColumns(series, slotMs = FORECAST_SLOT_MS) {
  const byStart = new Map();
  for (const p of series) {
    if (!Number.isFinite(p?.forecast) || !Number.isFinite(p?.time)) continue;
    const start = Math.floor(p.time / slotMs) * slotMs;
    if (!byStart.has(start)) {
      byStart.set(start, {
        speed: p.forecast,
        gust: Number.isFinite(p.forecastGust) ? p.forecastGust : null,
      });
    }
  }
  return [...byStart.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([start, v]) => ({
      x1: start,
      x2: start + slotMs,
      speed: v.speed,
      gust: v.gust,
    }));
}

const TZ = "Europe/Lisbon";
const HALF_MS = 30 * 60 * 1000;
/** More than this and half-hour labels start to collide on a card-width chart. */
const MAX_HALF_TICKS = 8;

const timeLabel = (ms) =>
  Number.isFinite(ms)
    ? dtf("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(ms))
    : "";

function lisbonMinute(ms) {
  const parts = dtf("en-GB", {
    timeZone: TZ,
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  return Number(parts.find((p) => p.type === "minute")?.value ?? NaN);
}

/**
 * Clock ticks on the hour, plus half-hours when they fit. Aligned to Lisbon
 * wall time so "12:00" is noon local, not a UTC boundary.
 */
export function clockTicks(minMs, maxMs) {
  if (!Number.isFinite(minMs) || !Number.isFinite(maxMs) || maxMs <= minMs) {
    return [];
  }

  let t = minMs;
  const scanEnd = minMs + HALF_MS + 60_000;
  while (t <= scanEnd && t <= maxMs) {
    const m = lisbonMinute(t);
    if (m === 0 || m === 30) break;
    t += 60_000;
  }
  if (t > maxMs) return [];

  const hours = [];
  const halves = [];
  for (; t <= maxMs; t += HALF_MS) {
    const m = lisbonMinute(t);
    if (m === 0) {
      hours.push(t);
      halves.push(t);
    } else if (m === 30) {
      halves.push(t);
    } else {
      let seek = t;
      const seekEnd = t + HALF_MS;
      while (seek <= seekEnd) {
        const sm = lisbonMinute(seek);
        if (sm === 0 || sm === 30) {
          t = seek - HALF_MS;
          break;
        }
        seek += 60_000;
      }
    }
  }

  return halves.length <= MAX_HALF_TICKS ? halves : hours;
}

/**
 * Shared hero chart box — station and waves must match so plot tops/bottoms
 * line up across the half-width pair.
 *
 * Left margin is tight so the y-axis numbers sit under the card reading
 * ("13 kn" / "1.0 m"), not inset past it.
 */
export const HERO_CHART_HEIGHT = 184;
export const HERO_CHART_MARGIN = { top: 12, right: 4, bottom: 0, left: 2 };

/** Same mono dim ticks as the x-axis so both hero charts match. */
export const HERO_AXIS_TICK = {
  fontSize: 9,
  fill: "var(--wm-dim)",
  fontFamily: "var(--font-mono), ui-monospace, monospace",
};

function StationTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-ui border border-card bg-page px-2.5 py-1.5 shadow-nav">
      <div className="font-data text-[9px] text-dim tabular-nums mb-0.5">
        {timeLabel(point.time)}
      </div>
      <div className="font-data text-[11px] text-ink tabular-nums whitespace-nowrap">
        <span className="text-accent font-bold">{Math.round(point.speed)}</span>
        <span className="text-faded-ink"> kn</span>
        {Number.isFinite(point.gust) && (
          <span className="text-faded-ink"> ({Math.round(point.gust)}*)</span>
        )}
        {Number.isFinite(point.forecast) && (
          <span className="text-dim"> · fcst {Math.round(point.forecast)}</span>
        )}
        {Number.isFinite(point.forecastGust) && (
          <span className="text-dim"> ({Math.round(point.forecastGust)}*)</span>
        )}
      </div>
    </div>
  );
}

/**
 * Station chart:
 *   - forecast base + gust as 3h shaded columns (behind)
 *   - live base + gust as smooth lines (front)
 */
export function StationWindChart({ history = [], compact: _compact = false }) {
  const series = useMemo(() => averageWindow(history, 3), [history]);
  const hasGust = series.some((p) => Number.isFinite(p.gust));
  const forecastCols = useMemo(() => forecastColumns(series), [series]);

  const ticks = useMemo(() => {
    if (series.length < 2) return [];
    const minMs = series[0].time;
    const maxMs = series[series.length - 1].time;
    return clockTicks(minMs, maxMs);
  }, [series]);

  if (series.length < 2) return null;

  return (
    <div
      className="w-full"
      style={{ height: HERO_CHART_HEIGHT }}
      role="img"
      aria-label="Station wind: forecast as 3-hour shaded columns for base and gust, live readings as smooth lines"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={series} margin={HERO_CHART_MARGIN}>
          <CartesianGrid
            vertical={false}
            stroke="var(--wm-border)"
            strokeDasharray="2 3"
          />
          <XAxis
            dataKey="time"
            type="number"
            domain={["dataMin", "dataMax"]}
            ticks={ticks}
            tickFormatter={timeLabel}
            tick={HERO_AXIS_TICK}
            axisLine={{ stroke: "var(--wm-border)" }}
            tickLine={false}
            dy={4}
          />
          <YAxis
            domain={[0, (max) => Math.max(max * 1.1, 1)]}
            width={22}
            tick={HERO_AXIS_TICK}
            tickFormatter={(v) => `${Math.round(v)}`}
            axisLine={false}
            tickLine={false}
            // Pull ticks left so they sit under the card headline numbers.
            dx={-2}
          />
          <Tooltip
            content={<StationTooltip />}
            cursor={{ stroke: "var(--wm-dim)", strokeDasharray: "2 2" }}
            isAnimationActive={false}
          />

          {/* Forecast columns: gust (taller, lighter) then base (stronger). */}
          {forecastCols.map((col) =>
            Number.isFinite(col.gust) ? (
              <ReferenceArea
                key={`fcst-gust-${col.x1}`}
                x1={col.x1}
                x2={col.x2}
                y1={0}
                y2={col.gust}
                fill="rgb(var(--wm-ink) / 0.08)"
                strokeOpacity={0}
                ifOverflow="hidden"
              />
            ) : null
          )}
          {forecastCols.map((col) => (
            <ReferenceArea
              key={`fcst-base-${col.x1}`}
              x1={col.x1}
              x2={col.x2}
              y1={0}
              y2={col.speed}
              fill="rgb(var(--wm-ink) / 0.16)"
              strokeOpacity={0}
              ifOverflow="hidden"
            />
          ))}

          {/* Live station: smooth lines on top of the forecast columns. */}
          {hasGust && (
            <Line
              type="monotone"
              dataKey="gust"
              name="gust"
              stroke="rgb(var(--wm-accent) / 0.45)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: "rgb(var(--wm-accent) / 0.7)" }}
              isAnimationActive={false}
              connectNulls
            />
          )}
          <Line
            type="monotone"
            dataKey="speed"
            name="base"
            stroke="rgb(var(--wm-accent))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0, fill: "rgb(var(--wm-accent))" }}
            isAnimationActive={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
