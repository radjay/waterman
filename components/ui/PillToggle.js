"use client";

import { motion } from "framer-motion";

/**
 * PillToggle — premium single-select pill group with animated sliding indicator.
 *
 * @param {Array<{id: string, label: string}>} options
 * @param {string} value - Currently selected option id
 * @param {Function} onChange - Called with selected option id
 * @param {string} name - Unique name for animation (each PillToggle on the page needs a different name)
 * @param {string} className - Additional CSS classes
 */
export function PillToggle({ options, value, onChange, name = "pill", className = "" }) {
  return (
    <div
      className={`inline-flex items-center gap-0.5 p-1 bg-ink/[0.04] rounded-full ${className}`}
    >
      {options.map((option) => {
        const isActive = value === option.id;
        return (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className="relative px-3 py-1 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors duration-fast ease-smooth"
          >
            {isActive && (
              <motion.div
                layoutId={`pill-${name}`}
                className="absolute inset-0 bg-newsprint rounded-full shadow-card border border-ink/10"
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              />
            )}
            <span className={`relative z-10 ${isActive ? "text-ink" : "text-faded-ink hover:text-ink"}`}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
