"use client";

import { useState } from "react";
import { PLOT_LABEL_INSET_PX } from "../../lib/dayChart";
import { columnHoverText } from "./chartHover";

/**
 * Hover targets for the day-chart columns.
 *
 * Reuses the same surface language as StationWindChart's tooltip (page fill,
 * card border, data font) rather than inventing a second chip. Lives as a
 * sibling overlay so WindBand stays a pure plot.
 */
export function ChartColumnHover({
  chart,
  station = null,
  nowMs = Date.now(),
  leftInset = PLOT_LABEL_INSET_PX,
  className = "",
}) {
  const [active, setActive] = useState(null);
  if (!chart?.columns?.length) return null;

  const tip = active != null ? columnHoverText(chart.columns[active], station, nowMs) : null;
  const col = active != null ? chart.columns[active] : null;

  return (
    <div
      className={`absolute inset-0 z-[4] ${className}`}
      style={{ left: leftInset }}
      onMouseLeave={() => setActive(null)}
    >
      {chart.columns.map((c, i) => (
        <div
          key={c.slot.timestamp}
          className="absolute inset-y-0"
          style={{ left: `${c.left}%`, width: `${c.width}%` }}
          onMouseEnter={() => setActive(i)}
        />
      ))}

      {tip && col && (
        <div
          role="tooltip"
          className="absolute top-0 z-[5] -translate-x-1/2 -translate-y-[calc(100%+6px)] pointer-events-none rounded-ui border border-card bg-page px-2.5 py-1.5 shadow-nav whitespace-nowrap"
          style={{ left: `${col.left + col.width / 2}%` }}
        >
          <span className="font-data text-[11px] text-ink tabular-nums">{tip}</span>
        </div>
      )}
    </div>
  );
}
