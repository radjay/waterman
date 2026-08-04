"use client";

import { SPORTS, useSport } from "./SportProvider";

/**
 * The three-segment sport selector from the Now header.
 *
 * Uses the dedicated sport-pill token pair rather than the generic accent-tint
 * treatment. That pairing was the one component that broke when both themes
 * shared accent-on-tint: tinted with accent text at night, solid accent with
 * white text in day.
 */
export function SportSegmented({ className = "" }) {
  const { sport, setSport } = useSport();

  return (
    <div
      role="tablist"
      aria-label="Sport"
      className={`flex rounded-pill overflow-hidden border border-nav-border ${className}`}
    >
      {SPORTS.map((option) => {
        const active = option.id === sport;
        return (
          <button
            key={option.id}
            role="tab"
            aria-selected={active}
            onClick={() => setSport(option.id)}
            className={`px-3 py-1.5 font-data text-[10px] tracking-[0.08em] transition-colors duration-fast ease-smooth focus-ring ${
              active
                ? "bg-sport-pill text-sport-pill-text"
                : "text-dim hover:text-faded-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
