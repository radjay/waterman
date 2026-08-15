"use client";

import { PLOT_LABEL_INSET_PX, topPct, waveScale } from "../../lib/dayChart";
import { tideCurve } from "../../lib/tideCurve";
import { GridLines } from "./WindBand";

/**
 * Waves and tide, on one band and one scale each.
 *
 * Two lines, drawn differently on purpose: the wave height is a muted solid
 * line because it is a magnitude you read against the gridline, and the tide is
 * a dashed accent line because it is a shape you read as a rhythm — you want to
 * know it is rising, not that it is at 1.7 m. Sharing one axis would be a lie
 * (metres of swell and metres of tide are not the same metres), so the tide is
 * normalised into the band and never gets a number.
 *
 * The band renders nothing when the spot has neither. An empty plot with an
 * axis reads as "flat", which is a claim, where absence reads as absence.
 */

/**
 * What this band would actually draw for a spot and a day.
 *
 * The panel asks before it renders, so the legend can only ever name lines that
 * are on screen. A legend entry for a tide we have no data for is worse than no
 * legend: it tells the rider to look for something that is not there and let
 * them conclude the tide is flat.
 */
export function waveTidePresence(chart, tides = []) {
  const range = trackRange(chart);
  const wave =
    chart.columns.filter((c) => Number.isFinite(c.slot?.waveHeight) && c.slot.waveHeight > 0)
      .length >= 2;
  const tide = range ? tideCurve(tides, range.start, range.end).length >= 2 : false;
  return { wave, tide, any: wave || tide };
}

export function WaveTideBand({
  chart,
  tides = [],
  height,
  labelSize = 8.5,
  showWash = true,
  nowMs = Date.now(),
  labelInset = PLOT_LABEL_INSET_PX,
  className = "",
}) {
  const wavePoints = chart.columns
    .filter((c) => Number.isFinite(c.slot?.waveHeight) && c.slot.waveHeight > 0)
    .map((c) => ({ time: c.slot.timestamp, height: Number(c.slot.waveHeight) }));

  const range = trackRange(chart);
  const tidePoints = range ? tideCurve(tides, range.start, range.end) : [];

  if (wavePoints.length < 2 && tidePoints.length < 2) return null;

  const scale = waveScale(wavePoints.map((p) => p.height));

  const x = (t) => (range ? ((t - range.start) / (range.end - range.start)) * 300 : 0);

  const wavePath = pathFrom(
    wavePoints.filter((p) => p.time >= range.start && p.time <= range.end),
    x,
    (v) => topPct(v, scale.max)
  );

  const tideMin = tidePoints.length ? Math.min(...tidePoints.map((p) => p.height)) : 0;
  const tideMax = tidePoints.length ? Math.max(...tidePoints.map((p) => p.height)) : 0;
  const tideSpan = tideMax - tideMin || 1;
  // Inset so the tide never touches the top or bottom edge — a line grazing the
  // frame reads as clipped data rather than as high water.
  const tidePath = pathFrom(tidePoints, x, (v) => 12 + (1 - (v - tideMin) / tideSpan) * 76);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div className="absolute inset-0" style={{ left: labelInset }}>
        {showWash && chart.futureFrom !== null && (
          <div
            className="absolute inset-y-0 right-0 bg-accent-wash"
            style={{ left: `${chart.futureFrom}%` }}
          />
        )}

        <svg
          viewBox="0 0 300 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full z-[1]"
          aria-hidden="true"
        >
          {tidePath && (
            <path
              d={tidePath}
              fill="none"
              stroke="rgb(var(--wm-accent))"
              strokeWidth="1.2"
              strokeDasharray="3 3"
              opacity="0.8"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {wavePath && (
            <path
              d={wavePath}
              fill="none"
              stroke="var(--wm-muted)"
              strokeWidth="1.6"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      </div>

      {wavePath && <GridLines lines={scale.lines} labelSize={labelSize} labelInset={labelInset} />}
    </div>
  );
}

/** The chart's time span, from the first slot to the start of the last one. */
function trackRange(chart) {
  if (!chart.columns.length) return null;
  const start = chart.columns[0].slot.timestamp;
  const end = chart.columns[chart.columns.length - 1].slot.timestamp;
  return end > start ? { start, end } : null;
}

/**
 * A Catmull-Rom spline through the samples, emitted as cubic beziers.
 *
 * Swell height is a continuous quantity sampled every three hours, so a curve
 * through the samples is honest in a way it is NOT for wind: wave height moves
 * over hours, where a gust front moves over minutes. The curve passes exactly
 * through every real reading and never overshoots beyond the neighbouring pair,
 * so it cannot invent a peak that is not in the data.
 */
function pathFrom(points, x, y) {
  if (!points || points.length < 2) return null;
  const p = points.map((pt) => ({ x: x(pt.time), y: y(pt.height) }));
  if (p.length === 2) {
    return `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)} L${p[1].x.toFixed(1)},${p[1].y.toFixed(1)}`;
  }

  let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i += 1) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(
      1
    )},${p2.y.toFixed(1)}`;
  }
  return d;
}
