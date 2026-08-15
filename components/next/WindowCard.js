"use client";

import { ChevronRight } from "lucide-react";
import { ScoreDial } from "../ui/ScoreDial";
import { DayTag } from "../ui/DayTag";
import { WindLine } from "../ui/WindLine";
import { CamFrame } from "../ui/CamFrame";

/**
 * One upcoming window: when, where, how good, how windy.
 *
 * The day leads, not the spot. A rider reading this screen has already decided
 * they are not going now, so the question is "which day am I keeping free" —
 * and the spot is the answer to a question they ask second. Days are spelled
 * out rather than abbreviated for the same reason: SAT beside a spot name reads
 * like a code.
 *
 * The score is the window's PEAK, not the score right now — that is the whole
 * difference between this screen and Now, and it is why the two can show
 * different numbers for the same beach without contradicting each other.
 *
 * On desktop the card gains the cam still above it, with the day tag on the
 * image. That is not decoration: three cards for three days at three beaches
 * are hard to tell apart as text, and the picture is what makes them places.
 */
export function WindowCard({
  spot,
  window: win,
  sport,
  dayLabel,
  isToday = false,
  highlight = false,
  withStill = false,
  onClick,
  onOpenCam,
  className = "",
}) {
  const dial = highlight ? 62 : 52;

  const body = (
    <>
      <div className="flex items-center gap-[8px]">
        <DayTag variant={isToday ? "today" : "muted"}>{dayLabel}</DayTag>
      </div>
      <div
        className={`font-headline font-bold tracking-display text-ink mt-1.5 truncate ${
          highlight ? "text-[18px]" : "text-[16px]"
        }`}
      >
        {spot.name}
      </div>
      <WindLine
        slot={win.peak}
        sport={sport}
        size={highlight ? 11.5 : 11}
        className="block text-faded-ink mt-[3px]"
      />
    </>
  );

  if (withStill) {
    return (
      <div
        className={`rounded-card-lg overflow-hidden border ${
          highlight
            ? "bg-accent-tint-card border-accent-border"
            : "bg-surface border-card"
        } ${className}`}
      >
        <CamFrame
          spot={spot}
          onFullscreen={onOpenCam}
          overlay={
            <span className="absolute top-[11px] left-3 pointer-events-none">
              <DayTag variant={isToday ? "today" : "overlay"} size="md">
                {dayLabel}
              </DayTag>
            </span>
          }
        />
        <button
          type="button"
          onClick={onClick}
          className={`w-full px-[17px] pt-[15px] pb-[17px] flex items-center gap-[15px] text-left focus-ring transition-colors duration-fast ease-smooth ${
            highlight ? "" : "hover:bg-ink-hover"
          }`}
        >
          <ScoreDial score={win.score} size={58} ring={9} value={20} showAll />
          <div className="flex-1 min-w-0">
            <div className="font-headline font-bold text-[19px] tracking-display text-ink truncate">
              {spot.name}
            </div>
            <WindLine
              slot={win.peak}
              sport={sport}
              size={12}
              className="block text-faded-ink mt-1"
            />
          </div>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-card-lg border px-4 text-left flex items-center gap-[15px] focus-ring transition-colors duration-fast ease-smooth ${
        highlight
          ? "bg-accent-tint-card border-accent-border py-[15px]"
          : "bg-surface border-card py-[14px] hover:bg-ink-hover"
      } ${className}`}
    >
      <ScoreDial
        score={win.score}
        size={dial}
        ring={highlight ? 9 : 10}
        value={highlight ? 21 : 18}
        showAll
      />
      <div className="flex-1 min-w-0">{body}</div>
      <ChevronRight
        size={highlight ? 18 : 16}
        className={`flex-none ${highlight ? "text-accent" : "text-dim"}`}
      />
    </button>
  );
}
