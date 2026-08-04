"use client";

import { ArrowUp, Users, Waves, Wind } from "lucide-react";
import { VERDICT, VERDICT_TONE } from "../../lib/verdict";
import { sportMeta } from "../sport/SportProvider";

const TONE_TEXT = {
  accent: "text-accent",
  marginal: "text-marginal",
  dim: "text-dim",
};

/**
 * The answer to "can I go", before anything else.
 *
 * GO paints in the accent, MARGINAL in the accent-2 hue, NO in dim. On a flat
 * day — which is the common case, not an edge case — the card withholds the
 * accent entirely so the only cyan on screen belongs to the next window.
 */
export function VerdictCard({
  verdict = VERDICT.NO,
  sport = "wingfoil",
  speed,
  gust,
  directionLabel,
  directionDegrees,
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
  // the tint follows the verdict: accent for GO, the accent-2 hue for MARGINAL,
  // and a neutral card for NO — where the accent belongs to the next-window
  // card further down instead.
  const cardTone = isGo
    ? "bg-accent-tint-card border-accent-border"
    : isMarginal
      ? "bg-marginal/10 border-marginal/30"
      : "bg-surface border-card";
  const chipTone = isGo
    ? "bg-accent-tint text-accent"
    : isMarginal
      ? "bg-marginal/15 text-marginal"
      : "bg-ink/5 text-faded-ink";
  const ringTone = isGo
    ? "border-accent-border text-accent"
    : isMarginal
      ? "border-marginal/40 text-marginal"
      : "border-card text-faded-ink";
  const meta = sportMeta(sport);
  // Surfing is not a wind sport; the chip should not claim it is.
  const SportIcon = sport === "surfing" ? Waves : Wind;

  return (
    <div
      className={`rounded-card-xl px-4 py-[15px] border ${cardTone}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={`font-headline font-extrabold text-[52px] leading-[0.82] tracking-display-tighter ${TONE_TEXT[tone]}`}
        >
          {verdict}
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-pill px-[11px] py-1.5 font-data text-[10px] tracking-label ${chipTone}`}
        >
          <SportIcon size={12} />
          {meta.label}
        </div>
      </div>

      {speed !== null && speed !== undefined && (
        <div className="flex items-end gap-[9px] mt-[11px]">
          <div className="font-data font-bold text-[44px] leading-[0.86] text-ink tabular-nums">
            {Math.round(speed)}
          </div>
          <div className="pb-[3px]">
            <div className="font-data text-[13px] text-ink leading-[1.2]">
              kn {directionLabel}
            </div>
            {gust !== null && gust !== undefined && (
              <div className="font-data text-[11px] text-faded-ink leading-[1.2]">
                ({Math.round(gust)}*)
              </div>
            )}
          </div>
          {directionDegrees !== null && directionDegrees !== undefined && (
            <div
              className={`ml-auto w-[34px] h-[34px] rounded-full border flex items-center justify-center ${ringTone}`}
              // Matches components/ui/Arrow: rotate by the raw stored bearing.
              // The +180 "from -> to" conversion lives in the LABEL
              // (getDisplayWindDirection), not the glyph. Doing it in both
              // places would point the arrow backwards relative to every other
              // direction indicator in the app.
              style={{ transform: `rotate(${directionDegrees}deg)` }}
              aria-hidden="true"
            >
              <ArrowUp size={16} />
            </div>
          )}
        </div>
      )}

      {camSlot && (
        <button
          onClick={onWatchCam}
          className={`relative block w-full aspect-video rounded-card-sm overflow-hidden mt-[15px] border focus-ring ${
            isGo ? "border-accent-border" : "border-card"
          }`}
        >
          {camSlot}
          <span className="absolute top-[9px] left-[9px] flex items-center gap-[7px] pointer-events-none">
            <span className="flex items-center gap-1.5 bg-accent text-page rounded-pill px-2.5 py-[5px] font-data text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-page" />
              LIVE
            </span>
            {riderCount && (
              <span className="flex items-center gap-[5px] bg-page border border-accent-border rounded-pill px-2.5 py-[5px] font-data text-[10px] text-accent">
                <Users size={11} />
                {riderCount.count}
              </span>
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
