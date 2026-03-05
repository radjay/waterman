"use client";

import { usePathname, useRouter } from "next/navigation";
import { Calendar, List, Video, BookOpen, Home } from "lucide-react";
import { motion } from "framer-motion";

/**
 * ViewToggle — main navigation bar with animated sliding pill indicator.
 * Full-width on desktop with nav tabs left-aligned and optional right-side content.
 * Icons-only on mobile, icons + text labels on md+.
 */
export function ViewToggle({ compact = false, rightContent, className = "" }) {
  const pathname = usePathname();
  const router = useRouter();

  const isDashboard = pathname === "/dashboard";
  const isCalendar = pathname === "/calendar";
  const isCams = pathname === "/cams";
  const isJournal = pathname?.startsWith("/journal");
  const isReport =
    pathname === "/report" ||
    pathname === "/" ||
    (!isDashboard && !isCalendar && !isCams && !isJournal && pathname !== "/ui-kit");

  const tabs = [
    { id: "dashboard", label: "Home", icon: Home, active: isDashboard, path: "/dashboard" },
    { id: "report", label: "Report", icon: List, active: isReport, path: "/report" },
    { id: "calendar", label: "Calendar", icon: Calendar, active: isCalendar, path: "/calendar" },
    { id: "cams", label: "Cams", icon: Video, active: isCams, path: "/cams" },
    { id: "journal", label: "Journal", icon: BookOpen, active: isJournal, path: "/journal" },
  ];

  return (
    <nav
      className={`flex items-center gap-0.5 p-1 bg-ink/[0.04] rounded-full ${className}`}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => router.push(tab.path)}
          className={`relative flex items-center justify-center gap-1.5 transition-colors duration-fast ease-smooth focus-ring rounded-full ${
            compact ? "px-2 md:px-2.5 py-1" : "px-2.5 md:px-3 py-1.5"
          }`}
          aria-label={`${tab.label} view`}
          aria-current={tab.active ? "page" : undefined}
        >
          {tab.active && (
            <motion.div
              layoutId="nav-tab"
              className="absolute inset-0 bg-newsprint rounded-full shadow-card border border-ink/10"
              transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
            />
          )}
          <span
            className={`relative z-10 flex items-center gap-1.5 ${
              tab.active ? "text-ink" : "text-faded-ink"
            }`}
          >
            <tab.icon size={compact ? 14 : 15} strokeWidth={tab.active ? 2.5 : 2} />
            <span
              className={`hidden md:inline text-xs uppercase tracking-wider leading-none font-semibold ${
                compact ? "text-[0.65rem]" : ""
              }`}
            >
              {tab.label}
            </span>
          </span>
        </button>
      ))}

      {/* Spacer + right content (e.g. Sign In) */}
      {rightContent && (
        <>
          <div className="flex-1" />
          {rightContent}
        </>
      )}
    </nav>
  );
}
