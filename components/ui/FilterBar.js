"use client";

import { useState, useEffect } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { ShareButton } from "./ShareButton";

const STORAGE_KEY = "waterman_filters_expanded";

/**
 * FilterBar — expandable filter container.
 *
 * Collapsed: a pill button sitting inline above content.
 * Expanded: full-width container with filter options inside.
 * Desktop defaults to expanded; mobile defaults to collapsed.
 * State is persisted in localStorage across sessions.
 *
 * No entrance animations — only animates when toggling between states.
 *
 * @param {string[]} activeFilters - labels to show when collapsed (e.g. ["Wing", "Best"])
 */
export function FilterBar({ children, actions, activeFilters = [], className = "" }) {
  const [expanded, setExpanded] = useState(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setExpanded(stored === "true");
    } else {
      setExpanded(window.innerWidth >= 768);
    }
    setHasMounted(true);
  }, []);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  // Skeleton placeholder before hydration
  if (!hasMounted) {
    return (
      <div className={className}>
        {actions && (
          <div className="flex items-center gap-3 pt-3 pb-2">{actions}</div>
        )}
      </div>
    );
  }

  // Expanded: normal flow container with filter options
  if (expanded) {
    return (
      <div className={className}>
        <div className="flex items-center justify-end gap-3 pt-3 pb-2">
          {actions}
          <ShareButton className="md:hidden h-[27px] w-[27px] rounded-full ring-1 ring-inset ring-ink/15 shadow-sm bg-newsprint hover:bg-white active:scale-[0.98] transition-all duration-fast ease-smooth" />
        </div>

        <div className="pb-4 pt-2">
          <div className="rounded-xl bg-ink/[0.04] px-4 md:-mx-2 py-3 overflow-hidden">
            {/* Single flex container: column on mobile, row on desktop */}
            <div className="flex flex-col md:flex-row md:items-center md:gap-3">

              {/* Filters label — full-width row on mobile, left item on desktop */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={toggle}
                  className="flex items-center gap-1.5 text-faded-ink hover:text-ink transition-colors duration-fast ease-smooth"
                  aria-expanded={true}
                >
                  <SlidersHorizontal size={14} strokeWidth={2} />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Filters
                  </span>
                </button>
                {/* Mobile-only: spacer + X */}
                <div className="flex-1 md:hidden" />
                <button
                  onClick={toggle}
                  className="md:hidden p-1 rounded-full text-faded-ink/50 hover:text-ink hover:bg-ink/[0.06] transition-colors"
                  aria-label="Close filters"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>

              {/* Desktop-only vertical divider */}
              <div className="hidden md:block w-px h-4 bg-ink/20 shrink-0" />

              {/* Filter selectors — stacked on mobile (with border-t), inline on desktop */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 mt-3 pt-3 border-t border-ink/[0.06] md:mt-0 md:pt-0 md:border-0 flex-1">
                {children}
              </div>

              {/* Desktop-only X button, far right */}
              <button
                onClick={toggle}
                className="hidden md:flex p-1 rounded-full text-faded-ink/50 hover:text-ink hover:bg-ink/[0.06] transition-colors"
                aria-label="Close filters"
              >
                <X size={14} strokeWidth={2} />
              </button>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // Collapsed: filter pill sits above content in a row, with optional actions to its left.
  // On mobile, a share button is shown to the left of the filter pill.
  return (
    <div className={`flex items-center justify-end gap-3 pt-3 pb-2 ${className}`}>
      {actions}
      <ShareButton className="md:hidden h-[27px] w-[27px] rounded-full ring-1 ring-inset ring-ink/15 shadow-sm bg-newsprint hover:bg-white active:scale-[0.98] transition-all duration-fast ease-smooth" />
      <div className="rounded-full bg-ink/[0.05] overflow-hidden">
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 px-3 py-1.5 text-faded-ink hover:text-ink transition-colors duration-fast ease-smooth"
          aria-expanded={false}
        >
          <SlidersHorizontal size={14} strokeWidth={2} />
          {/* Collapsed: show active filter labels as mini pills */}
          {activeFilters.length > 0 ? (
            <span className="flex items-center gap-1">
              {activeFilters.map((label, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded bg-ink/[0.08] text-[0.65rem] font-bold uppercase tracking-wider text-ink leading-none"
                >
                  {label}
                </span>
              ))}
            </span>
          ) : (
            <span className="text-xs font-semibold uppercase tracking-wider">
              Filters
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
