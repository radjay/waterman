"use client";

import { useState } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";

export const BEST_SPOT = "__best__";

/**
 * "Best spot" or one named spot.
 *
 * Next answers "when" across the whole coast by default, which is right for
 * "where should I go". But a rider who only ever drives to one beach wants that
 * beach's week, and aggregating hides it — a spot with a Thursday window looks
 * identical to no window at all when a better spot covers the same hours.
 */
export function SpotPicker({ spots, value, onChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const selected = spots.find((s) => s._id === value);
  const label = selected ? selected.name : "Best spot";

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 border border-nav-border rounded-pill px-[11px] py-1.5 font-data text-[10px] text-faded-ink hover:text-ink transition-colors duration-fast ease-smooth focus-ring max-w-[190px]"
      >
        <MapPin size={12} className="flex-none" />
        <span className="truncate uppercase">{label}</span>
        <ChevronDown size={12} className="flex-none" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <ul
            role="listbox"
            className="absolute right-0 top-full mt-2 z-20 min-w-[210px] max-h-[300px] overflow-y-auto rounded-card-sm bg-nav-bg border border-nav-border shadow-nav backdrop-blur-md"
          >
            {[{ _id: BEST_SPOT, name: "Best spot" }, ...spots].map((spot) => {
              const active = (value ?? BEST_SPOT) === spot._id;
              return (
                <li key={spot._id}>
                  <button
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(spot._id === BEST_SPOT ? null : spot._id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 text-left px-3.5 py-2.5 text-[13px] transition-colors duration-fast ease-smooth ${
                      active ? "bg-accent-tint text-accent" : "text-ink hover:bg-ink-hover"
                    }`}
                  >
                    <span className="flex-1 truncate">{spot.name}</span>
                    {active && <Check size={14} className="flex-none" />}
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
