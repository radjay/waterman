"use client";

import { useState, useEffect } from "react";

const SHOW_OPTIONS = [
  { id: "best", label: "Best times" },
  { id: "all", label: "All times" },
];

const STORAGE_KEY = "waterman_show_filter";

export function ShowFilter({ onFilterChange, className = "" }) {
  // Always start with default to avoid hydration mismatch
  const [showFilter, setShowFilter] = useState("best");
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after hydration
  useEffect(() => {
    setIsHydrated(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === "best" || stored === "all")) {
      setShowFilter(stored);
      if (onFilterChange) {
        onFilterChange(stored);
      }
      return;
    }
    // Notify parent of default on first load
    if (onFilterChange) {
      onFilterChange("best");
    }
  }, []); // Only run once on mount

  useEffect(() => {
    // Save to localStorage whenever selection changes (but only after hydration)
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, showFilter);
      // Notify parent
      if (onFilterChange) {
        onFilterChange(showFilter);
      }
    }
  }, [showFilter, isHydrated, onFilterChange]);

  const selectFilter = (filterId) => {
    setShowFilter(filterId);
  };

  return (
    <div className={`${className}`}>
      <select
        value={showFilter}
        onChange={(e) => selectFilter(e.target.value)}
        className="px-3 py-1 rounded border border-ink/30 bg-newsprint text-ink font-body font-medium text-xs uppercase cursor-pointer focus:outline-none focus:border-ink hover:bg-ink/5"
      >
        {SHOW_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

