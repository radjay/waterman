"use client";

import { usePathname } from "next/navigation";
import { Calendar, List, Video, BookOpen, LayoutDashboard } from "lucide-react";

/**
 * ViewToggle component for switching between dashboard, calendar, list, cams, and sessions views.
 *
 * @param {Function} onChange - Callback when view changes (receives "dashboard", "calendar", "list", "cams", or "sessions")
 * @param {string} className - Additional CSS classes
 */
export function ViewToggle({ onChange, className = "" }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";
  const isCalendar = pathname === "/calendar";
  const isCams = pathname === "/cams";
  const isSessions = pathname?.startsWith("/journal");
  const isReport = pathname === "/report";

  return (
    <div className={`inline-flex items-center gap-1 border border-ink/30 rounded bg-newsprint ${className}`}>
      <button
        onClick={() => onChange("dashboard")}
        className={`px-3 py-1.5 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
          isDashboard
            ? "bg-ink text-newsprint"
            : "text-ink hover:bg-ink/5"
        }`}
        aria-label="Dashboard view"
      >
        <LayoutDashboard size={16} />
        <span className="text-xs font-bold uppercase leading-none translate-y-[1.5px]">Dashboard</span>
      </button>
      <button
        onClick={() => onChange("list")}
        className={`px-3 py-1.5 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
          isReport
            ? "bg-ink text-newsprint"
            : "text-ink hover:bg-ink/5"
        }`}
        aria-label="Report view"
      >
        <List size={16} />
        <span className="text-xs font-bold uppercase leading-none translate-y-[1.5px]">Report</span>
      </button>
      <button
        onClick={() => onChange("calendar")}
        className={`px-3 py-1.5 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
          isCalendar
            ? "bg-ink text-newsprint"
            : "text-ink hover:bg-ink/5"
        }`}
        aria-label="Calendar view"
      >
        <Calendar size={16} />
        <span className="text-xs font-bold uppercase leading-none translate-y-[1.5px]">Calendar</span>
      </button>
      <button
        onClick={() => onChange("cams")}
        className={`px-3 py-1.5 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
          isCams
            ? "bg-ink text-newsprint"
            : "text-ink hover:bg-ink/5"
        }`}
        aria-label="Cams view"
      >
        <Video size={16} />
        <span className="text-xs font-bold uppercase leading-none translate-y-[1.5px]">Cams</span>
      </button>
      <button
        onClick={() => onChange("sessions")}
        className={`px-3 py-1.5 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
          isSessions
            ? "bg-ink text-newsprint"
            : "text-ink hover:bg-ink/5"
        }`}
        aria-label="Sessions view"
      >
        <BookOpen size={16} />
        <span className="text-xs font-bold uppercase leading-none translate-y-[1.5px]">Sessions</span>
      </button>
    </div>
  );
}

