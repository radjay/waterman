"use client";

import { useEffect, useRef, useState } from "react";
import {
  kickInMarkerIndex,
  kickInMarkerSvgX,
} from "../../lib/forecast-experiment/chartKickInMarker.js";
import { formatLisbonTime } from "../../lib/forecast-experiment/userFacingCopy.js";

const CHART_HEIGHT = 180;
const PADDING_LEFT = 32;
const PADDING_RIGHT = 8;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 28;

function chartY(value, yMax, innerHeight) {
  if (!Number.isFinite(value) || yMax <= 0) return null;
  return PADDING_TOP + (1 - value / yMax) * innerHeight;
}

function chartX(index, count, innerWidth) {
  if (count <= 1) return PADDING_LEFT + innerWidth / 2;
  return PADDING_LEFT + (index / (count - 1)) * innerWidth;
}

function buildLinePath(values, yMax, innerHeight, innerWidth) {
  const segments = [];
  let current = [];
  for (let i = 0; i < values.length; i += 1) {
    const y = chartY(values[i], yMax, innerHeight);
    if (y == null) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
      continue;
    }
    current.push(`${chartX(i, values.length, innerWidth)},${y}`);
  }
  if (current.length > 0) segments.push(current);
  return segments
    .filter((coords) => coords.length >= 2)
    .map((coords) => `M ${coords.join(" L ")}`)
    .join(" ");
}

function caboPlotPoints(caboObserved, yMax, innerHeight, innerWidth, hourCount) {
  return caboObserved
    .map((row, index) => {
      if (!Number.isFinite(row.windSpeedKnots)) return null;
      const y = chartY(row.windSpeedKnots, yMax, innerHeight);
      if (y == null) return null;
      return { x: chartX(index, hourCount, innerWidth), y, hourLocal: row.hourLocal };
    })
    .filter(Boolean);
}

function formatHour(hourLocal) {
  return `${String(hourLocal).padStart(2, "0")}:00`;
}

function effectiveWindKnots(windSpeedKnots, windGustKnots) {
  const speed = Number.isFinite(windSpeedKnots) ? windSpeedKnots : 0;
  const gust = Number.isFinite(windGustKnots) ? windGustKnots : 0;
  return Math.max(speed, gust);
}

function marinaBarColors(windSpeedKnots, windGustKnots) {
  const effective = effectiveWindKnots(windSpeedKnots, windGustKnots);
  if (effective > 25) return { gust: "#fee2e2", speed: "#f87171" };
  if (effective > 20) return { gust: "#ffedd5", speed: "#fb923c" };
  if (effective > 15) return { gust: "#fef9c3", speed: "#facc15" };
  return { gust: "#bae6fd", speed: "#0ea5e9" };
}

export function BayDayWindChart({ chart, showCabo = true, kickInAtMs = null }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(360);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setWidth(containerRef.current.offsetWidth || 360);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!chart?.marinaForecast?.length) return null;

  const hours = chart.marinaForecast;
  const innerWidth = width - PADDING_LEFT - PADDING_RIGHT;
  const innerHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const barWidth = Math.max(4, (innerWidth / hours.length) * 0.55);

  const allValues = [
    ...hours.map((row) => row.windGustKnots),
    ...hours.map((row) => row.windSpeedKnots),
    ...(showCabo ? chart.caboObserved?.map((row) => row.windSpeedKnots) ?? [] : []),
  ].filter(Number.isFinite);

  if (allValues.length === 0) {
    return <p className="text-xs text-ink/40">No chart data for this day.</p>;
  }

  const yMax = Math.max(15, Math.ceil(Math.max(...allValues) / 5) * 5);
  const caboLine = showCabo
    ? buildLinePath(
        chart.caboObserved.map((row) => row.windSpeedKnots),
        yMax,
        innerHeight,
        innerWidth
      )
    : "";
  const caboPoints = showCabo
    ? caboPlotPoints(chart.caboObserved, yMax, innerHeight, innerWidth, hours.length)
    : [];

  const yTicks = [0, Math.round(yMax / 2), yMax];
  const kickInIndex = kickInMarkerIndex(kickInAtMs, hours);
  const kickInX = kickInMarkerSvgX(kickInIndex, hours.length, innerWidth, PADDING_LEFT);
  const kickInLabel = kickInAtMs ? formatLisbonTime(kickInAtMs) : null;

  return (
    <div ref={containerRef} className="mt-4">
      <svg
        viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
        className="w-full text-ink/30"
        role="img"
        aria-label="Hourly marina forecast and Cabo Raso wind"
      >
        {yTicks.map((tick) => {
          const y = chartY(tick, yMax, innerHeight);
          return (
            <g key={tick}>
              <line
                x1={PADDING_LEFT}
                y1={y}
                x2={width - PADDING_RIGHT}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.12}
              />
              <text x={4} y={y + 3} className="fill-ink/45 text-[9px]">
                {tick}
              </text>
            </g>
          );
        })}

        {hours.map((row, index) => {
          const x = chartX(index, hours.length, innerWidth) - barWidth / 2;
          const gust = row.windGustKnots;
          const speed = row.windSpeedKnots;
          if (!Number.isFinite(gust) && !Number.isFinite(speed)) return null;

          const resolvedSpeed = Number.isFinite(speed) ? speed : gust;
          const resolvedGust = Number.isFinite(gust) ? Math.max(gust, resolvedSpeed) : resolvedSpeed;
          const gustY = chartY(resolvedGust, yMax, innerHeight);
          const speedY = chartY(resolvedSpeed, yMax, innerHeight);
          const baseY = chartY(0, yMax, innerHeight);
          if (gustY == null || speedY == null || baseY == null) return null;

          const colors = marinaBarColors(resolvedSpeed, resolvedGust);
          const gustBandHeight = Math.max(0, speedY - gustY);

          return (
            <g key={row.validTime}>
              {gustBandHeight > 0.5 && (
                <rect
                  x={x}
                  y={gustY}
                  width={barWidth}
                  height={gustBandHeight}
                  fill={colors.gust}
                  opacity={0.95}
                />
              )}
              <rect
                x={x}
                y={speedY}
                width={barWidth}
                height={Math.max(0, baseY - speedY)}
                fill={colors.speed}
                opacity={0.9}
              />
            </g>
          );
        })}

        {kickInX != null && (
          <g aria-hidden="true">
            <line
              x1={kickInX}
              y1={PADDING_TOP}
              x2={kickInX}
              y2={CHART_HEIGHT - PADDING_BOTTOM}
              stroke="#059669"
              strokeWidth={2}
              strokeDasharray="4 3"
              strokeOpacity={0.7}
            />
            {kickInLabel && (
              <text
                x={kickInX + 4}
                y={PADDING_TOP + 10}
                className="fill-emerald-700 text-[9px] font-medium"
              >
                {kickInLabel}
              </text>
            )}
          </g>
        )}

        {caboLine && (
          <path d={caboLine} fill="none" stroke="#d97706" strokeWidth={2} strokeLinejoin="round" />
        )}
        {caboPoints.map((point) => (
          <circle
            key={point.hourLocal}
            cx={point.x}
            cy={point.y}
            r={3.5}
            fill="#d97706"
            stroke="#fff"
            strokeWidth={1}
          />
        ))}

        {hours.map((row, index) =>
          index % 3 === 0 || index === hours.length - 1 ? (
            <text
              key={`label-${row.validTime}`}
              x={chartX(index, hours.length, innerWidth)}
              y={CHART_HEIGHT - 6}
              textAnchor="middle"
              className="fill-ink/45 text-[9px]"
            >
              {formatHour(row.hourLocal)}
            </text>
          ) : null
        )}
      </svg>

      <ul className="mt-2 flex flex-wrap gap-x-4 text-[10px] text-ink/50">
        <li>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-sky-500 align-middle" />
          Marina avg wind
        </li>
        <li>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-sky-200 align-middle" />
          Gust band above avg
        </li>
        <li className="text-ink/40">Bar color intensifies above 15 / 20 / 25 kt</li>
        {kickInX != null && (
          <li>
            <span className="mr-1 inline-block h-3 w-0.5 border-l-2 border-dashed border-emerald-600 align-middle" />
            Kick-in{kickInLabel ? ` ~${kickInLabel}` : ""}
          </li>
        )}
        {showCabo && (
          <li>
            <span className="mr-1 inline-block h-0.5 w-3 bg-amber-600 align-middle" />
            Cabo Raso observed
          </li>
        )}
      </ul>
    </div>
  );
}
