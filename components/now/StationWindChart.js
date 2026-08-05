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
} from "recharts";
import { averageWindow } from "../../lib/station";
import { dtf } from "../../lib/datetime";

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

  // Walk forward at most 30 minutes to the next :00 or :30 in Lisbon.
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
  // Step ~30 min in UTC; re-check Lisbon minute so DST edges still land cleanly.
  for (; t <= maxMs; t += HALF_MS) {
    const m = lisbonMinute(t);
    if (m === 0) {
      hours.push(t);
      halves.push(t);
    } else if (m === 30) {
      halves.push(t);
    } else {
      // Drifted off the half-hour grid (DST); re-seek.
      let seek = t;
      const seekEnd = t + HALF_MS;
      while (seek <= seekEnd) {
        const sm = lisbonMinute(seek);
        if (sm === 0 || sm === 30) {
          t = seek - HALF_MS; // loop will add HALF_MS
          break;
        }
        seek += 60_000;
      }
    }
  }

  return halves.length <= MAX_HALF_TICKS ? halves : hours;
}

// Room for the x-axis time labels under the lines.
const H = 92;

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
      </div>
    </div>
  );
}

/**
 * Dual-line station sparkline via Recharts: solid base wind, dotted gusts.
 * Points are a 3-reading rolling average of the bucketed history.
 * X-axis ticks land on Lisbon hours (and half-hours when roomy).
 */
export function StationWindChart({ history = [] }) {
  const series = useMemo(() => averageWindow(history, 3), [history]);
  const hasGust = series.some((p) => Number.isFinite(p.gust));
  const hasForecast = series.some((p) => Number.isFinite(p.forecast));

  const ticks = useMemo(() => {
    if (series.length < 2) return [];
    const minMs = series[0].time;
    const maxMs = series[series.length - 1].time;
    return clockTicks(minMs, maxMs);
  }, [series]);

  if (series.length < 2) return null;

  return (
    <div
      className="w-full mt-[11px]"
      style={{ height: H }}
      role="img"
      aria-label="Station wind over the last 6 hours with forecast: base solid, gusts dotted, forecast dashed"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
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
            tick={{
              fontSize: 9,
              fill: "var(--wm-dim)",
              fontFamily: "var(--font-mono), ui-monospace, monospace",
            }}
            axisLine={{ stroke: "var(--wm-border)" }}
            tickLine={false}
            dy={4}
          />
          <YAxis
            domain={[0, (max) => Math.max(max * 1.1, 1)]}
            hide
            width={0}
          />
          <Tooltip
            content={<StationTooltip />}
            cursor={{ stroke: "var(--wm-dim)", strokeDasharray: "2 2" }}
            isAnimationActive={false}
          />
          {/* Forecast under the live lines so station remains the hero. */}
          {hasForecast && (
            <Line
              type="stepAfter"
              dataKey="forecast"
              name="forecast"
              stroke="var(--wm-dim)"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: "var(--wm-dim)" }}
              isAnimationActive={false}
              connectNulls
            />
          )}
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
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
