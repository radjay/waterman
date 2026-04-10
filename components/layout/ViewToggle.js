"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Calendar, List, Video, BookOpen, Home } from "lucide-react";
import { motion } from "framer-motion";

/**
 * ViewToggle — main navigation bar with animated sliding pill indicator.
 * Full-width on desktop with nav tabs left-aligned and optional right-side content.
 * Icons-only on mobile, icons + text labels on md+.
 */
export function ViewToggle({ compact = false, rightContent, className = "" }) {
  const pathname = usePathname();
  const [optimisticTab, setOptimisticTab] = useState(null);

  // Clear optimistic state once navigation completes
  useEffect(() => {
    setOptimisticTab(null);
  }, [pathname]);

  const getActiveTab = (p) => {
    if (p === "/dashboard") return "dashboard";
    if (p === "/calendar") return "calendar";
    if (p === "/cams") return "cams";
    if (p?.startsWith("/journal")) return "journal";
    // Fallback: report is active for /report, /, and anything not explicitly matched above (except /ui-kit)
    if (p === "/report" || p === "/" || (p !== "/ui-kit")) return "report";
    return null;
  };

  const activeTabId = optimisticTab || getActiveTab(pathname);

  const tabs = [
    { id: "dashboard", label: "Home", icon: Home, path: "/dashboard" },
    { id: "report", label: "Report", icon: List, path: "/report" },
    { id: "cams", label: "Cams", icon: Video, path: "/cams" },
    { id: "journal", label: "Journal", icon: BookOpen, path: "/journal" },
    { id: "calendar", label: "Calendar", icon: Calendar, path: "/calendar" },
  ];

  return (
    <nav
      className={`flex items-center gap-0.5 p-1 bg-ink/[0.04] rounded-full ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.path}
            onClick={() => setOptimisticTab(tab.id)}
            className={`relative flex items-center justify-center gap-1.5 transition-colors duration-fast ease-smooth focus-ring rounded-full ${
              compact ? "px-2 md:px-2.5 py-1" : "px-2.5 md:px-3 py-1.5"
            }`}
            aria-label={`${tab.label} view`}
            aria-current={isActive ? "page" : undefined}
          >
            {isActive && (
              <motion.div
                layoutId="nav-tab"
                initial={false}
                className="absolute inset-0 bg-newsprint rounded-full shadow-card border border-ink/10"
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              />
            )}
            <span
              className={`relative z-10 flex items-center gap-1.5 ${
                isActive ? "text-ink" : "text-faded-ink"
              }`}
            >
              <tab.icon size={compact ? 14 : 15} strokeWidth={isActive ? 2.5 : 2} />
              <span
                className={`hidden md:inline text-xs uppercase tracking-wider leading-none font-semibold ${
                  compact ? "text-[0.65rem]" : ""
                }`}
              >
                {tab.label}
              </span>
            </span>
          </Link>
        );
      })}

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
