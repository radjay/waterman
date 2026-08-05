"use client";

import { Users } from "lucide-react";
import { VERDICT, VERDICT_TONE } from "../../lib/verdict";
import { Badge } from "../ui/Badge";
import { ScoreDial } from "../ui/ScoreDial";
import { SportFilterChip } from "../sport/SportFilterChip";
import {
  LiveWindIndicator,
  extractWindguruStationId,
} from "../wind/LiveWindIndicator";
import { StationCard } from "./EvidenceStack";
import { WindReading } from "./WindReading";
import { primaryMetric } from "../../lib/conditions";
import { dtf } from "../../lib/datetime";

const TONE_TEXT = {
  accent: "text-accent",
  caution: "text-caution",
  dim: "text-dim",
};

/**
 * "GO" alone answered the question but not "where" — and the spot is free to
 * change hour to hour, so it belongs in the headline rather than buried in the
 * caption underneath.
 */
const VERDICT_WORD = {
  [VERDICT.GO]: "GO",
  [VERDICT.MARGINAL]: "MAYBE",
  [VERDICT.NO]: "NO GO",
};

/**
 * The answer to "can I go", before anything else.
 *
 * The verdict word carries the colour (accent / caution / dim). The card shell
 * stays neutral — tinting the whole box for MAYBE/GO made the accent fight the
 * score dial and the wind reading for attention.
 *
 * Wind and score live in the timeslot strip, not a separate hero row: one place
 * to compare now vs later. No direction arrow — compass text is enough.
 *
 * The card as a whole leads to this spot's week. A div rather than a button:
 * the sport chip and the cam are their own controls inside it, and a button
 * inside a button is invalid HTML that React fails hydration on.
 */
export function VerdictCard({
  verdict = VERDICT.NO,
  sport = "wingfoil",
  spotName,
  // score/metric kept for callers; wind+score render per-slot in Trajectory.
  score: _score,
  metric: _metric,
  liveReportUrl,
  reason,
  reasoning,
  station = null,
  trajectory = [],
  elsewhereToday = 0,
  riderCount,
  camSlot,
  compactCam = false,
  onOpenCam,
  onOpenSpot,
  onSeeElsewhere,
}) {
  const tone = VERDICT_TONE[verdict] || "dim";
  const isGo = verdict === VERDICT.GO;
  const isMarginal = verdict === VERDICT.MARGINAL;

  // Controls inside the card have to claim their own clicks, or every one of
  // them would also navigate away to the week.
  const own = (handler) => (event) => {
    event.stopPropagation();
    handler?.();
  };

  return (
    <div
      role={onOpenSpot ? "button" : undefined}
      tabIndex={onOpenSpot ? 0 : undefined}
      aria-label={onOpenSpot && spotName ? `See the week at ${spotName}` : undefined}
      onClick={onOpenSpot}
      onKeyDown={(e) => {
        if (!onOpenSpot) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenSpot();
        }
      }}
      className={`rounded-card-xl px-4 py-[15px] border bg-surface border-card ${
        onOpenSpot ? "cursor-pointer focus-ring" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Mobile: spot under the verdict so "@ Marina de Cascais" is not
            truncated to "Mar…". Desktop: same baseline as before. */}
        <div className="flex flex-col gap-1 min-w-0 md:flex-row md:items-baseline md:gap-2.5">
          <span
            className={`font-headline font-extrabold text-[46px] leading-[0.86] tracking-display-tighter whitespace-nowrap ${TONE_TEXT[tone]}`}
          >
            {VERDICT_WORD[verdict] ?? verdict}
          </span>
          {spotName && (
            <span className="font-headline font-bold text-[15px] md:text-[17px] tracking-display text-ink truncate min-w-0">
              <span className="font-data font-normal text-faded-ink text-[14px] md:text-[15px]">@ </span>
              {spotName}
            </span>
          )}
        </div>
        {/* Own click stop so choosing a sport does not also open the week. */}
        <span
          className="flex-none"
          onClick={own()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <SportFilterChip />
        </span>
      </div>

      {/* GO NOW: answer → when today → why → live numbers → glance at cam. */}
      {trajectory.length > 0 && (
        <Trajectory slots={trajectory} sport={sport} />
      )}

      {(reasoning || reason) && (
        <p
          className="mt-3 text-[13px] leading-[1.45] text-faded-ink line-clamp-3"
          onClick={own()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {reasoning || reason}
        </p>
      )}

      {station && (
        <div
          className="mt-3"
          onClick={own()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <StationCard station={station} />
        </div>
      )}

      {camSlot && (
        <button
          onClick={own(onOpenCam)}
          aria-label="Open the live cam"
          // Capped height: confirm the scene without scrolling through a
          // full-bleed beach before "if not now". Fullscreen is one tap away.
          className={`relative block w-full max-h-[min(36vh,280px)] rounded-card-sm overflow-hidden mt-3 border focus-ring border-card ${
            compactCam ? "aspect-[21/6]" : "aspect-video"
          }`}
        >
          {camSlot}
          <span className="absolute top-[9px] left-[9px] flex items-center gap-[7px] pointer-events-none">
            <LiveWindIndicator
              stationId={extractWindguruStationId(liveReportUrl)}
              compact
              fallback={
                <Badge variant="live">
                  <span className="w-1.5 h-1.5 rounded-full bg-page" />
                  LIVE
                </Badge>
              }
            />
            {riderCount && (
              <Badge variant="accent-solid">
                <Users size={11} />
                {riderCount.count}
              </Badge>
            )}
          </span>
        </button>
      )}

      {!isGo && !isMarginal && elsewhereToday > 0 && onSeeElsewhere && (
        <button
          onClick={own(onSeeElsewhere)}
          className="mt-3 text-[13px] text-accent focus-ring hover:underline"
        >
          {elsewhereToday} window{elsewhereToday === 1 ? "" : "s"} elsewhere today &rarr;
        </button>
      )}
    </div>
  );
}

const TZ = "Europe/Lisbon";
const hour = (ms) =>
  dtf("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(ms));

/**
 * Best scored slot among those shown. Ties go to the earliest slot so "BEST
 * TIME" points at when conditions first peak, not the last tied hour.
 */
function bestSlotIndex(slots) {
  let best = -1;
  let bestScore = -Infinity;
  slots.forEach((slot, i) => {
    if (slot.score === null || slot.score === undefined) return;
    if (slot.score > bestScore) {
      bestScore = slot.score;
      best = i;
    }
  });
  return best;
}

/**
 * Remaining slots today from NOW (max 4).
 *
 * Mobile: 2×2 grid so BEST is never off-screen in a carousel.
 * Desktop (md+): one row of equal columns filling the verdict card.
 */
function Trajectory({ slots, sport }) {
  const bestIdx = bestSlotIndex(slots);
  const cols = Math.min(Math.max(slots.length, 1), 4);
  const mdCols =
    cols === 1
      ? "md:grid-cols-1"
      : cols === 2
        ? "md:grid-cols-2"
        : cols === 3
          ? "md:grid-cols-3"
          : "md:grid-cols-4";

  return (
    <div
      className={`mt-3.5 grid grid-cols-2 gap-1.5 ${mdCols}`}
      aria-label="How the next hours look"
    >
      {slots.map((slot, i) => {
        const scored = slot.score !== null && slot.score !== undefined;
        const isBest = i === bestIdx && scored;
        const metric = primaryMetric(slot, sport);
        return (
          <div
            key={slot.timestamp}
            className={`flex flex-col rounded-card-sm border px-2.5 py-2.5 min-w-0 md:px-[18px] md:py-3 ${
              isBest
                ? "border-accent-border bg-accent-tint-card"
                : "border-card bg-surface"
            }`}
          >
            <div className="flex items-start justify-between gap-1 min-h-[16px]">
              <span
                className={`font-data text-[11px] md:text-[13px] font-bold tracking-label tabular-nums leading-none ${
                  i === 0 ? "text-accent" : "text-faded-ink"
                }`}
              >
                {i === 0 ? "NOW" : hour(slot.timestamp)}
              </span>
              {isBest && (
                <Badge
                  variant="live"
                  className="!px-1.5 !py-0 !text-[8px] md:!px-2 md:!py-0.5 md:!text-[9px] !leading-none flex-none"
                >
                  BEST
                </Badge>
              )}
            </div>
            {/* items-center: dial sits on the vertical middle of the wind stack. */}
            <div className="mt-2 flex items-center justify-between gap-1.5 min-w-0 md:mt-2.5 md:gap-2">
              <WindReading metric={metric} size="md" />
              {scored ? (
                <>
                  {/* xs on phones; sm once the row gives each card real width. */}
                  <span className="flex-none md:hidden">
                    <ScoreDial
                      score={slot.score}
                      size="xs"
                      showAll
                      on={isBest ? "card" : "page"}
                    />
                  </span>
                  <span className="hidden md:flex flex-none">
                    <ScoreDial
                      score={slot.score}
                      size="sm"
                      showAll
                      on={isBest ? "card" : "page"}
                    />
                  </span>
                </>
              ) : (
                <span className="font-data font-bold text-[16px] text-dim tabular-nums flex-none">
                  —
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
