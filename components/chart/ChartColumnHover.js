"use client";

import { useEffect, useRef, useState } from "react";
import { PLOT_LABEL_INSET_PX, topPct, windScale } from "../../lib/dayChart";
import { resolveChartHover } from "./chartHover";

/** Max pointer travel (px) still counted as a tap, not a pan/scroll. */
const TAP_SLOP_PX = 10;

function sameHover(a, b) {
  if (!a || !b) return false;
  return a.kind === b.kind && Math.abs(a.xPct - b.xPct) < 0.05;
}

function hoverAtEvent(e, { chart, station, nowMs }) {
  const rect = e.currentTarget.getBoundingClientRect();
  if (rect.width <= 0) return null;
  const xPct = ((e.clientX - rect.left) / rect.width) * 100;
  return resolveChartHover({ chart, station, xPct, nowMs });
}

/**
 * Hover overlay for the wind band: forecast columns and station samples.
 *
 * Hit-testing is continuous along x — a station reading at 15:42 wins over the
 * 3h column it sits in when the pointer is near that sample. The tip sits
 * BELOW the wind plot (not above) so it does not cover the wind line. Selected
 * points are marked on the plot (same x as the tip, same y scale as WindBand).
 *
 * Mouse: move shows tip, leave clears. Touch/pen: a tap (not a pan/scroll)
 * shows the same tip + marks; tap the same point again or tap outside dismisses;
 * tap a different x moves the tip. Pointer events only — no mouse* handlers
 * (iOS compatibility mouse after a tap must not fight the sticky tip).
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
  const rootRef = useRef(null);
  const gestureRef = useRef(null);
  /** True while the tip was set by a touch/pen tap (sticky until dismiss). */
  const touchStickyRef = useRef(false);

  useEffect(() => {
    if (!hover) return undefined;
    const onDocPointerDown = (e) => {
      if (!touchStickyRef.current) return;
      if (rootRef.current?.contains(e.target)) return;
      touchStickyRef.current = false;
      setHover(null);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [hover]);

  if (!chart?.columns?.length) return null;

  const values = [
    ...chart.columns.flatMap((c) => [c.slot?.speed, c.slot?.gust]),
    ...(station?.history ?? []).flatMap((p) => [p.speed, p.gust]),
  ];
  const scale = windScale(values);

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse") return;
    gestureRef.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      panned: false,
    };
  };

  const onPointerMove = (e) => {
    if (e.pointerType === "mouse") {
      touchStickyRef.current = false;
      setHover(hoverAtEvent(e, { chart, station, nowMs }));
      return;
    }
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId || g.panned) return;
    if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > TAP_SLOP_PX) {
      g.panned = true;
    }
  };

  const onPointerUp = (e) => {
    if (e.pointerType === "mouse") return;
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g || g.pointerId !== e.pointerId || g.panned) return;

    const next = hoverAtEvent(e, { chart, station, nowMs });
    setHover((prev) => {
      if (next && sameHover(prev, next)) {
        touchStickyRef.current = false;
        return null;
      }
      touchStickyRef.current = !!next;
      return next;
    });
  };

  const onPointerLeave = (e) => {
    if (e.pointerType !== "mouse") return;
    touchStickyRef.current = false;
    setHover(null);
  };

  const onPointerCancel = (e) => {
    if (gestureRef.current?.pointerId === e.pointerId) {
      gestureRef.current = null;
    }
    if (e.pointerType === "mouse") {
      touchStickyRef.current = false;
      setHover(null);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`absolute inset-0 z-[4] overflow-visible touch-pan-y ${className}`}
      style={{ left: leftInset }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
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
