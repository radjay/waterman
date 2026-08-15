"use client";

import { useState } from "react";
import { PLOT_LABEL_INSET_PX, topPct, windScale } from "../../lib/dayChart";
import { resolveChartHover } from "./chartHover";

/**
 * Hover overlay for the wind band: forecast columns and station samples.
 *
 * Hit-testing is continuous along x — a station reading at 15:42 wins over the
 * 3h column it sits in when the pointer is near that sample. The tip sits
 * BELOW the wind plot (not above) so it does not cover the wind line. Selected
 * points are marked on the plot (same x as the tip, same y scale as WindBand).
 *
 * Desktop mouse only: pointer events with `pointerType === 'mouse'`. Touch and
 * pen must not leave a sticky tip — iOS compatibility mouse events after a tap
 * are ignored because we never listen for mouse* handlers.
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

  const values = [
    ...chart.columns.flatMap((c) => [c.slot?.speed, c.slot?.gust]),
    ...(station?.history ?? []).flatMap((p) => [p.speed, p.gust]),
  ];
  const scale = windScale(values);

  const onPointerMove = (e) => {
    if (e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    setHover(resolveChartHover({ chart, station, xPct, nowMs }));
  };

  const clearHover = () => setHover(null);

  return (
    <div
      className={`absolute inset-0 z-[4] overflow-visible touch-pan-y ${className}`}
      style={{ left: leftInset }}
      onPointerMove={onPointerMove}
      onPointerLeave={clearHover}
      onPointerCancel={clearHover}
    >
      {hover?.marks && <HoverMarks marks={hover.marks} scaleMax={scale.max} />}
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

/** Crosshair + value dots aligned to WindBand's track and y-scale. */
function HoverMarks({ marks, scaleMax }) {
  if (!marks || !Number.isFinite(scaleMax) || scaleMax <= 0) return null;

  return (
    <div className="absolute inset-0 z-[3] pointer-events-none" aria-hidden="true">
      {marks.column && (
        <div
          className="absolute inset-y-0 bg-accent-wash border-x border-accent-border"
          style={{ left: `${marks.column.left}%`, width: `${marks.column.width}%` }}
        />
      )}
      <div
        className="absolute inset-y-0 w-px bg-ink/40"
        style={{ left: `${marks.xPct}%` }}
      />
      {marks.column && (
        <>
          <MarkDot
            xPct={marks.xPct}
            value={marks.column.speed}
            scaleMax={scaleMax}
            tone="accent"
          />
          {Number.isFinite(marks.column.gust) && (
            <MarkDot
              xPct={marks.xPct}
              value={marks.column.gust}
              scaleMax={scaleMax}
              tone="accent"
              hollow
            />
          )}
        </>
      )}
      {marks.station && (
        <>
          <MarkDot
            xPct={marks.station.xPct}
            value={marks.station.speed}
            scaleMax={scaleMax}
            tone="ink"
          />
          {Number.isFinite(marks.station.gust) && (
            <MarkDot
              xPct={marks.station.xPct}
              value={marks.station.gust}
              scaleMax={scaleMax}
              tone="ink"
              hollow
            />
          )}
        </>
      )}
    </div>
  );
}

function MarkDot({ xPct, value, scaleMax, tone = "ink", hollow = false }) {
  if (!Number.isFinite(value) || !Number.isFinite(xPct)) return null;
  const y = topPct(value, scaleMax);
  // Ink outer ring so accent dots stay visible on the forecast wash/cap.
  const fill = hollow
    ? tone === "accent"
      ? "bg-page border-2 border-accent ring-1 ring-ink"
      : "bg-page border-2 border-ink"
    : tone === "accent"
      ? "bg-accent border-2 border-page ring-1 ring-ink"
      : "bg-ink border-2 border-page";
  return (
    <span
      className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${fill}`}
      style={{ left: `${xPct}%`, top: `${y}%` }}
    />
  );
}
