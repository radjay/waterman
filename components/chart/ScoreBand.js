"use client";

import { SCORE_FILL, scoreBand } from "../../lib/dayChart";

/**
 * The score, per slot, across the day.
 *
 * The number is printed above every bar rather than on hover. This is the band
 * that answers "and when is it best" — a shape alone tells you there is a peak
 * but not whether the peak is a 90 or a 61, and those are different afternoons.
 *
 * The bar for the slot covering now takes the now hue on its number only, not
 * its fill: the fill encodes quality and the hue encodes position, and painting
 * a current slot orange would say "marginal" about a 90.
 *
 * Bars occupy roughly half the band height so the numbers have room. That ratio
 * is a layout constant rather than a scale — the printed number is the value,
 * and the bar is there to make the shape of the day scannable.
 */
export function ScoreBand({
  chart,
  height,
  barRatio = 0.52,
  numberSize = 12,
  gutter = 1.5,
  radius = 3,
  className = "",
}) {
  const scored = chart.columns.filter(
    (c) => c.slot?.score !== null && c.slot?.score !== undefined
  );
  if (scored.length === 0) return null;

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {chart.columns.map((col) => {
        const score = col.slot?.score;
        if (score === null || score === undefined) return null;
        const fill = SCORE_FILL[scoreBand(score)];
        const numberClass = col.isCurrent
          ? "text-now"
          : score < 60
            ? "text-marginal"
            : "text-faded-ink";

        return (
          <div
            key={col.slot.timestamp}
            className="absolute inset-y-0 flex flex-col justify-end"
            style={{ left: `${col.left}%`, width: `${col.width}%`, padding: `0 ${gutter}px` }}
          >
            <div
              className={`font-data font-bold text-center tabular-nums leading-none mb-[3px] ${numberClass}`}
              style={{ fontSize: numberSize }}
            >
              {Math.round(score)}
            </div>
            <div
              className="w-full"
              style={{
                height: `${Math.max(0, Math.min(100, score)) * barRatio}%`,
                borderRadius: `${radius}px ${radius}px 0 0`,
                background: fill.color,
                opacity: fill.opacity,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
