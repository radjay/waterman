"use client";

import { Select } from "../ui/Select";

const SPORTS = [
  { id: "wingfoil", label: "Wing" },
  { id: "surfing", label: "Surf" },
];

export function SportSelector({ onSportsChange, className = "" }) {
  const handleChange = (sportId) => {
    if (onSportsChange) {
      onSportsChange([sportId]);
    }
  };

  return (
    <Select
      options={SPORTS}
      onChange={handleChange}
      storageKey="waterman_selected_sport"
      defaultValue="wingfoil"
      className={className}
    />
  );
}

