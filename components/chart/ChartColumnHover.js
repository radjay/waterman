"use client";

import { useState } from "react";
import { PLOT_LABEL_INSET_PX } from "../../lib/dayChart";
import { resolveChartHover } from "./chartHover";

/**
 * Hover overlay for the wind band: forecast columns and station samples.
 *
 * Hit-testing is continuous along x — a station reading at 15:42 wins over the
 * 3h column it sits in when the pointer is near that sample. The tip sits
 * BELOW the wind plot (not above) so it does not cover the wind line.
 *
 * Reuses the same surface language as StationWindChart's tooltip (page fill,
 * card border, data font). Lives as a sibling overlay so WindBand stays a pure
 * plot.
 */
export function ChartColumnHover({
  chart,
  station = null,
  nowMs = Date.now(),
  leftInset = PLOT_LABEL_INSET_PX,
  className = "",
}) {
  const [hover, setHover] = useState(null);
  if (!chart?.columns?.length) return null;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    setHover(resolveChartHover({ chart, station, xPct, nowMs }));
  };

  return (
    <div
      className={`absolute inset-0 z-[4] overflow-visible ${className}`}
      style={{ left: leftInset }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      {hover && (
        <div
          role="tooltip"
          className="absolute top-full z-[5] mt-1.5 -translate-x-1/2 pointer-events-none rounded-ui border border-card bg-page px-2.5 py-1.5 shadow-nav whitespace-nowrap"
          style={{ left: `${hover.xPct}%` }}
        >
          <span className="font-data text-[11px] text-ink tabular-nums">{hover.text}</span>
        </div>
      )}
    </div>
  );
}
