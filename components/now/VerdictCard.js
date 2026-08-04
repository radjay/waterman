"use client";

import { ArrowUp, Users } from "lucide-react";
import { VERDICT, VERDICT_TONE } from "../../lib/verdict";
import { Badge } from "../ui/Badge";
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
 */
export function VerdictCard({
  verdict = VERDICT.NO,
  sport = "wingfoil",
  spotName,
  metric,
  liveReportUrl,
  reason,
  riderCount,
  camSlot,
  onWatchCam,
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

  return (
    <div className={`rounded-card-xl px-4 py-[15px] border ${cardTone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className={`font-headline font-extrabold text-[46px] leading-[0.86] tracking-display-tighter ${TONE_TEXT[tone]}`}
          >
            {VERDICT_WORD[verdict] ?? verdict}
          </div>
          {spotName && (
            <div className="font-headline font-bold text-[17px] tracking-display text-ink mt-1.5 truncate">
              <span className="font-data font-normal text-faded-ink text-[15px]">@ </span>
              {spotName}
            </div>
          )}
        </div>
        {/* The same control as Next, rather than a label that looked
            interactive and was not. */}
        <SportFilterChip className="flex-none" />
      </div>

      {metric && (
        <div className="flex items-end gap-[11px] mt-[13px]">
          {/* Direction leads the reading — it is the thing you check first, and
              sitting left of the number keeps it clear of the unit. */}
          {metric.directionDegrees !== null && metric.directionDegrees !== undefined && (
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
          <div className="flex items-baseline gap-1.5">
            <span className="font-data font-bold text-[44px] leading-[0.86] text-ink tabular-nums">
              {metric.value}
            </span>
            <span className="font-data font-bold text-[20px] text-ink">{metric.unit}</span>
            {metric.directionLabel && (
              <span className="font-data text-[15px] text-ink">{metric.directionLabel}</span>
            )}
          </div>
          {metric.secondary && (
            <span className="font-data text-[12px] text-faded-ink pb-1.5">
              {metric.secondary}
            </span>
          )}
        </div>
      )}

      {(metric?.tertiary || liveReportUrl) && (
        <div className="flex items-center gap-2.5 mt-2">
          {metric?.tertiary && (
            <span className="font-data text-[11px] text-faded-ink">{metric.tertiary}</span>
          )}
          {/* The station turns the forecast into a fact. It renders nothing at
              all when the reading is missing or stale, so it can sit here
              unconditionally without leaving a gap. */}
          <LiveWindIndicator stationId={extractWindguruStationId(liveReportUrl)} label="LIVE" />
        </div>
      )}

      {camSlot && (
        <button
          onClick={onWatchCam}
          aria-label="Watch the live cam"
          className={`relative block w-full aspect-video rounded-card-sm overflow-hidden mt-[15px] border focus-ring ${
            isGo ? "border-accent-border" : "border-card"
          }`}
        >
          {camSlot}
          <span className="absolute top-[9px] left-[9px] flex items-center gap-[7px] pointer-events-none">
            <Badge variant="live">
              <span className="w-1.5 h-1.5 rounded-full bg-page" />
              LIVE
            </Badge>
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
