"use client";

import { useMemo, useState } from "react";

const MODEL_COLORS = ["#0284c7", "#059669", "#d97706", "#7c3aed", "#db2777", "#0891b2"];

function fmt(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "—";
}

function scale(value, min, max, size) {
  if (max <= min) return size / 2;
  return ((value - min) / (max - min)) * size;
}

export function ForecastAccuracySection({ chartData, modelRows, formatLabel }) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const models = useMemo(() => modelRows?.map((row) => row.model) ?? [], [modelRows]);
  const chartModels = models.slice(0, 4);

  if (!chartData?.scatter || models.length === 0) return null;

  const sampleDays = chartData.sampleDays ?? [];
  const sampleDay = sampleDays[selectedDayIndex] ?? sampleDays[0];

  return (
    <section className="rounded-lg border border-ink/15 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold">What does “close” look like?</h3>
      <p className="mt-1 text-xs text-ink/50">
        Left: each dot is one hour. On the dashed line = perfect guess. Right: one real day at the marina.
      </p>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <ForecastObservedScatter
          scatter={chartData.scatter}
          domain={chartData.domain}
          models={chartModels}
          allModels={models}
          formatLabel={formatLabel}
        />

        {sampleDay ? (
          <div>
            {sampleDays.length > 1 ? (
              <div className="mb-2 flex gap-1">
                {sampleDays.map((day, index) => (
                  <button
                    key={day.dateLocal}
                    type="button"
                    onClick={() => setSelectedDayIndex(index)}
                    className={`rounded border px-2 py-0.5 text-xs ${
                      index === selectedDayIndex
                        ? "border-ink/25 bg-ink/5"
                        : "border-ink/10 text-ink/50"
                    }`}
                  >
                    {day.dateLocal}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mb-2 text-xs text-ink/50">{sampleDay.dateLocal}</p>
            )}
            <SampleDayLineChart
              day={sampleDay}
              models={chartModels}
              formatLabel={formatLabel}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ForecastObservedScatter({ scatter, domain, models, allModels, formatLabel }) {
  const width = 320;
  const height = 320;
  const margin = { top: 12, right: 12, bottom: 32, left: 36 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const { min, max } = domain ?? { min: 0, max: 30 };
  const ticks = tickValues(min, max, 4);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-sm" role="img" aria-label="Forecast versus observed">
      <text x={width / 2} y={height - 6} textAnchor="middle" className="fill-ink/50 text-[9px]">
        What happened (kt)
      </text>
      <g transform={`translate(${margin.left} ${margin.top})`}>
        <line x1={0} y1={plotH} x2={plotW} y2={0} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" />
        {models.map((model) => {
          const colorIndex = allModels.indexOf(model);
          const color = MODEL_COLORS[colorIndex >= 0 ? colorIndex : 0];
          return (scatter[model] ?? []).map((point, index) => (
            <circle
              key={`${model}-${index}`}
              cx={scale(point.observed, min, max, plotW)}
              cy={plotH - scale(point.forecast, min, max, plotH)}
              r={2.5}
              fill={color}
              opacity={0.4}
            >
              <title>
                {formatLabel(model)}: saw {fmt(point.observed)}, said {fmt(point.forecast)} kt
              </title>
            </circle>
          ));
        })}
        {ticks.map((tick) => (
          <text
            key={tick}
            x={scale(tick, min, max, plotW)}
            y={plotH + 12}
            textAnchor="middle"
            className="fill-ink/40 text-[8px]"
          >
            {tick}
          </text>
        ))}
      </g>
    </svg>
  );
}

function SampleDayLineChart({ day, models, formatLabel }) {
  const width = 320;
  const height = 220;
  const margin = { top: 8, right: 8, bottom: 24, left: 28 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const hours = day.hours ?? [];
  if (hours.length === 0) return null;

  const hourMin = Math.min(...hours.map((row) => row.hourLocal));
  const hourMax = Math.max(...hours.map((row) => row.hourLocal));
  const allValues = hours.flatMap((row) => [
    row.observed,
    ...models.map((model) => row.forecasts?.[model]),
  ]).filter(Number.isFinite);
  const yMin = Math.max(0, Math.floor(Math.min(...allValues) - 2));
  const yMax = Math.ceil(Math.max(...allValues) + 2);

  const x = (hour) =>
    hourMax <= hourMin ? plotW / 2 : ((hour - hourMin) / (hourMax - hourMin)) * plotW;
  const y = (value) =>
    yMax <= yMin ? plotH / 2 : plotH - ((value - yMin) / (yMax - yMin)) * plotH;

  const observedPath = linePath(hours, (row) => x(row.hourLocal), (row) => y(row.observed));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-sm" role="img" aria-label={`Wind on ${day.dateLocal}`}>
      <g transform={`translate(${margin.left} ${margin.top})`}>
        {models.map((model, index) => {
          const path = linePath(
            hours.filter((row) => Number.isFinite(row.forecasts?.[model])),
            (row) => x(row.hourLocal),
            (row) => y(row.forecasts[model])
          );
          if (!path) return null;
          return (
            <path
              key={model}
              d={path}
              fill="none"
              stroke={MODEL_COLORS[index % MODEL_COLORS.length]}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.8}
            />
          );
        })}
        {observedPath ? (
          <path d={observedPath} fill="none" stroke="#059669" strokeWidth={2.5} />
        ) : null}
      </g>
      <text x={margin.left} y={height - 4} className="fill-ink/45 text-[8px]">
        Green = real wind · dashed = forecast
      </text>
    </svg>
  );
}

function linePath(rows, xFn, yFn) {
  if (rows.length === 0) return "";
  return rows
    .map((row, index) => `${index === 0 ? "M" : "L"} ${xFn(row).toFixed(1)} ${yFn(row).toFixed(1)}`)
    .join(" ");
}

function tickValues(min, max, count) {
  if (max <= min) return [min];
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, index) => Math.round(min + step * index));
}
