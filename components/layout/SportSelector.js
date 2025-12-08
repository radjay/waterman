"use client";

import { useState, useEffect } from "react";

const SPORTS = [
  { id: "wingfoil", label: "Wing" },
  { id: "surfing", label: "Surf" },
];

const STORAGE_KEY = "waterman_selected_sport";

export function SportSelector({ onSportsChange, className = "" }) {
  // Always start with default to avoid hydration mismatch
  const [selectedSport, setSelectedSport] = useState("wingfoil");
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after hydration
  useEffect(() => {
    setIsHydrated(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === "wingfoil" || stored === "surfing")) {
      setSelectedSport(stored);
      if (onSportsChange) {
        onSportsChange([stored]);
      }
      return;
    }
    // Notify parent of default on first load
    if (onSportsChange) {
      onSportsChange(["wingfoil"]);
    }
  }, []); // Only run once on mount

  useEffect(() => {
    // Save to localStorage whenever selection changes (but only after hydration)
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, selectedSport);
      // Notify parent
      if (onSportsChange) {
        onSportsChange([selectedSport]);
      }
    }
  }, [selectedSport, isHydrated, onSportsChange]);

  const selectSport = (sportId) => {
    setSelectedSport(sportId);
  };

  return (
    <div className={`${className}`}>
      <div className="relative inline-block">
        <select
          value={selectedSport}
          onChange={(e) => selectSport(e.target.value)}
          className="px-3 pr-8 py-1 rounded border border-ink/30 bg-newsprint text-ink font-body font-medium text-xs uppercase cursor-pointer focus:outline-none focus:border-ink hover:bg-ink/5 appearance-none"
        >
          {SPORTS.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.label}
            </option>
          ))}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
    </div>
  );
}

