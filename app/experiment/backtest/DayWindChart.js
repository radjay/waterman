"use client";

import { useEffect, useRef, useState } from "react";

const CHART_HEIGHT = 200;
const PADDING_LEFT = 36;
const PADDING_RIGHT = 12;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 32;

/** Kick-in markers only render within this Lisbon hour window. */
const KICKIN_MARKER_START_HOUR = 8;
const KICKIN_MARKER_END_HOUR = 21;

/** Pixel offsets so stacked kick-in lines at 08:00 remain visible. */
const KICKIN_OFFSETS = {
  actual: -4,
  caboRaso: 0,
  predicted: 4,
};

function chartY(value, yMax, innerHeight) {
  if (!Number.isFinite(value) || !Number.isFinite(yMax) || yMax <= 0) return null;
  return PADDING_TOP + (1 - value / yMax) * innerHeight;
}

function chartX(index, hourCount, innerWidth) {
  if (hourCount <= 1) return PADDING_LEFT + innerWidth / 2;
  return PADDING_LEFT + (index / (hourCount - 1)) * innerWidth;
}

function buildLinePath(points, yMax, innerHeight, innerWidth) {
  const segments = [];
  let current = [];
  for (let i = 0; i < points.length; i += 1) {
    const value = points[i];
    const y = chartY(value, yMax, innerHeight);
    if (y == null) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
      continue;
    }
    current.push(`${chartX(i, points.length, innerWidth)},${y}`);
  }
  if (current.length > 0) segments.push(current);
  return segments.map((coords) => `M ${coords.join(" L ")}`).join(" ");
}

function markerX(ms, hours) {
  if (ms == null || hours.length === 0) return null;
  const first = hours[0].validTime;
  const last = hours[hours.length - 1].validTime;
  if (ms < first || ms > last + 3_600_000) return null;
  const span = last - first || 1;
  return ((ms - first) / span) * (hours.length - 1);
}

function kickInMarkerIndex(ms, hours) {
  if (ms == null || hours.length === 0) return null;
  const dayStart = hours[0].validTime - hours[0].hourLocal * 3_600_000;
  const windowStart = dayStart + KICKIN_MARKER_START_HOUR * 3_600_000;
  const windowEnd = dayStart + KICKIN_MARKER_END_HOUR * 3_600_000;
  if (ms > windowEnd + 3_600_000) return null;
  const clampedMs = Math.max(ms, windowStart);
  if (clampedMs > windowEnd) return null;
  return markerX(clampedMs, hours);
}

function markerLineX(index, hourCount, innerWidth, pixelOffset = 0) {
  if (index == null) return null;
  return chartX(index, hourCount, innerWidth) + pixelOffset;
}

function formatHourLabel(hourLocal) {
  return `${String(hourLocal).padStart(2, "0")}:00`;
}

function formatWindKnots(value) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value * 10) / 10} kn`;
}

function nearestHourIndex(svgX, hourCount, innerWidth) {
  if (hourCount <= 1) return 0;
  const relativeX = svgX - PADDING_LEFT;
  const fraction = relativeX / innerWidth;
  const index = Math.round(fraction * (hourCount - 1));
  return Math.max(0, Math.min(hourCount - 1, index));
}

export function DayWindChart({ chart }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [width, setWidth] = useState(560);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth || 560);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  if (!chart?.observed?.length) return null;

  const hours = chart.observed;
  const innerWidth = width - PADDING_LEFT - PADDING_RIGHT;
  const innerHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const allValues = [
    ...chart.observed.map((row) => row.effectiveWindKnots),
    ...chart.caboRaso?.map((row) => row.effectiveWindKnots) ?? [],
    ...chart.forecast.map((row) => row.effectiveWindKnots),
  ].filter(Number.isFinite);
  const dataMax = allValues.length > 0 ? Math.max(...allValues) : 20;
  const yMax = Math.max(15, Math.ceil(dataMax / 5) * 5);

  const obsEffectivePath = buildLinePath(
    chart.observed.map((row) => row.effectiveWindKnots),
    yMax,
    innerHeight,
    innerWidth
  );
  const caboEffectivePath = buildLinePath(
    (chart.caboRaso ?? []).map((row) => row.effectiveWindKnots),
    yMax,
    innerHeight,
    innerWidth
  );
  const fcEffectivePath = buildLinePath(
    chart.forecast.map((row) => row.effectiveWindKnots),
    yMax,
    innerHeight,
    innerWidth
  );

  const actualIndex = kickInMarkerIndex(chart.markers.actualKickInAt, hours);
  const caboKickInIndex = kickInMarkerIndex(chart.markers.caboRasoKickInAt, hours);
  const predictedIndex = kickInMarkerIndex(chart.markers.predictedKickInAt, hours);

  const yTicks = [0, Math.round(yMax / 2), yMax];

  const handleMouseMove = (event) => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    const svgRect = svg.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const scaleX = width / svgRect.width;
    const svgX = (event.clientX - svgRect.left) * scaleX;
    const index = nearestHourIndex(svgX, hours.length, innerWidth);

    setTooltip({
      index,
      left: event.clientX - containerRect.left,
      top: event.clientY - containerRect.top,
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  const tooltipRow = tooltip != null ? hours[tooltip.index] : null;
  const tooltipCabo = tooltip != null ? chart.caboRaso?.[tooltip.index] : null;
  const tooltipForecast = tooltip != null ? chart.forecast[tooltip.index] : null;

  return (
    <div ref={containerRef} className="relative mt-4">
      <p className="text-xs font-medium text-ink/60">
        Effective wind (speed + gust) / 2 — {chart.startHour}:00–{chart.endHour}:00 Lisbon
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
        className="mt-2 w-full text-ink/40"
        role="img"
        aria-label="Hourly forecast and observed effective wind"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <rect
          x={PADDING_LEFT}
          y={PADDING_TOP}
          width={innerWidth}
          height={innerHeight}
          fill="transparent"
          pointerEvents="all"
        />
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
                strokeOpacity={tick === 0 ? 0.2 : 0.1}
                strokeDasharray={tick === 0 ? undefined : "4 4"}
              />
              <text x={4} y={y + 4} className="fill-ink/50 text-[10px]">
                {tick}
              </text>
            </g>
          );
        })}

        {actualIndex != null && (
          <line
            x1={markerLineX(actualIndex, hours.length, innerWidth, KICKIN_OFFSETS.actual)}
            y1={PADDING_TOP}
            x2={markerLineX(actualIndex, hours.length, innerWidth, KICKIN_OFFSETS.actual)}
            y2={CHART_HEIGHT - PADDING_BOTTOM}
            stroke="#059669"
            strokeWidth={2}
            strokeOpacity={0.55}
          />
        )}
        {caboKickInIndex != null && (
          <line
            x1={markerLineX(caboKickInIndex, hours.length, innerWidth, KICKIN_OFFSETS.caboRaso)}
            y1={PADDING_TOP}
            x2={markerLineX(caboKickInIndex, hours.length, innerWidth, KICKIN_OFFSETS.caboRaso)}
            y2={CHART_HEIGHT - PADDING_BOTTOM}
            stroke="#d97706"
            strokeWidth={2}
            strokeDasharray="3 3"
            strokeOpacity={0.55}
          />
        )}
        {predictedIndex != null && (
          <line
            x1={markerLineX(predictedIndex, hours.length, innerWidth, KICKIN_OFFSETS.predicted)}
            y1={PADDING_TOP}
            x2={markerLineX(predictedIndex, hours.length, innerWidth, KICKIN_OFFSETS.predicted)}
            y2={CHART_HEIGHT - PADDING_BOTTOM}
            stroke="#0284c7"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeOpacity={0.55}
          />
        )}

        {fcEffectivePath && (
          <path
            d={fcEffectivePath}
            fill="none"
            stroke="#0284c7"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        )}
        {caboEffectivePath && (
          <path d={caboEffectivePath} fill="none" stroke="#d97706" strokeWidth={2} />
        )}
        {obsEffectivePath && (
          <path d={obsEffectivePath} fill="none" stroke="#059669" strokeWidth={2} />
        )}

        {hours.map((row, index) =>
          index % 3 === 0 || index === hours.length - 1 ? (
            <text
              key={row.validTime}
              x={chartX(index, hours.length, innerWidth)}
              y={CHART_HEIGHT - 8}
              textAnchor="middle"
              className="fill-ink/50 text-[10px]"
            >
              {formatHourLabel(row.hourLocal)}
            </text>
          ) : null
        )}
      </svg>

      {tooltipRow && tooltip && (
        <div
          className="pointer-events-none absolute z-10 min-w-[9rem] rounded border border-ink/15 bg-white px-2.5 py-2 text-[11px] shadow-sm"
          style={{
            left: Math.min(tooltip.left + 12, width - 148),
            top: Math.max(tooltip.top - 88, 0),
          }}
        >
          <p className="font-medium text-ink/80">{formatHourLabel(tooltipRow.hourLocal)}</p>
          <ul className="mt-1 space-y-0.5 text-ink/65">
            <li>
              <span className="text-emerald-700">CNC Foil</span>{" "}
              {formatWindKnots(tooltipRow.effectiveWindKnots)}
            </li>
            <li>
              <span className="text-amber-700">Cabo Raso</span>{" "}
              {formatWindKnots(tooltipCabo?.effectiveWindKnots)}
            </li>
            <li>
              <span className="text-sky-700">Forecast</span>{" "}
              {formatWindKnots(tooltipForecast?.effectiveWindKnots)}
            </li>
          </ul>
        </div>
      )}

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink/60">
        <li>
          <span className="inline-block h-0.5 w-4 align-middle bg-emerald-600" /> CNC Foil effective
        </li>
        <li>
          <span className="inline-block h-0.5 w-4 align-middle bg-amber-600" /> Cabo Raso effective
        </li>
        <li>
          <span className="inline-block h-0.5 w-4 align-middle border-t-2 border-dashed border-sky-600" />{" "}
          Forecast effective
        </li>
        <li>
          <span className="inline-block h-3 w-0.5 align-middle bg-emerald-600" /> CNC Foil kick-in
        </li>
        <li>
          <span className="inline-block h-3 w-0.5 align-middle border-l-2 border-dashed border-amber-600" />{" "}
          Cabo Raso kick-in
        </li>
        <li>
          <span className="inline-block h-3 w-0.5 align-middle border-l-2 border-dashed border-sky-600" />{" "}
          Predicted P50
        </li>
      </ul>
    </div>
  );
}
