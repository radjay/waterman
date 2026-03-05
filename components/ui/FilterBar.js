"use client";

import { useState, useEffect } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { motion } from "framer-motion";

const STORAGE_KEY = "waterman_filters_expanded";

const MORPH_TRANSITION = { duration: 0.35, ease: [0.32, 0.72, 0, 1] };

/**
 * FilterBar — morphing filter container.
 *
 * Collapsed: a sticky pill that sits inline with date headers
 * (right-aligned, zero net vertical space via negative margin).
 * Expanded: morphs into a full-width container with filters inside.
 * Desktop defaults to expanded; mobile defaults to collapsed.
 * State is persisted in localStorage across sessions.
 *
 * Uses layoutId to morph between collapsed/expanded in a single
 * smooth animation (no two-step jank).
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
        {actions && (
          <div className="flex items-center justify-end gap-3 pt-3 pb-2">
            {actions}
          </div>
        )}

        <div className="pb-4 pt-2">
          <motion.div
            layoutId="filter-morph"
            className="rounded-xl bg-ink/[0.04] px-4 py-3 overflow-hidden"
            transition={MORPH_TRANSITION}
          >
            {/* Header row */}
            <motion.div layout="position" className="flex items-center gap-2">
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

              <div className="flex-1" />

              <button
                onClick={toggle}
                className="p-1 rounded-full text-faded-ink/50 hover:text-ink hover:bg-ink/[0.06] transition-colors"
                aria-label="Close filters"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </motion.div>

            {/* Filter content — fades in after morph starts */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.2 }}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-3 mt-3 pt-3 border-t border-ink/[0.06]">
                {children}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Collapsed: sticky pill overlapping with date headers.
  // Uses Fragment so the sticky div is a direct child of the page container,
  // allowing it to stick for the full scroll range (not limited by a small wrapper).
  // h-10 + -mb-10 = zero net vertical space, so content flows behind the pill.
  // pointer-events-none on wrapper lets date headers underneath remain clickable.
  return (
    <>
      {actions && (
        <div className={`flex items-center justify-end gap-3 pt-3 pb-2 ${className}`}>
          {actions}
        </div>
      )}
      <div className="sticky top-0 md:top-[54px] z-[10] flex items-center justify-end h-12 -mb-12 pointer-events-none pr-2">
        <motion.div
          layoutId="filter-morph"
          className="rounded-full bg-ink/[0.05] overflow-hidden pointer-events-auto"
          transition={MORPH_TRANSITION}
        >
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
        </motion.div>
      </div>
    </>
  );
}
