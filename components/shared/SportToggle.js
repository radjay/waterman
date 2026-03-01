"use client";

import { useState } from "react";

/**
 * SportToggle Component
 *
 * Allows users to switch between Surf, Kite, and Wing views
 * Changes the ranking/filtering of conditions based on sport-specific scores
 */

const SPORTS = [
  { id: "wingfoil", label: "Wing", icon: "🪁" },
  { id: "kitesurfing", label: "Kite", icon: "🪂" },
  { id: "surfing", label: "Surf", icon: "🏄" },
];

export function SportToggle({ selected = "wingfoil", onChange }) {
  return (
    <div className="inline-flex items-center bg-newsprint border-2 border-ink/20 rounded-lg p-1 gap-1">
      {SPORTS.map((sport) => (
        <button
          key={sport.id}
          onClick={() => onChange(sport.id)}
          className={`px-3 py-1.5 rounded-md font-bold text-sm transition-all ${
            selected === sport.id
              ? "bg-ink text-newsprint shadow-sm"
              : "text-ink/60 hover:text-ink hover:bg-ink/5"
          }`}
        >
          <span className="hidden sm:inline">{sport.icon} {sport.label}</span>
          <span className="sm:hidden">{sport.icon}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Compact Sport Toggle (for mobile/compact views)
 */
export function SportToggleCompact({ selected = "wingfoil", onChange }) {
  const selectedSport = SPORTS.find((s) => s.id === selected);

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs font-bold uppercase text-ink/60">Sport:</span>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 bg-newsprint border-2 border-ink/20 rounded text-sm font-bold text-ink focus:outline-none focus:border-ink/40"
      >
        {SPORTS.map((sport) => (
          <option key={sport.id} value={sport.id}>
            {sport.icon} {sport.label}
          </option>
        ))}
      </select>
    </div>
  );
}
