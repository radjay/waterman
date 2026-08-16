"use client";

import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import { ScoreDial, ScoreDialEmpty } from "../ui/ScoreDial";
import { DayTrack } from "../ui/DayTrack";
import { DayChartPanel } from "../chart/DayChartPanel";
import { CamFrame } from "../ui/CamFrame";
import { isWindSport } from "../sport/SportProvider";
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
 * Expanded, it becomes the same three-band chart as Now. Future days stay
 * forecast-only (no station, no hover). Today alone reuses Now's live station
 * traces and column hover. On mobile the spot cam sits above the charts; on
 * desktop the cam is omitted so the score rows stay a capped column.
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
  reportHref = null,
  /** SCORE tip with AI timeslot verdict (Report expanded days). */
  slotVerdict = false,
  nowMs = Date.now(),
  desktop = false,
  /** Today only — same pack.station Now's wind band uses. */
  station = null,
  /** Spot for CamFrame / fullscreen (Today only). */
  spot = null,
  onOpenCam = null,
  isToday = false,
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

  // Live wind + hover only on Today — future days have nothing live to plot.
  const liveToday = Boolean(isToday && open);
  const liveStation = liveToday && isWindSport(sport) ? station : null;
  // Mobile Today keeps the cam above the charts; desktop drops it so the day
  // rows stay a readable score column instead of stretching beside a video.
  const showCam = liveToday && spot && !desktop;
  const camStation = isWindSport(sport) ? station : null;

  const chartPanel = chart.hasSlots ? (
    <DayChartPanel
      chart={chart}
      sport={sport}
      station={liveStation}
      tides={tides}
      nowMs={nowMs}
      variant={desktop ? "desktop" : "mobile"}
      showWash={liveToday}
      showNow={liveToday}
      showHover={liveToday}
      reportHref={reportHref}
      slotVerdict={slotVerdict}
      // Short report bands — fewer y ticks than the tall Now chart.
      maxLines={3}
      bandHeights={
        desktop
          ? { wind: 52, waves: 36, score: 40 }
          : { wind: 66, waves: 46, score: 44 }
      }
    />
  ) : null;

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

      {!open && (
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
      )}

      {open && chart.hasSlots && (
        <div className="border-t border-accent-border mt-[10px] pt-[11px] md:mt-3 md:pt-[13px]">
          {showCam ? (
            <div className="flex flex-col gap-3">
              {/* Inset, not full-bleed — this is a day card, not the Now hero. */}
              <CamFrame
                spot={spot}
                station={camStation}
                radius={12}
                onFullscreen={onOpenCam ? () => onOpenCam(spot) : undefined}
                className="border border-card"
              />
              {chartPanel}
            </div>
          ) : (
            chartPanel
          )}
        </div>
      )}
    </div>
  );
}
