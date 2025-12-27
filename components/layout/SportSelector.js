"use client";

import { Select } from "../ui/Select";

const SPORTS = [
  { id: "wingfoil", label: "Wing" },
  { id: "surfing", label: "Surf" },
];

export function SportSelector({ onSportsChange, value, className = "" }) {
  return (
    <Select
      options={SPORTS}
      value={value}
      onChange={onSportsChange}
      className={className}
    />
  );
}

