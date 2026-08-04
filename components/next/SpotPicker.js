"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/** Scope sentinels. Anything else is a spot id. */
export const FAVORITES = "__favorites__";
export const ALL_SPOTS = "__all__";

/**
 * The scope picker, worn as part of the page title.
 *
 * Reads as a sentence — "Next windows at My favorites" — rather than as a
 * control bolted beside a heading, so the thing being scoped and the scope sit
 * in one phrase. The dotted underline and chevron are what mark it as
 * changeable; without them it reads as static text.
 */
export function SpotPicker({ spots, value, onChange, hasFavorites, className = "" }) {
  const [open, setOpen] = useState(false);

  // Spots carry `_id`; the scope sentinels do not. Normalising here rather
  // than spreading raw spots is what stops `onChange` firing with undefined.
  const options = [
    hasFavorites ? { id: FAVORITES, name: "My favorites" } : null,
    { id: ALL_SPOTS, name: "All spots" },
    ...spots.map((spot) => ({ id: spot._id, name: spot.name })),
  ].filter(Boolean);

  const label =
    value === FAVORITES
      ? hasFavorites
        ? "My favorites"
        : // The default scope with nothing to scope to. Prompting beats showing
          // "My favorites" over a set the rider has never chosen.
          "Select a spot"
      : value === ALL_SPOTS || !value
        ? "All spots"
        : (spots.find((s) => s._id === value)?.name ?? "All spots");

  return (
    <span className={`relative inline-block ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Scope: ${label}`}
        className="inline-flex items-baseline gap-1.5 border-b-2 border-dotted border-ink/35 hover:border-ink/60 transition-colors duration-fast ease-smooth focus-ring text-left"
      >
        {label}
        <ChevronDown size={20} className="self-center flex-none text-faded-ink" />
      </button>

      {open && (
        <>
          <span
            className="fixed inset-0 z-10 block"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <ul
            role="listbox"
            className="absolute left-0 top-full mt-2 z-20 min-w-[220px] max-h-[320px] overflow-y-auto rounded-card-sm bg-nav-bg border border-nav-border shadow-nav backdrop-blur-md"
          >
            {options.map((option) => {
              const active = (value ?? ALL_SPOTS) === option.id;
              return (
                <li key={option.id}>
                  <button
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 text-left px-3.5 py-2.5 font-body text-[13px] font-normal tracking-normal transition-colors duration-fast ease-smooth ${
                      active ? "bg-accent-tint text-accent" : "text-ink hover:bg-ink-hover"
                    }`}
                  >
                    <span className="flex-1 truncate">{option.name}</span>
                    {active && <Check size={14} className="flex-none" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </span>
  );
}
