"use client";

import { ChevronRight } from "lucide-react";
import { ScoreDial } from "../ui/ScoreDial";
import { conditionSummary } from "../../lib/conditions";
import { relativeDay } from "../../lib/verdict";
import { dtf } from "../../lib/datetime";

const TZ = "Europe/Lisbon";
const time = (ms) =>
  dtf("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(ms));
const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * One upcoming window. Shared by Now and Next so the two lists stay identical.
 *
 * The score leads as its own column: down a ranked list it is the fastest thing
 * to compare, and the handoff's rule that the score is "demoted to a detail"
 * was about not making it the headline of a verdict — not about hiding it from
 * a list whose whole job is ranking.
 *
 * Lines stack rather than run together because this renders three-across on
 * desktop, where a single row of day + time + conditions truncates to nothing.
 */
export function WindowCard({ spot, window, sport, showSpot = true, highlight = false, onClick }) {
  const summary = conditionSummary(window.peak, sport, { gust: true });

  return (
    <button
      onClick={onClick}
      className={`w-full h-full text-left flex items-center gap-3 rounded-[15px] border px-[14px] py-[13px] focus-ring transition-colors duration-fast ease-smooth ${
        highlight
          ? "bg-accent-tint-card border-accent-border"
          : "bg-surface border-card hover:bg-ink-hover"
      }`}
    >
      <ScoreDial
        score={window.score}
        size="sm"
        showAll
        on={highlight ? "card" : "page"}
        className="flex-none"
      />

      <span className="flex-1 min-w-0">
        {/* Spot leads when there is one to name, day when there is not. Both on
            one line truncated to "Today · Marina de Ca…" three-across. */}
        <span className="block font-headline font-bold text-[15px] tracking-display text-ink truncate">
          {showSpot ? spot.name : capitalise(relativeDay(window.start))}
        </span>
        <span className="block font-data text-[10px] text-faded-ink mt-0.5 tabular-nums">
          {showSpot ? `${capitalise(relativeDay(window.start))} ` : ""}
          {time(window.start)}–{time(window.end)}
        </span>
        {summary && (
          <span className="block font-data text-[10px] text-faded-ink truncate">{summary}</span>
        )}
      </span>

      <ChevronRight size={16} className={`flex-none ${highlight ? "text-accent" : "text-dim"}`} />
    </button>
  );
}
