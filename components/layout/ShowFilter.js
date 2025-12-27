"use client";

import { Select } from "../ui/Select";

const SHOW_OPTIONS = [
  { id: "best", label: "Best times" },
  { id: "all", label: "All times" },
];

export function ShowFilter({ onFilterChange, value, className = "" }) {
  return (
    <Select
      options={SHOW_OPTIONS}
      value={value}
      onChange={onFilterChange}
      className={className}
    />
  );
}

