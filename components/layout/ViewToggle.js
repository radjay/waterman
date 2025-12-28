"use client";

import { usePathname } from "next/navigation";
import { Calendar, List } from "lucide-react";

/**
 * ViewToggle component for switching between calendar and list views.
 * 
 * @param {Function} onChange - Callback when view changes (receives "calendar" or "list")
 * @param {string} className - Additional CSS classes
 */
export function ViewToggle({ onChange, className = "" }) {
  const pathname = usePathname();
  const isCalendar = pathname === "/calendar";

  return (
    <div className={`flex items-center gap-1 border border-ink/30 rounded bg-newsprint ${className}`}>
      <button
        onClick={() => onChange("list")}
        className={`px-3 py-1 flex items-center gap-1.5 transition-colors ${
          !isCalendar
            ? "bg-ink text-newsprint"
            : "text-ink hover:bg-ink/5"
        }`}
        aria-label="Report view"
      >
        <List size={16} />
        <span className="text-xs font-medium uppercase">Report</span>
      </button>
      <button
        onClick={() => onChange("calendar")}
        className={`px-3 py-1 flex items-center gap-1.5 transition-colors ${
          isCalendar
            ? "bg-ink text-newsprint"
            : "text-ink hover:bg-ink/5"
        }`}
        aria-label="Calendar view"
      >
        <Calendar size={16} />
        <span className="text-xs font-medium uppercase">Calendar</span>
      </button>
    </div>
  );
}

