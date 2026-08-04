"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { SPORTS, useSport } from "./SportProvider";

/**
 * The single filter chip used on Next and Cams.
 *
 * The handoff uses the three-segment selector only on Now, where the sport is
 * the screen's primary context. On the list screens it is a compact chip —
 * `sliders-horizontal` + the current sport — that opens the choice on tap.
 * Reusing the segmented control there was visually louder than the design and
 * competed with the screen title for attention.
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
        className="flex items-center gap-1.5 border border-nav-border rounded-pill px-[11px] py-1.5 font-data text-[10px] text-faded-ink hover:text-ink transition-colors duration-fast ease-smooth focus-ring"
      >
        <SlidersHorizontal size={12} />
        {meta.label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <ul
            role="listbox"
            className="absolute right-0 top-full mt-2 z-20 min-w-[120px] rounded-card-sm bg-nav-bg border border-nav-border shadow-nav backdrop-blur-md overflow-hidden"
          >
            {SPORTS.map((option) => (
              <li key={option.id}>
                <button
                  role="option"
                  aria-selected={option.id === sport}
                  onClick={() => {
                    setSport(option.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 font-data text-[10px] tracking-[0.08em] transition-colors duration-fast ease-smooth ${
                    option.id === sport
                      ? "bg-accent-tint text-accent"
                      : "text-faded-ink hover:bg-ink-hover"
                  }`}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
