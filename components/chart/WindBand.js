"use client";

import { PLOT_LABEL_INSET_PX, topPct, windScale } from "../../lib/dayChart";
import { stationInSlot } from "./chartHover";

/**
 * Wind: forecast and live as stacked bars from the x-axis.
 *
 * Both series use the same encoding — a rectangle from 0 kt up to the main
 * wind, with a different shade of the same family stacked above for gusts
 * (main → gust). Forecast is muted grey/ink; live (station) is accent/primary,
 * matching the LIVE cam badge. Live sits on a higher z-index and is drawn
 * slightly narrower so the grey forecast remains visible underneath.
 *
 * Live is one stacked bar per 3h column that already has a station reading
 * (latest sample in that slot at or before now) — not a polyline. Future
 * columns stay forecast-only.
 *
 * Past forecast columns stay on the plot (dimmed) so you can still read
 * "the model said 12 kn and the station read 9".
 */
const FORECAST = {
  past: { base: 0.22, gust: 0.12 },
  live: { base: 0.34, gust: 0.18 },
};
const LIVE_BAR = { base: 0.92, gust: 0.48 };
/** Extra horizontal inset (px) so live reads on top of the wider forecast bar. */
const LIVE_INSET = 4;

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
  className = "",
}) {
  const values = [
    ...chart.columns.flatMap((c) => [c.slot?.speed, c.slot?.gust]),
    ...(station?.history ?? []).flatMap((p) => [p.speed, p.gust]),
  ];
  const scale = given ?? windScale(values);
  const history = station?.history ?? [];

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

        {/* Live on top of forecast — same column clock, primary family. */}
        {history.length > 0 &&
          chart.columns.map((col) => {
            const live = stationInSlot(history, col.slot?.timestamp, nowMs);
            if (!live || !Number.isFinite(live.speed)) return null;

            return (
              <div
                key={`live-${col.slot.timestamp}`}
                className="absolute inset-y-0 z-[1]"
                style={{ left: `${col.left}%`, width: `${col.width}%`, padding: `0 ${gutter}px` }}
              >
                <StackedBar
                  speed={live.speed}
                  gust={live.gust}
                  scaleMax={scale.max}
                  gutter={gutter + LIVE_INSET}
                  radius={radius}
                  baseClass="bg-accent"
                  baseOpacity={LIVE_BAR.base}
                  gustOpacity={LIVE_BAR.gust}
                />
              </div>
            );
          })}
      </div>

      {/* Gridlines sit ABOVE the bars so the reference lines stay readable. */}
      <GridLines lines={scale.lines} labelSize={labelSize} labelInset={labelInset} />
    </div>
  );
}

/**
 * Stacked wind bar: main fill from the x-axis (0 kt) up to `speed`, optional
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
 * bars never paint under "25kt".
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
