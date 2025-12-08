"use client";

import { Select } from "../ui/Select";

const SHOW_OPTIONS = [
  { id: "best", label: "Best times" },
  { id: "all", label: "All times" },
];

export function ShowFilter({ onFilterChange, className = "" }) {
  const handleChange = (filterId) => {
    if (onFilterChange) {
      onFilterChange(filterId);
    }
  };

  return (
    <Select
      options={SHOW_OPTIONS}
      onChange={handleChange}
      storageKey="waterman_show_filter"
      defaultValue="best"
      className={className}
    />
  );
}

