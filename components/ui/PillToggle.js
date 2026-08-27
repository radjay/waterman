"use client";

import { motion } from "framer-motion";

/**
 * PillToggle — premium single-select pill group with animated sliding indicator.
 *
 * @param {Array<{id: string, label: string, href?: string}>} options
 * @param {string} value - Currently selected option id
 * @param {Function} onChange - Called with selected option id
 * @param {string} name - Unique name for animation (each PillToggle on the page needs a different name)
 * @param {string} className - Additional CSS classes
 *
 * Pass `href` on an option to render a real link. Clicks still call `onChange`
 * when JS is alive (preventDefault). Without JS the browser follows the href.
 */
export function PillToggle({
  options,
  value,
  onChange,
  name = "pill",
  className = "",
  animated = true,
}) {
  return (
    <div
      className={`inline-flex items-center gap-0.5 p-1 bg-ink/[0.04] rounded-full ${className}`}
    >
      {options.map((option) => {
        const isActive = value === option.id;
        const pillClass =
          "relative cursor-pointer px-3 py-1 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors duration-fast ease-smooth";
        const inner = (
          <>
            {isActive && animated ? (
              <motion.div
                layoutId={`pill-${name}`}
                className="absolute inset-0 bg-newsprint rounded-full shadow-card border border-ink/10 pointer-events-none"
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              />
            ) : null}
            {isActive && !animated ? (
              <div className="absolute inset-0 bg-newsprint rounded-full shadow-card border border-ink/10 pointer-events-none" />
            ) : null}
            <span className={`relative z-10 ${isActive ? "text-ink" : "text-faded-ink hover:text-ink"}`}>
              {option.label}
            </span>
          </>
        );

        const onClick = (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (onChange) onChange(option.id);
        };

        if (option.href) {
          return (
            <a
              key={option.id}
              href={option.href}
              onClick={onClick}
              className={pillClass}
              aria-current={isActive ? "true" : undefined}
            >
              {inner}
            </a>
          );
        }

        return (
          <button
            key={option.id}
            type="button"
            onClick={onClick}
            className={pillClass}
            aria-current={isActive ? "true" : undefined}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
