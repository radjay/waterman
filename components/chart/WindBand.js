"use client";

import { averageWindow } from "../../lib/station";
import { PLOT_LABEL_INSET_PX, topPct, windScale } from "../../lib/dayChart";

/**
 * Wind: forecast as columns, the live station as lines.
 *
 * The forecast is drawn as a column per 3-hour slot — a band from base to gust
 * with a solid cap at base — rather than as a smooth curve, because the data
 * really is two numbers per slot. A spline through six points implies a
 * resolution the model does not have, and riders read the wiggles as forecast
 * detail.
 *
 * The station is the opposite: it IS continuous, so it is drawn as lines, solid
 * for base and dashed for gust, and only up to now. A live line continuing past
 * the now marker would be a prediction wearing a measurement's clothes.
 *
 * Slots wholly in the past are dimmed rather than removed. "The 07:00 slot said
 * 12 kn and the station read 9" is the single most useful thing on this chart,
 * and you cannot see it if the forecast disappears once it is spent.
 */
const PAST = { band: 0.16, cap: 0.45 };
const LIVE = { band: 0.26, cap: 0.85 };

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
  className = "",
}) {
  const values = [
    ...chart.columns.flatMap((c) => [c.slot?.speed, c.slot?.gust]),
    ...(station?.history ?? []).flatMap((p) => [p.speed, p.gust]),
  ];
  const scale = given ?? windScale(values);

  const stationPaths = station ? stationLines(station, chart, scale) : null;

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div className="absolute inset-0" style={{ left: labelInset }}>
        {/* Everything from now on is forecast. The wash says so without a label. */}
        {showWash && chart.futureFrom !== null && (
          <div
            className="absolute inset-y-0 right-0 bg-accent-wash"
            style={{ left: `${chart.futureFrom}%` }}
          />
        )}

        {chart.columns.map((col) => {
          const base = col.slot?.speed;
          const gust = col.slot?.gust;
          if (!Number.isFinite(base)) return null;
          const alpha = col.isPast ? PAST : LIVE;
          const capTop = topPct(base, scale.max);
          const bandTop = Number.isFinite(gust) ? topPct(gust, scale.max) : capTop;

          return (
            <div
              key={col.slot.timestamp}
              className="absolute inset-y-0"
              style={{ left: `${col.left}%`, width: `${col.width}%`, padding: `0 ${gutter}px` }}
            >
              <div
                className="absolute bg-accent"
                style={{
                  left: gutter,
                  right: gutter,
                  top: `${bandTop}%`,
                  bottom: `${100 - capTop}%`,
                  opacity: alpha.band,
                  borderRadius: radius,
                }}
              />
              <div
                className="absolute bg-accent"
                style={{
                  left: gutter,
                  right: gutter,
                  top: `${capTop}%`,
                  height: 2,
                  opacity: alpha.cap,
                  borderRadius: 2,
                }}
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
                stroke="rgb(var(--wm-ink))"
                strokeWidth="1.6"
                strokeDasharray="4 4"
                opacity="0.55"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {stationPaths.speed && (
              <path
                d={stationPaths.speed}
                fill="none"
                stroke="rgb(var(--wm-ink))"
                strokeWidth="2.4"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        )}
      </div>

      {/* Gridlines sit ABOVE the traces: the value of a reference line is that
          you can follow it across the plot, and behind a filled column it
          disappears exactly where you need it. Labels occupy the left inset. */}
      <GridLines lines={scale.lines} labelSize={labelSize} labelInset={labelInset} />
    </div>
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
 * forecast columns share one clock. Points outside the drawn hours are dropped
 * rather than clamped — a flat run pinned to the left edge would read as an
 * hour of dead calm that never happened.
 */
function stationLines(station, chart, scale) {
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

  const x = (t) => ((t - trackStart) / span) * 300;
  const y = (v) => topPct(v, scale.max);

  const build = (key) => {
    const usable = points.filter(
      (p) => Number.isFinite(p[key]) && p.time >= trackStart && p.time <= trackEnd
    );
    if (usable.length < 2) return null;
    return usable
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.time).toFixed(1)},${y(p[key]).toFixed(1)}`)
      .join(" ");
  };

  return { speed: build("speed"), gust: build("gust") };
}
