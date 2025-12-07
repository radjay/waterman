"use client";

import { useState, useEffect } from "react";

const SPORTS = [
  { id: "wingfoil", label: "Wingfoil" },
  { id: "surfing", label: "Surfing" },
];

const STORAGE_KEY = "waterman_selected_sports";

export function SportSelector({ onSportsChange, className = "" }) {
  // Always start with default to avoid hydration mismatch
  const [selectedSports, setSelectedSports] = useState(["wingfoil"]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after hydration
  useEffect(() => {
    setIsHydrated(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedSports(parsed);
          if (onSportsChange) {
            onSportsChange(parsed);
          }
          return;
        }
      } catch {
        // Invalid stored data, use default
      }
    }
    // Notify parent of default on first load
    if (onSportsChange) {
      onSportsChange(["wingfoil"]);
    }
  }, []); // Only run once on mount

  useEffect(() => {
    // Save to localStorage whenever selection changes (but only after hydration)
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedSports));
      // Notify parent
      if (onSportsChange) {
        onSportsChange(selectedSports);
      }
    }
  }, [selectedSports, isHydrated, onSportsChange]);

  const toggleSport = (sportId) => {
    setSelectedSports((prev) => {
      if (prev.includes(sportId)) {
        // Don't allow deselecting all sports - at least one must be selected
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== sportId);
      } else {
        return [...prev, sportId];
      }
    });
  };

  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex flex-wrap gap-3 justify-center items-center">
        <span className="font-headline font-bold text-ink uppercase text-sm mr-2">
          Sports:
        </span>
        {SPORTS.map((sport) => {
          const isSelected = selectedSports.includes(sport.id);
          return (
            <button
              key={sport.id}
              onClick={() => toggleSport(sport.id)}
              className={`
                px-4 py-2 rounded border-2 transition-all
                font-headline font-bold uppercase text-sm
                ${
                  isSelected
                    ? "bg-ink text-newsprint border-ink"
                    : "bg-newsprint text-ink border-ink hover:bg-ink/10"
                }
              `}
            >
              {sport.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

