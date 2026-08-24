"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { PillToggle } from "./PillToggle";
import { Tooltip } from "./Tooltip";
import { LISBON, MAP_HEIGHT, MAP_WIDTH, project } from "../../lib/worldMapProjection";
import { WORLD_LAND_PATH } from "../../lib/data/worldLandPath";
import { cellTooltip } from "../../lib/wingfoilTooltipText";

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const BUTTON_ZOOM_STEP = 0.6;
const WHEEL_ZOOM_STEP = 0.35;

function clampZoom(z) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

/**
 * RouteMap — the alternative view for `/destinations`: pick a month, see
 * every Prime destination that month as a route line from Lisbon, labelled
 * with travel time. Hover a spot for that month's rating/wind/waves detail
 * (the same text RatingMatrix's cells show — see lib/wingfoilTooltipText.js
 * so the two views can't say different things about the same month).
 *
 * A destination that's Prime *and* shoulder-flagged still gets a route —
 * hiding it would bury a real option — but draws as a dashed line and a
 * hollow (not filled) marker, the same "same hue, different treatment"
 * language RatingMatrix's diagonal stripe uses, rather than recolouring it
 * into a different rating entirely.
 *
 * The route-name label and the dim-the-rest spotlight both key off
 * `hoveredId`, set on onMouseEnter (desktop) and, separately, on a
 * touch/pen onPointerUp (touch has no hover — a tap needs to do the same
 * job, or a phone gets the Tooltip's own content but never the
 * label/spotlight, since it never fires onMouseEnter at all). Gated to
 * touch/pen specifically: a real mouse already sets hoveredId via hover,
 * and an ungated click handler would fire right after and immediately
 * toggle it back off mid-hover.
 *
 * No mapping library: the coastline is a pre-generated static path
 * (lib/data/worldLandPath.js) and points are placed with a hand-rolled
 * equirectangular projection (lib/worldMapProjection.js) that must stay in
 * sync with it. Markers are plain HTML absolutely-positioned over the SVG
 * (not SVG circles) specifically so they can be real Tooltip triggers —
 * Tooltip renders a `<div>`, which isn't valid inside an `<svg>` without a
 * `<foreignObject>`. The wrapping box fixes its aspect ratio to the map's
 * own (padding-top trick) so the SVG's internal coordinates and the
 * overlay's percentage-based positions always agree, at any width.
 *
 * Zoom (+/- buttons, top-right, and scroll wheel) shrinks the SVG's
 * viewBox toward the map's centre rather than using CSS transform: scale —
 * no pan, so "simple" is genuinely simple, and it keeps the HTML marker
 * overlay in step for free: both the SVG content and the overlay's
 * percentage positions are computed through the same toPercent(), which
 * reads off the current viewBox rather than the full MAP_WIDTH/MAP_HEIGHT.
 * A transform-based zoom would have needed the scroll container to pick up
 * the extra scrollable overflow, which is exactly the kind of
 * cross-browser inconsistency this sidesteps entirely. Wheel zoom needs a
 * real (non-passive) event listener, not JSX onWheel, or preventDefault()
 * on it is silently ignored and the page scrolls instead of the map
 * zooming.
 */

function arcPath(from, to) {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const dist = Math.hypot(x1 - x0, y1 - y0);
  // Every route bows toward the top of the map by the same fraction of its
  // own length — a consistent "fan" rather than perpendicular-to-line
  // curves that would bow in different directions depending on bearing.
  const cx = mx;
  const cy = my - dist * 0.14;
  // Point at t=0.3 on the quadratic bezier (not the midpoint) for the
  // travel-time label — biased toward the Lisbon end on purpose, so it
  // doesn't sit under the tooltip, which always opens above the hovered
  // destination end.
  const t = 0.3;
  const labelAt = [
    (1 - t) ** 2 * x0 + 2 * t * (1 - t) * cx + t ** 2 * x1,
    (1 - t) ** 2 * y0 + 2 * t * (1 - t) * cy + t ** 2 * y1,
  ];
  return { d: `M${x0},${y0} Q${cx},${cy} ${x1},${y1}`, labelAt };
}

export function RouteMap({ rows, months }) {
  const [monthKey, setMonthKey] = useState(() => months[new Date().getMonth()].key);
  const [hoveredId, setHoveredId] = useState(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);

  const month = months.find((m) => m.key === monthKey);
  const lisbonXY = useMemo(() => project(LISBON.coords), []);

  // The visible slice of the MAP_WIDTH×MAP_HEIGHT coordinate space, shrunk
  // toward the centre as zoom increases. Both the SVG's viewBox and the
  // HTML marker overlay read off this same rectangle, so they can't drift
  // apart at any zoom level.
  const viewBox = useMemo(() => {
    const w = MAP_WIDTH / zoom;
    const h = MAP_HEIGHT / zoom;
    return { x: (MAP_WIDTH - w) / 2, y: (MAP_HEIGHT - h) / 2, w, h };
  }, [zoom]);

  function toPercent(point) {
    const x = point[0];
    const y = point[1];
    return [((x - viewBox.x) / viewBox.w) * 100, ((y - viewBox.y) / viewBox.h) * 100];
  }

  const mapAreaRef = useRef(null);
  useEffect(() => {
    const el = mapAreaRef.current;
    if (!el) return;
    function onWheel(e) {
      e.preventDefault();
      const direction = e.deltaY < 0 ? 1 : -1;
      setZoom((z) => clampZoom(z + direction * WHEEL_ZOOM_STEP));
    }
    // { passive: false } is the point: JSX onWheel installs a passive
    // listener, which silently ignores preventDefault() and lets the wheel
    // scroll the page instead of zooming the map.
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const routes = useMemo(
    () =>
      rows
        .filter((row) => row.ratings[monthKey] === "prime")
        .map((row) => {
          const xy = project(row.coords);
          const { d, labelAt } = arcPath(lisbonXY, xy);
          return { row, xy, d, labelAt, shoulder: row.shoulder.includes(monthKey) };
        }),
    [rows, monthKey, lisbonXY]
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none mb-3 sm:mb-4 overflow-x-auto">
        <PillToggle
          name="destinations-month"
          options={months.map((m) => ({ id: m.key, label: m.label }))}
          value={monthKey}
          onChange={setMonthKey}
        />
      </div>

      <div className="relative flex-1 min-h-0 rounded-card-lg border border-card">
        <div className="absolute inset-0 overflow-auto p-4 sm:p-8 flex flex-col">
          <div
            ref={mapAreaRef}
            className="relative w-full mx-auto flex-1 flex items-center"
            style={{ maxWidth: 1100 }}
          >
            <div className="relative w-full" style={{ paddingTop: `${(MAP_HEIGHT / MAP_WIDTH) * 100}%` }}>
              <svg
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                className="absolute inset-0 w-full h-full overflow-visible"
              >
                <path d={WORLD_LAND_PATH} className="fill-ink/[0.05] stroke-ink/[0.15]" strokeWidth="1.5" />

                {routes.map((route) => {
                  const dimmed = hoveredId !== null && hoveredId !== route.row.id;
                  return (
                    <path
                      key={route.row.id}
                      d={route.d}
                      fill="none"
                      className={dimmed ? "stroke-accent/20" : "stroke-accent/70"}
                      strokeWidth={hoveredId === route.row.id ? 2 : 1.25}
                      strokeDasharray={route.shoulder ? "5 4" : undefined}
                      style={{ transition: "stroke 120ms ease, stroke-width 120ms ease" }}
                    />
                  );
                })}

                {routes
                  .filter((route) => route.row.id === hoveredId)
                  .map((route) => (
                    <text
                      key={route.row.id}
                      x={route.labelAt[0]}
                      y={route.labelAt[1]}
                      textAnchor="middle"
                      className="fill-ink font-data font-bold"
                      style={{ fontSize: 10 }}
                    >
                      {route.row.travelLabel}
                    </text>
                  ))}

                <circle cx={lisbonXY[0]} cy={lisbonXY[1]} r={5} className="fill-ink" />
                <text
                  x={lisbonXY[0]}
                  y={lisbonXY[1] - 11}
                  textAnchor="middle"
                  className="fill-ink font-data font-bold"
                  style={{ fontSize: 11 }}
                >
                  {LISBON.name}
                </text>
              </svg>

              {routes.map((route) => {
                const dimmed = hoveredId !== null && hoveredId !== route.row.id;
                const pos = toPercent(route.xy);
                return (
                  <div
                    key={route.row.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-fast ease-smooth"
                    style={{ left: `${pos[0]}%`, top: `${pos[1]}%`, opacity: dimmed ? 0.35 : 1 }}
                    onMouseEnter={() => setHoveredId(route.row.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onPointerUp={(e) => {
                      // Only touch/pen: a real mouse already set hoveredId via
                      // onMouseEnter, and a click firing right after that
                      // would immediately toggle it back off mid-hover.
                      if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
                      setHoveredId((current) => (current === route.row.id ? null : route.row.id));
                    }}
                  >
                    <Tooltip content={cellTooltip(route.row, month)} position="top" wide>
                      <button
                        type="button"
                        className="relative flex items-center justify-center cursor-help focus-ring rounded-full p-1.5 -m-1.5"
                      >
                        <span
                          className={`block w-3 h-3 rounded-full ring-2 ring-page ${
                            route.shoulder ? "bg-page border-2 border-accent" : "bg-accent"
                          } ${hoveredId === route.row.id ? "scale-125" : ""} transition-transform duration-fast ease-smooth`}
                        />
                        {hoveredId === route.row.id && (
                          <span className="absolute top-full mt-0.5 left-1/2 -translate-x-1/2 font-data text-[9px] tracking-label uppercase text-ink whitespace-nowrap bg-page border border-card px-1.5 py-0.5 rounded-sm shadow-elevated">
                            {route.row.name}
                          </span>
                        )}
                      </button>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="flex-none font-data text-[10px] tracking-label-wide uppercase text-dim mt-3 text-center">
            {routes.length} prime spot{routes.length === 1 ? "" : "s"} in {month.label} — hollow
            marker / dashed line means shoulder season
          </p>
        </div>

        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex flex-col rounded-card-sm border border-card bg-page shadow-elevated overflow-hidden">
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z + BUTTON_ZOOM_STEP))}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom in"
            className="flex items-center justify-center w-8 h-8 text-ink hover:bg-ink-hover disabled:opacity-30 disabled:hover:bg-transparent transition-colors duration-fast ease-smooth border-b border-card focus-ring"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z - BUTTON_ZOOM_STEP))}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Zoom out"
            className="flex items-center justify-center w-8 h-8 text-ink hover:bg-ink-hover disabled:opacity-30 disabled:hover:bg-transparent transition-colors duration-fast ease-smooth focus-ring"
          >
            <Minus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
