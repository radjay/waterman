"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Calendar, List, Video, BookOpen, Home } from "lucide-react";
import { motion } from "framer-motion";

/**
 * ViewToggle — main navigation bar with animated sliding pill indicator.
 * Full-width on desktop with nav tabs left-aligned and optional right-side content.
 * Icons-only on mobile, icons + text labels on md+.
 *
 * The pill is always rendered (never conditionally mounted) and animated
 * via measured positions to avoid entrance animations from the bottom.
 */
export function ViewToggle({ compact = false, rightContent, className = "" }) {
  const pathname = usePathname();
  const [optimisticTab, setOptimisticTab] = useState(null);
  const tabRefs = useRef({});
  const navRef = useRef(null);
  const [pillStyle, setPillStyle] = useState(null);

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

  // Measure the active tab and update pill position
  const measurePill = useCallback(() => {
    const el = tabRefs.current[activeTabId];
    const nav = navRef.current;
    if (el && nav) {
      const navRect = nav.getBoundingClientRect();
      const tabRect = el.getBoundingClientRect();
      setPillStyle({
        left: tabRect.left - navRect.left,
        width: tabRect.width,
        height: tabRect.height,
      });
    }
  }, [activeTabId]);

  useEffect(() => {
    measurePill();
  }, [measurePill, compact]);

  // Re-measure on window resize (font/layout may shift)
  useEffect(() => {
    window.addEventListener("resize", measurePill);
    return () => window.removeEventListener("resize", measurePill);
  }, [measurePill]);

  return (
    <nav
      ref={navRef}
      className={`relative flex items-center gap-0.5 p-1 bg-ink/[0.04] rounded-full ${className}`}
    >
      {/* Always-rendered sliding pill — never unmounts */}
      {pillStyle && (
        <motion.div
          className="absolute bg-newsprint rounded-full shadow-card border border-ink/10"
          initial={false}
          animate={{
            left: pillStyle.left,
            width: pillStyle.width,
            height: pillStyle.height,
          }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
          style={{ top: "50%", y: "-50%" }}
        />
      )}

      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id;
        return (
          <Link
            key={tab.id}
            ref={(el) => { tabRefs.current[tab.id] = el; }}
            href={tab.path}
            onClick={() => setOptimisticTab(tab.id)}
            className={`relative flex items-center justify-center gap-1.5 transition-colors duration-fast ease-smooth focus-ring rounded-full ${
              compact ? "px-2 md:px-2.5 py-1" : "px-2.5 md:px-3 py-1.5"
            }`}
            aria-label={`${tab.label} view`}
            aria-current={isActive ? "page" : undefined}
          >
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
