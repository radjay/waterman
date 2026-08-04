"use client";

import { ArrowUp, ChevronRight, Users } from "lucide-react";
import { VERDICT, VERDICT_TONE, relativeDay } from "../../lib/verdict";
import { Badge } from "../ui/Badge";
import { ScoreDial } from "../ui/ScoreDial";
import { SportFilterChip } from "../sport/SportFilterChip";
import {
  LiveWindIndicator,
  extractWindguruStationId,
} from "../wind/LiveWindIndicator";

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
 * GO paints in the accent, MAYBE in the accent-2 hue, NO GO in dim. On a flat
 * day — the common case, not an edge case — the card withholds the accent
 * entirely so the only cyan on screen belongs to the next windows below.
 *
 * The card as a whole leads to this spot's week. A div rather than a button:
 * the sport chip and the cam are their own controls inside it, and a button
 * inside a button is invalid HTML that React fails hydration on.
 */
export function VerdictCard({
  verdict = VERDICT.NO,
  sport = "wingfoil",
  spotName,
  score,
  metric,
  liveReportUrl,
  reason,
  reasoning,
  trajectory = [],
  better,
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

  // The handoff tints the verdict card; the bad-day stress test says accent is
  // withheld from everything except the one thing worth acting on. Both hold if
  // the tint follows the verdict: accent for GO, the accent-2 hue for MAYBE,
  // and a neutral card for NO GO — where the accent belongs to the next windows
  // further down instead.
  const cardTone = isGo
    ? "bg-accent-tint-card border-accent-border"
    : isMarginal
      ? "bg-caution/10 border-caution/30"
      : "bg-surface border-card";
  const ringTone = isGo
    ? "border-accent-border text-accent"
    : isMarginal
      ? "border-caution/40 text-caution"
      : "border-card text-faded-ink";

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
      className={`rounded-card-xl px-4 py-[15px] border ${cardTone} ${
        onOpenSpot ? "cursor-pointer focus-ring" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Verdict and spot share a baseline. Stacked, the spot read as a
            caption for the word above it rather than as its other half. */}
        <div className="flex items-baseline gap-2.5 min-w-0">
          <span
            className={`font-headline font-extrabold text-[46px] leading-[0.86] tracking-display-tighter whitespace-nowrap ${TONE_TEXT[tone]}`}
          >
            {VERDICT_WORD[verdict] ?? verdict}
          </span>
          {/* min-w-0 as well as truncate: a flex item's min-width is auto, so
              without it the span refuses to shrink below the full spot name and
              the card's min-content width blows past a narrow phone. */}
          {spotName && (
            <span className="font-headline font-bold text-[17px] tracking-display text-ink truncate min-w-0">
              <span className="font-data font-normal text-faded-ink text-[15px]">@ </span>
              {spotName}
            </span>
          )}
        </div>
        {/* The same control as Next, rather than a label that looked
            interactive and was not. Wrapped rather than given an onClick prop
            so the dropdown it opens — which renders inside it — is covered too;
            otherwise choosing a sport would also navigate away. */}
        <span className="flex-none flex items-center gap-1.5">
          <span onClick={own()} onKeyDown={(e) => e.stopPropagation()}>
            <SportFilterChip />
          </span>
          {/* The whole card navigates to this spot's week. Without a mark
              nothing said so and nobody found it. */}
          {onOpenSpot && <ChevronRight size={16} className="text-dim" aria-hidden="true" />}
        </span>
      </div>

      {(metric || (score !== null && score !== undefined)) && (
        <div className="flex items-end gap-[11px] mt-[13px]">
          {/* Direction leads the reading — it is the thing you check first, and
              sitting left of the number keeps it clear of the unit. */}
          {metric?.directionDegrees !== null && metric?.directionDegrees !== undefined && (
            <div
              className={`flex-none w-[34px] h-[34px] mb-1 rounded-full border flex items-center justify-center ${ringTone}`}
              // Matches components/ui/Arrow: rotate by the raw stored bearing.
              // The from/to conversion lives in the LABEL, not the glyph.
              style={{ transform: `rotate(${metric.directionDegrees}deg)` }}
              aria-hidden="true"
            >
              <ArrowUp size={16} />
            </div>
          )}
          {metric && (
            <div className="flex items-baseline gap-1.5">
              <span className="font-data font-bold text-[44px] leading-[0.86] text-ink tabular-nums">
                {metric.value}
              </span>
              <span className="font-data font-bold text-[20px] text-ink">{metric.unit}</span>
              {metric.directionLabel && (
                <span className="font-data text-[15px] text-ink">{metric.directionLabel}</span>
              )}
            </div>
          )}
          {metric?.secondary && (
            <span className="font-data text-[12px] text-faded-ink pb-1.5">
              {metric.secondary}
            </span>
          )}
          {/* On the reading's own row, where it reads as one more number about
              right now rather than a badge floating in the corner. */}
          <ScoreDial
            score={score}
            size="md"
            showAll
            label="SCORE"
            on={isGo || isMarginal ? "card" : "page"}
            className="ml-auto"
          />
        </div>
      )}

      {/* The live reading is on the cam overlay; a second copy of it directly
          above the same picture said the same thing twice. */}
      {metric?.tertiary && (
        <div className="font-data text-[11px] text-faded-ink mt-2">{metric.tertiary}</div>
      )}

      {trajectory.length > 1 && <Trajectory slots={trajectory} tone={tone} />}

      {/* The reason, then the scorer's own sentence. Both were previously at
          the bottom of the card in 11px mono — the two strings that actually
          decide the question, set smaller than everything that does not. */}
      {(reason || reasoning) && (
        <div className="mt-3">
          {reason && (
            <p className={`text-[14px] leading-[1.45] font-medium ${TONE_TEXT[tone]}`}>{reason}</p>
          )}
          {reasoning && (
            <p className="text-[13px] leading-[1.5] text-faded-ink mt-1">{reasoning}</p>
          )}
        </div>
      )}

      {/* A materially better window later is the thing most likely to change
          the answer, so it goes with the verdict rather than into the list. */}
      {better && (
        <p className="text-[13px] leading-[1.45] text-ink mt-2.5">
          {isGo ? "Better still: " : "Better: "}
          <span className="font-bold">{Math.round(better.window.score)}</span>
          {/* The headline already named this spot; repeating it reads as a
              different beach at a glance. */}
          {better.spot.name === spotName ? "" : ` at ${better.spot.name}`}{" "}
          {relativeDay(better.window.start)}.
        </p>
      )}

      {/* "Nothing at my three beaches" and "nothing on the coast" are different
          decisions. Saying which turns the app's most common state from a dead
          end into a next step. */}
      {!isGo && !isMarginal && elsewhereToday > 0 && onSeeElsewhere && (
        <button
          onClick={own(onSeeElsewhere)}
          className="mt-2.5 text-[13px] text-accent focus-ring hover:underline"
        >
          {elsewhereToday} window{elsewhereToday === 1 ? "" : "s"} elsewhere today &rarr;
        </button>
      )}

      {camSlot && (
        <button
          onClick={own(onOpenCam)}
          aria-label="Open the live cam"
          // Aspect ratio, not a fixed height: a 21:9 strip still crops the
          // frame sensibly, and the cam stays one tap from full screen.
          className={`relative block w-full rounded-card-sm overflow-hidden mt-[15px] border focus-ring ${
            compactCam ? "aspect-[21/6]" : "aspect-video"
          } ${isGo ? "border-accent-border" : "border-card"}`}
        >
          {camSlot}
          <span className="absolute top-[9px] left-[9px] flex items-center gap-[7px] pointer-events-none">
            {/* What the spot reads right now beats a chip that only says the
                video is live — the video being live is already obvious. Falls
                back to that chip when the station has nothing usable. */}
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
    </div>
  );
}

const TZ = "Europe/Lisbon";
const hour = (ms) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(
    new Date(ms)
  );

/**
 * This slot and the next two.
 *
 * Now speaks for a three-hour block as if it were an instant — at 14:50 the
 * rider is being told about 12:00–15:00, which is largely over. Whether the
 * window is building or dying changes the decision as much as the verdict word
 * does, and until now it existed only inside a prose sentence.
 *
 * Deliberately not a chart. Three labelled numbers read faster than a sparkline
 * at this size, and they degrade honestly when the scorer has nothing for a
 * slot: "—" says "not scored", where a flat line would say "zero".
 */
function Trajectory({ slots, tone }) {
  return (
    <div className="flex items-stretch gap-1.5 mt-3.5" aria-label="How the next hours look">
      {slots.map((slot, i) => {
        const scored = slot.score !== null && slot.score !== undefined;
        return (
          <div
            key={slot.timestamp}
            className={`flex-1 rounded-card-sm border px-2.5 py-2 ${
              i === 0 ? "border-card bg-ink-hover" : "border-card"
            }`}
          >
            <div className="font-data text-[9px] tracking-label text-dim">
              {i === 0 ? "NOW" : hour(slot.timestamp)}
            </div>
            <div
              className={`font-data font-bold text-[17px] tabular-nums leading-none mt-1 ${
                scored ? (i === 0 ? TONE_TEXT[tone] : "text-ink") : "text-dim"
              }`}
            >
              {scored ? Math.round(slot.score) : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
