"use client";

import { ArrowUp, Users } from "lucide-react";
import { VERDICT, VERDICT_TONE } from "../../lib/verdict";
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
  riderCount,
  camSlot,
  onOpenCam,
  onOpenSpot,
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
          {spotName && (
            <span className="font-headline font-bold text-[17px] tracking-display text-ink truncate">
              <span className="font-data font-normal text-faded-ink text-[15px]">@ </span>
              {spotName}
            </span>
          )}
        </div>
        {/* The same control as Next, rather than a label that looked
            interactive and was not. Wrapped rather than given an onClick prop
            so the dropdown it opens — which renders inside it — is covered too;
            otherwise choosing a sport would also navigate away. */}
        <span className="flex-none" onClick={own()} onKeyDown={(e) => e.stopPropagation()}>
          <SportFilterChip />
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
            label="NOW"
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

      {camSlot && (
        <button
          onClick={own(onOpenCam)}
          aria-label="Open the live cam"
          className={`relative block w-full aspect-video rounded-card-sm overflow-hidden mt-[15px] border focus-ring ${
            isGo ? "border-accent-border" : "border-card"
          }`}
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

      {reason && (
        <div className="font-data text-[11px] text-faded-ink mt-3 uppercase">{reason}</div>
      )}
    </div>
  );
}
