"use client";

import { ScoreDial } from "../ui/ScoreDial";
import { WindLine } from "../ui/WindLine";
import { isWindSport } from "../sport/SportProvider";

/**
 * Score, name, reading — the one list row the whole app uses.
 *
 * The picker sheet, the compact spot cards under the Now hero and the Live
 * identity rows are all this shape, and they were three near-identical blocks
 * of markup that drifted on font size, gap and dial diameter. One component,
 * three sizes.
 *
 * The dial leads because the question is always "which of these", and a column
 * of numbers is the only way to answer that at a glance. The reading follows
 * the name rather than the dial so the two things a rider compares — score and
 * wind — are not the same column.
 *
 * A spot with nothing to say still gets a row: dimmed, with a dashed ring and
 * whatever reading exists. Dropping it would make "no wind at Guincho" look
 * identical to "Guincho is not in your list".
 */
const SIZES = {
  sm: { dial: 38, name: 16, line: 10.5, gap: 13, pad: "11px 16px" },
  md: { dial: 42, name: 16, line: 10.5, gap: 12 },
  lg: { dial: 44, name: 16, line: 10.5, gap: 13 },
  xl: { dial: 58, name: 19, line: 12, gap: 15 },
};

export function SpotRow({
  spot,
  score,
  sport,
  slot,
  station,
  suffix,
  size = "md",
  dim = false,
  /**
   * Which end the dial sits on. Leading in a list, where the scores form a
   * scannable column; trailing on a card, where the picture leads and the score
   * is the verdict at the end of the sentence.
   */
  dialSide = "leading",
  leading = null,
  trailing = null,
  onClick,
  className = "",
  style,
}) {
  const s = SIZES[size] ?? SIZES.md;

  // The live station is the better answer when it exists; the forecast slot is
  // the fallback. Never both — two wind readings on one row is a puzzle.
  //
  // Surf never takes the station. The sensors measure wind, and for surf wind
  // is the quality note rather than the answer — a live wind reading where the
  // swell should be says the wrong thing louder than the right one.
  const live = isWindSport(sport) ? station : null;
  const metric = live
    ? {
        value: Math.round(live.speed),
        unit: "kn",
        secondary: Number.isFinite(live.gust) ? `(${Math.round(live.gust)}*)` : null,
        directionLabel: live.directionLabel ?? null,
      }
    : undefined;

  // Div + role=button so a CamThumb (also a control) can sit in `leading`
  // without nesting interactive elements.
  return (
    <div
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`w-full flex items-center text-left ${onClick ? "focus-ring cursor-pointer" : ""} ${
        dim ? "opacity-60" : ""
      } ${className}`}
      style={{ gap: s.gap, padding: s.pad, ...style }}
    >
      {leading}
      {dialSide === "leading" && <ScoreDial score={score ?? null} size={s.dial} showAll />}
      <span className="flex-1 min-w-0">
        <span
          className={`block font-headline font-bold tracking-display truncate ${
            dim ? "text-faded-ink" : "text-ink"
          }`}
          style={{ fontSize: s.name }}
        >
          {spot?.name}
        </span>
        <WindLine
          slot={slot}
          sport={sport}
          metric={metric}
          suffix={suffix}
          size={s.line}
          className={`block mt-[3px] ${dim ? "text-dim" : "text-faded-ink"}`}
        />
      </span>
      {dialSide === "trailing" && <ScoreDial score={score ?? null} size={s.dial} showAll />}
      {trailing}
    </div>
  );
}
