"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SPORTS, useSport } from "./SportProvider";
import { SportBadge } from "../ui/SportBadge";

/**
 * The mobile sport control: the spot's own mark, the sport's name, a chevron.
 *
 * Sits opposite the screen title on every phone screen, at the same size on all
 * four, so the one control that changes what every number on the page means is
 * always in the same place. Accent-coloured rather than muted: it is a live
 * setting, not a filter chip you can ignore.
 *
 * Carries the app's drawn wing/kite/surf marks rather than a generic slider
 * glyph — the glyph only said "there is a filter here" where the mark says
 * which one is on.
 */
export function SportFilterChip({ className = "" }) {
  const { sport, setSport, meta } = useSport();
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative flex-none ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Sport: ${meta.label}`}
        className="flex items-center gap-1.5 border border-nav-border rounded-pill px-[11px] py-[6px] font-data text-[10px] tracking-[0.1em] text-accent transition-colors duration-fast ease-smooth focus-ring hover:bg-ink-hover"
      >
        <SportBadge sport={sport} size={14} className="text-accent" />
        {meta.label}
        <ChevronDown size={12} className="flex-none" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
          <ul
            role="listbox"
            className="absolute right-0 top-full mt-2 z-40 min-w-[140px] rounded-card-sm bg-nav-bg border border-nav-border shadow-nav backdrop-blur-md overflow-hidden"
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
                    className={`w-full flex items-center gap-2.5 text-left px-3 py-2.5 font-data text-[10px] tracking-[0.1em] transition-colors duration-fast ease-smooth ${
                      active ? "bg-accent-tint text-accent" : "text-faded-ink hover:bg-ink-hover"
                    }`}
                  >
                    <SportBadge sport={option.id} size={16} className="text-current" />
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
