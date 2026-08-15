"use client";

import { SPORTS, useSport } from "./SportProvider";
import { SportBadge } from "../ui/SportBadge";

/**
 * The desktop sport selector: one 34px pill, three segments filling its height.
 *
 * Every control in the desktop header is a 34px pill with matching radius, and
 * the segmented group is the one that has to fill rather than sit inside — a
 * group with padding around its segments reads as three buttons in a box
 * instead of one control with three states.
 *
 * Active is the accent tint, not the solid fill: this sits next to the nav
 * tabs, which use the same tint for "you are here", and two different accent
 * treatments in one bar made the sport look like a fifth tab.
 */
export function SportSegmented({ className = "" }) {
  const { sport, setSport } = useSport();

  return (
    <div
      role="tablist"
      aria-label="Sport"
      className={`flex h-[34px] rounded-pill overflow-hidden border border-nav-border ${className}`}
    >
      {SPORTS.map((option) => {
        const active = option.id === sport;
        return (
          <button
            key={option.id}
            role="tab"
            aria-selected={active}
            onClick={() => setSport(option.id)}
            className={`flex items-center gap-1.5 h-full px-[15px] font-data text-[10.5px] tracking-[0.1em] transition-colors duration-fast ease-smooth focus-ring ${
              active ? "bg-accent-tint text-accent" : "text-dim hover:text-faded-ink"
            }`}
          >
            <SportBadge sport={option.id} size={15} className="text-current" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
