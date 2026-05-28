"use client";

import { useEffect, useRef, useState } from "react";
import {
  chartTimeSvgX,
  kickInMarkerIndex,
  kickInMarkerSvgX,
  resolveKickInChartMarkerMs,
} from "../../lib/forecast-experiment/chartKickInMarker.js";
import { formatLisbonTime } from "../../lib/forecast-experiment/userFacingCopy.js";

const CHART_HEIGHT = 180;
const PADDING_LEFT = 36;
const PADDING_RIGHT = 8;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 28;
const Y_TICK_STEP_KT = 5;
const Y_AXIS_MIN_KT = 15;

function buildYAxisScale(maxValue) {
  const yMax = Math.max(Y_AXIS_MIN_KT, Math.ceil(maxValue / Y_TICK_STEP_KT) * Y_TICK_STEP_KT);
  const yTicks = [];
  for (let tick = 0; tick <= yMax; tick += Y_TICK_STEP_KT) {
    yTicks.push(tick);
  }
  return { yMax, yTicks };
}

function chartY(value, yMax, innerHeight) {
  if (!Number.isFinite(value) || yMax <= 0) return null;
  return PADDING_TOP + (1 - value / yMax) * innerHeight;
}

function chartX(index, count, innerWidth) {
  if (count <= 1) return PADDING_LEFT + innerWidth / 2;
  return PADDING_LEFT + (index / (count - 1)) * innerWidth;
}

function resolveCaboHourlyWind(row) {
  const speed = row?.windSpeedKnots;
  const gust = row?.windGustKnots;
  if (!Number.isFinite(speed) && !Number.isFinite(gust)) return null;
  const resolvedSpeed = Number.isFinite(speed) ? speed : gust;
  const resolvedGust = Number.isFinite(gust) ? Math.max(gust, resolvedSpeed) : resolvedSpeed;
  return { speed: resolvedSpeed, gust: resolvedGust };
}

function caboRowsWithData(rows) {
  return rows.filter((row) => resolveCaboHourlyWind(row) != null);
}

function buildTimeSeriesLinePath(rows, valueSelector, hours, yMax, innerHeight, innerWidth) {
  const coords = [];
  for (const row of caboRowsWithData(rows)) {
    const value = valueSelector(row);
    const y = chartY(value, yMax, innerHeight);
    const x = chartTimeSvgX(row.validTime, hours, innerWidth, PADDING_LEFT);
    if (y == null || x == null) continue;
    coords.push(`${x},${y}`);
  }
  if (coords.length < 2) return "";
  return `M ${coords.join(" L ")}`;
}

/** Filled band between Cabo avg (lower) and gust (upper) lines. */
function buildCaboGustBandPath(caboObserved, hours, yMax, innerHeight, innerWidth) {
  const topPoints = [];
  const bottomPoints = [];
  for (const row of caboRowsWithData(caboObserved)) {
    const resolved = resolveCaboHourlyWind(row);
    const gustY = chartY(resolved.gust, yMax, innerHeight);
    const speedY = chartY(resolved.speed, yMax, innerHeight);
    const x = chartTimeSvgX(row.validTime, hours, innerWidth, PADDING_LEFT);
    if (gustY == null || speedY == null || x == null || speedY - gustY < 0.5) continue;
    topPoints.push(`${x},${gustY}`);
    bottomPoints.push(`${x},${speedY}`);
  }
  if (topPoints.length < 2) return "";
  return `M ${topPoints.join(" L ")} L ${bottomPoints.slice().reverse().join(" L ")} Z`;
}

function caboPlotPoints(caboObserved, hours, yMax, innerHeight, innerWidth) {
  return caboRowsWithData(caboObserved)
    .map((row) => {
      const resolved = resolveCaboHourlyWind(row);
      if (!resolved) return null;
      const y = chartY(resolved.speed, yMax, innerHeight);
      const x = chartTimeSvgX(row.validTime, hours, innerWidth, PADDING_LEFT);
      if (y == null || x == null) return null;
      return { x, y, validTime: row.validTime };
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

const KICK_IN_MARKER_STYLES = {
  earliest: {
    stroke: "#6ee7b7",
    dash: "5 4",
    opacity: 0.75,
    labelClass: "fill-emerald-600",
    prefix: "First",
  },
  latest: {
    stroke: "#059669",
    dash: undefined,
    opacity: 0.9,
    labelClass: "fill-emerald-800",
    prefix: "Latest",
  },
  default: {
    stroke: "#059669",
    dash: "4 3",
    opacity: 0.7,
    labelClass: "fill-emerald-700",
    prefix: "Kick-in",
  },
};

function buildKickInMarkers({ kickInAtMs, earliestKickInAtMs, latestKickInAtMs, hours }) {
  const markers = [];
  const showBoth =
    earliestKickInAtMs != null &&
    latestKickInAtMs != null &&
    earliestKickInAtMs !== latestKickInAtMs;

  if (showBoth) {
    markers.push({ ms: earliestKickInAtMs, variant: "earliest" });
    markers.push({ ms: latestKickInAtMs, variant: "latest" });
  } else if (kickInAtMs != null) {
    markers.push({ ms: kickInAtMs, variant: "default" });
  } else if (earliestKickInAtMs != null) {
    markers.push({ ms: earliestKickInAtMs, variant: "default" });
  }

  return markers
    .map((marker, index) => {
      const markerMs = resolveKickInChartMarkerMs(marker.ms, hours);
      if (markerMs == null) return null;
      const style = KICK_IN_MARKER_STYLES[marker.variant];
      return {
        key: `${marker.variant}-${markerMs}`,
        variant: marker.variant,
        markerMs,
        label: `${style.prefix} ${formatLisbonTime(markerMs)}`,
        labelY: PADDING_TOP + 10 + index * 12,
        ...style,
      };
    })
    .filter(Boolean);
}

export function BayDayWindChart({
  chart,
  showCabo = true,
  kickInAtMs = null,
  earliestKickInAtMs = null,
  latestKickInAtMs = null,
}) {
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
    ...(showCabo
      ? (chart.caboObserved?.flatMap((row) => [row.windSpeedKnots, row.windGustKnots]) ?? [])
      : []),
  ].filter(Number.isFinite);

  if (allValues.length === 0) {
    return <p className="text-xs text-ink/40">No chart data for this day.</p>;
  }

  const { yMax, yTicks } = buildYAxisScale(Math.max(...allValues));
  const caboSpeedLine = showCabo
    ? buildTimeSeriesLinePath(
        chart.caboObserved,
        (row) => resolveCaboHourlyWind(row)?.speed,
        hours,
        yMax,
        innerHeight,
        innerWidth
      )
    : "";
  const caboGustLine = showCabo
    ? buildTimeSeriesLinePath(
        chart.caboObserved,
        (row) => resolveCaboHourlyWind(row)?.gust,
        hours,
        yMax,
        innerHeight,
        innerWidth
      )
    : "";
  const caboGustBand = showCabo
    ? buildCaboGustBandPath(chart.caboObserved, hours, yMax, innerHeight, innerWidth)
    : "";
  const caboPoints = showCabo
    ? caboPlotPoints(chart.caboObserved, hours, yMax, innerHeight, innerWidth)
    : [];

  const kickInMarkers = buildKickInMarkers({
    kickInAtMs,
    earliestKickInAtMs,
    latestKickInAtMs,
    hours,
  }).map((marker) => {
    const index = kickInMarkerIndex(marker.markerMs, hours);
    return {
      ...marker,
      x: kickInMarkerSvgX(index, hours.length, innerWidth, PADDING_LEFT),
    };
  });

  return (
    <div ref={containerRef} className="mt-4 min-w-0 w-full max-w-full">
      <svg
        viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
        className="w-full max-w-full text-ink/30"
        overflow="hidden"
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

        {caboGustBand && (
          <path d={caboGustBand} fill="#bbf7d0" fillOpacity={0.55} stroke="none" />
        )}

        {kickInMarkers.map((marker) => (
          <g key={marker.key} aria-hidden="true">
            <line
              x1={marker.x}
              y1={PADDING_TOP}
              x2={marker.x}
              y2={CHART_HEIGHT - PADDING_BOTTOM}
              stroke={marker.stroke}
              strokeWidth={marker.variant === "latest" ? 2.5 : 2}
              strokeDasharray={marker.dash}
              strokeOpacity={marker.opacity}
            />
            <text x={marker.x + 4} y={marker.labelY} className={`${marker.labelClass} text-[9px] font-medium`}>
              {marker.label}
            </text>
          </g>
        ))}

        {caboGustLine && (
          <path
            d={caboGustLine}
            fill="none"
            stroke="#4ade80"
            strokeWidth={1.5}
            strokeDasharray="3 2"
            strokeLinejoin="round"
            opacity={0.9}
          />
        )}
        {caboSpeedLine && (
          <path d={caboSpeedLine} fill="none" stroke="#15803d" strokeWidth={2} strokeLinejoin="round" />
        )}
        {caboPoints.map((point) => (
          <circle
            key={point.validTime}
            cx={point.x}
            cy={point.y}
            r={3.5}
            fill="#16a34a"
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

      <ul className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-ink/50">
        <li className="flex items-center whitespace-nowrap">
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-sky-500" />
          Marina avg wind
        </li>
        <li className="flex items-center whitespace-nowrap">
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-sky-200" />
          Gust band above avg
        </li>
        {kickInMarkers.map((marker) => (
          <li key={marker.key} className="flex items-center whitespace-nowrap">
            <span
              className={`mr-1 inline-block h-3 w-0.5 border-l-2 ${
                marker.variant === "latest" ? "border-emerald-700" : "border-dashed border-emerald-400"
              }`}
            />
            {marker.label}
          </li>
        ))}
        {showCabo && (
          <>
            <li className="flex items-center whitespace-nowrap">
              <span className="mr-1 inline-block h-0.5 w-3 bg-green-700" />
              Cabo avg
            </li>
            <li className="flex items-center whitespace-nowrap">
              <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-green-200" />
              Cabo gust
            </li>
          </>
        )}
      </ul>
    </div>
  );
}
