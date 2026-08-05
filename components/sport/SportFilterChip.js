"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SPORTS, useSport } from "./SportProvider";
import { SportBadge } from "../ui/SportBadge";

/**
 * The compact sport control used on Next and Cams.
 *
 * The handoff uses the three-segment selector only on Now, where the sport is
 * the screen's primary context. On the list screens it is a chip that opens the
 * choice on tap — the segmented control was visually louder than the design and
 * competed with the screen title for attention.
 *
 * Carries the sport's own mark rather than a generic filter glyph: the app has
 * drawn icons for wing, kite and surf, and a slider icon only said "there is a
 * filter here" where the mark says which one.
 */
export function SportFilterChip({ className = "" }) {
  const { sport, setSport, meta } = useSport();
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Sport: ${meta.label}`}
        className="flex items-center gap-1.5 border border-nav-border rounded-pill pl-2.5 pr-2 py-1.5 font-data text-[10px] text-faded-ink hover:text-ink transition-colors duration-fast ease-smooth focus-ring"
      >
        <SportBadge sport={sport} size={14} className="text-accent" />
        {meta.label}
        <ChevronDown size={12} className="flex-none" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <ul
            role="listbox"
            className="absolute right-0 top-full mt-2 z-20 min-w-[140px] rounded-card-sm bg-nav-bg border border-nav-border shadow-nav backdrop-blur-md overflow-hidden"
          >
            {SPORTS.map((option) => {
              const active = option.id === sport;
              return (
                <li key={option.id}>
                  <button
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setSport(option.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 text-left px-3 py-2.5 font-data text-[10px] tracking-[0.08em] transition-colors duration-fast ease-smooth ${
                      active ? "bg-accent-tint text-accent" : "text-faded-ink hover:bg-ink-hover"
                    }`}
                  >
                    <SportBadge
                      sport={option.id}
                      size={16}
                      // Inherit the row's own colour rather than SportBadge's
                      // ink/30 default, or every inactive row reads as disabled.
                      className={active ? "text-accent" : "text-faded-ink"}
                    />
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
