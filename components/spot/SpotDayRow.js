"use client";

import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import { ScoreDial, ScoreDialEmpty } from "../ui/ScoreDial";
import { DayTrack } from "../ui/DayTrack";
import { DayChartPanel } from "../chart/DayChartPanel";
import { primaryMetric } from "../../lib/conditions";
import { dtf } from "../../lib/datetime";
import { TZ } from "../../lib/dayChart";

/**
 * One day at one beach, collapsed to a line and expanded to a chart.
 *
 * Collapsed, the row answers the two questions a rider has about a future day —
 * how good and when — in one line and one bar: "Saturday, 64, 19:00-22:00,
 * 12 kn N", with the bar showing where those hours sit against the whole day.
 * That is enough to decide whether to open it.
 *
 * Expanded, it becomes the same three-band chart as Now, minus the station.
 * This is a FORECAST screen; there is no live reading for Tuesday, and drawing
 * a station trace on today's row only would make today look like a different
 * kind of thing from the rest of the list. Live data is one tap away behind the
 * LIVE button, which is why that button exists.
 */
const clock = (ms) =>
  dtf("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(ms));

export function SpotDayRow({
  day,
  sport,
  chart,
  tides,
  open,
  onToggle,
  onLive,
  nowMs = Date.now(),
  desktop = false,
  className = "",
}) {
  const Chevron = open ? ChevronUp : ChevronDown;

  // The best window, not the first: a day with a marginal dawn slot and a
  // strong afternoon should read as the afternoon. Spanning first-start to
  // last-end instead would invent one long window across the gap between them.
  const best = day.windows.reduce(
    (winner, w) => (!winner || (w.score ?? -1) > (winner.score ?? -1) ? w : winner),
    null
  );
  const metric = primaryMetric(best?.peak ?? day.slots[0], sport);

  // Clamped to the last hour the chart draws. A window whose final slot opens
  // at 22:00 technically runs to 01:00, and "16:00–01:00" reads as a session
  // that ends after midnight rather than as the end of the evening.
  const shownEnd = best ? Math.min(best.end, day.dayStart + chart.lastHour * 3600000) : null;
  const range = best
    ? `${clock(best.start)}–${clock(Math.max(shownEnd, best.start + 3600000))}${
        day.windows.length > 1 ? ` +${day.windows.length - 1}` : ""
      }`
    : "no window";

  return (
    <div
      className={`rounded-card border transition-colors duration-base ease-smooth ${
        open ? "border-accent-border bg-accent-tint-card" : "border-card bg-surface"
      } ${desktop ? "px-[14px] py-2" : "px-3 py-[7px]"} ${className}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`w-full flex items-center text-left focus-ring rounded-[8px] ${
          desktop ? "gap-[15px]" : "gap-3"
        }`}
      >
        {day.peak === null ? (
          <ScoreDialEmpty size={desktop ? 46 : 40} />
        ) : (
          <ScoreDial
            score={day.peak}
            size={desktop ? 46 : 40}
            ring={desktop ? 10 : 11}
            value={desktop ? 16 : 14}
            showAll
          />
        )}

        <span className="flex-1 min-w-0">
          <span
            className={`block font-headline font-bold tracking-display text-ink truncate ${
              desktop ? "text-[18px]" : "text-[16px]"
            }`}
          >
            {day.label}
          </span>
          {/* Hours and the leading metric, one line. The wind GUST is
              deliberately dropped: with the LIVE pill beside it the line does
              not fit 390px, and it is the one number the expanded chart already
              draws — every column is a band from base to gust. Everything else
              stays, including the swell period, which has no other home. */}
          <span
            className={`block font-data text-faded-ink mt-[3px] truncate tabular-nums ${
              desktop ? "text-[11.5px]" : "text-[10.5px]"
            }`}
          >
            {range}
            {metric?.value !== undefined && metric?.value !== null && (
              <>
                {" · "}
                {metric.value} {metric.unit}
                {metric.directionLabel ? ` ${metric.directionLabel}` : ""}
                {metric.secondary && !metric.secondary.startsWith("(")
                  ? ` ${metric.secondary}`
                  : ""}
              </>
            )}
          </span>
        </span>

        {open && onLive && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onLive();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onLive();
              }
            }}
            className={`flex-none flex items-center gap-1.5 rounded-pill bg-accent text-page font-data font-bold tracking-[0.1em] focus-ring ${
              desktop ? "px-3.5 py-[7px] text-[10.5px]" : "px-3 py-[7px] text-[10px]"
            }`}
          >
            <Zap size={13} />
            LIVE
          </span>
        )}

        <Chevron
          size={desktop ? 18 : 16}
          className={`flex-none ${open ? "text-accent" : "text-dim"}`}
        />
      </button>

      <DayTrack
        windows={day.windows}
        dayStart={day.dayStart}
        firstHour={chart.firstHour}
        lastHour={chart.lastHour}
        nowMs={nowMs}
        height={desktop ? 7 : 5}
        radius={desktop ? 4 : 3}
        className="mt-[6px]"
      />

      {open && chart.hasSlots && (
        <div className="border-t border-accent-border mt-[10px] pt-[11px] md:mt-3 md:pt-[13px]">
          <DayChartPanel
            chart={chart}
            sport={sport}
            station={null}
            tides={tides}
            nowMs={nowMs}
            variant={desktop ? "desktop" : "mobile"}
            showWash={false}
            showNow={false}
            bandHeights={
              desktop ? { wind: 52, waves: 36, score: 40 } : { wind: 66, waves: 46, score: 44 }
            }
          />
        </div>
      )}
    </div>
  );
}
