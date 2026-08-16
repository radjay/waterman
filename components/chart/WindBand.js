"use client";

import { averageWindow } from "../../lib/station";
import { PLOT_LABEL_INSET_PX, topPct, windScale } from "../../lib/dayChart";

/**
 * Wind: forecast as stacked grey bars, live station as accent lines.
 *
 * Forecast uses stacked bars from the x-axis — main wind `0 → speed`, optional
 * gust cap `speed → gust` in a lighter shade of muted ink/grey. Past columns
 * stay dimmed so you can still read "the model said 12 kn and the station
 * read 9".
 *
 * The station is continuous, so it is drawn as lines on top of the bars:
 * solid accent for base, dashed accent for gust, clipped to now. Matching the
 * LIVE cam badge colour keeps live readings obvious against the grey forecast.
 * A live line past the now marker would be a prediction wearing a
 * measurement's clothes.
 */
const FORECAST = {
  past: { base: 0.22, gust: 0.12 },
  live: { base: 0.34, gust: 0.18 },
};

export function WindBand({
  chart,
  station = null,
  height,
  scale: given,
  gutter = 2,
  radius = 3,
  labelSize = 8.5,
  showWash = true,
  labelInset = PLOT_LABEL_INSET_PX,
  nowMs = Date.now(),
  /** Cap y-axis ticks — short bands pass 3 so 5kt steps thin earlier. */
  maxLines,
  className = "",
}) {
  const values = [
    ...chart.columns.flatMap((c) => [c.slot?.speed, c.slot?.gust]),
    ...(station?.history ?? []).flatMap((p) => [p.speed, p.gust]),
  ];
  const scale = given ?? windScale(values, maxLines != null ? { maxLines } : undefined);

  const stationPaths = station ? stationLines(station, chart, scale, nowMs) : null;

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div className="absolute inset-0" style={{ left: labelInset }}>
        {/* Soft future wash — muted ink, not accent (forecast bars are grey). */}
        {showWash && chart.futureFrom !== null && (
          <div
            className="absolute inset-y-0 right-0 bg-ink/[0.04]"
            style={{ left: `${chart.futureFrom}%` }}
          />
        )}

        {chart.columns.map((col) => {
          const base = col.slot?.speed;
          const gust = col.slot?.gust;
          if (!Number.isFinite(base)) return null;
          const alpha = col.isPast ? FORECAST.past : FORECAST.live;

          return (
            <div
              key={col.slot.timestamp}
              className="absolute inset-y-0"
              style={{ left: `${col.left}%`, width: `${col.width}%`, padding: `0 ${gutter}px` }}
            >
              <StackedBar
                speed={base}
                gust={gust}
                scaleMax={scale.max}
                gutter={gutter}
                radius={radius}
                baseClass="bg-ink"
                baseOpacity={alpha.base}
                gustOpacity={alpha.gust}
              />
            </div>
          );
        })}

        {stationPaths && (
          <svg
            viewBox="0 0 300 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full z-[1]"
            aria-hidden="true"
          >
            {stationPaths.gust && (
              <path
                d={stationPaths.gust}
                fill="none"
                stroke="rgb(var(--wm-accent))"
                strokeWidth="1.6"
                strokeDasharray="4 4"
                opacity="0.7"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {stationPaths.speed && (
              <path
                d={stationPaths.speed}
                fill="none"
                stroke="rgb(var(--wm-accent))"
                strokeWidth="2.4"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        )}
      </div>

      {/* Gridlines sit ABOVE the bars and lines so reference marks stay readable. */}
      <GridLines lines={scale.lines} labelSize={labelSize} labelInset={labelInset} />
    </div>
  );
}

/**
 * Stacked forecast bar: main fill from the x-axis (0 kt) up to `speed`, optional
 * gust cap from `speed` to `gust` in a lighter shade of the same family.
 */
function StackedBar({
  speed,
  gust,
  scaleMax,
  gutter,
  radius,
  baseClass,
  baseOpacity,
  gustOpacity,
}) {
  if (!Number.isFinite(speed) || !Number.isFinite(scaleMax) || scaleMax <= 0) return null;

  const baseTop = topPct(speed, scaleMax);
  const hasGust = Number.isFinite(gust) && gust > speed;
  const gustTop = hasGust ? topPct(gust, scaleMax) : null;

  return (
    <>
      <div
        className={`absolute ${baseClass}`}
        style={{
          left: gutter,
          right: gutter,
          top: `${baseTop}%`,
          bottom: 0,
          opacity: baseOpacity,
          borderRadius: radius,
        }}
      />
      {hasGust && (
        <div
          className={`absolute ${baseClass}`}
          style={{
            left: gutter,
            right: gutter,
            top: `${gustTop}%`,
            bottom: `${100 - baseTop}%`,
            opacity: gustOpacity,
            borderRadius: radius,
          }}
        />
      )}
    </>
  );
}

/**
 * Reference lines with their labels.
 *
 * The label sits in the shared left inset; the dashed rule starts after it so
 * bars and lines never paint under "25kt".
 */
export function GridLines({ lines, labelSize = 8.5, labelInset = PLOT_LABEL_INSET_PX }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-[2]">
      {lines.map((line) => (
        <div
          key={line.value}
          className="absolute right-0 flex items-center gap-1 -translate-y-1/2"
          style={{ top: `${line.top}%`, left: 0 }}
        >
          <span
            className="font-data text-dim leading-none flex-none text-right"
            style={{ fontSize: labelSize, width: labelInset - 4, paddingRight: 2 }}
          >
            {line.label}
          </span>
          <span className="flex-1 border-t border-dashed border-card" />
        </div>
      ))}
    </div>
  );
}

/**
 * Station history as two SVG paths in the 0-300 × 0-100 box, clipped to now.
 *
 * x is time between the chart's first and last hour, so the live line and the
 * forecast columns share one clock. Points outside the drawn hours (or after
 * now) are dropped rather than clamped — a flat run pinned to the left edge
 * would read as an hour of dead calm that never happened.
 */
function stationLines(station, chart, scale, nowMs) {
  const raw = (station.history ?? []).filter((p) => Number.isFinite(p?.speed));
  // A whole day of 5-minute buckets squeezed into a few hundred pixels is a
  // hairball — every gust becomes a spike a pixel wide, and the shape of the
  // day (the thing this line is FOR) disappears under it. A ~25 minute rolling
  // mean keeps the trend and the build without inventing anything: the points
  // are still real readings, just averaged.
  const points = averageWindow(raw, raw.length > 60 ? 5 : 3);
  if (points.length < 2 || !chart.columns.length) return null;

  const trackStart = chart.columns[0].slot.timestamp;
  const lastCol = chart.columns[chart.columns.length - 1];
  const trackEnd = lastCol.slot.timestamp;
  const span = trackEnd - trackStart;
  if (span <= 0) return null;

  const clipEnd = Number.isFinite(nowMs) ? Math.min(trackEnd, nowMs) : trackEnd;
  const x = (t) => ((t - trackStart) / span) * 300;
  const y = (v) => topPct(v, scale.max);

  const build = (key) => {
    const usable = points.filter(
      (p) => Number.isFinite(p[key]) && p.time >= trackStart && p.time <= clipEnd
    );
    if (usable.length < 2) return null;
    return usable
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.time).toFixed(1)},${y(p[key]).toFixed(1)}`)
      .join(" ");
  };

  return { speed: build("speed"), gust: build("gust") };
}
