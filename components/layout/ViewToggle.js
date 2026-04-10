"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Calendar, List, Video, BookOpen, Home } from "lucide-react";

const PILL_TRANSITION = "left 0.45s cubic-bezier(0.4, 0, 0.2, 1), width 0.45s cubic-bezier(0.4, 0, 0.2, 1)";

/**
 * ViewToggle — main navigation bar with animated sliding pill indicator.
 *
 * Uses direct DOM manipulation + CSS transitions instead of Framer Motion
 * to avoid mount/unmount animation issues during page navigation.
 * The pill is always rendered and positioned via useLayoutEffect (before paint).
 */
export function ViewToggle({ compact = false, rightContent, className = "" }) {
  const pathname = usePathname();
  const [optimisticTab, setOptimisticTab] = useState(null);
  const tabRefs = useRef({});
  const navRef = useRef(null);
  const pillRef = useRef(null);
  const hasMounted = useRef(false);

  // Clear optimistic state once navigation completes
  useEffect(() => {
    setOptimisticTab(null);
  }, [pathname]);

  const getActiveTab = (p) => {
    if (p === "/dashboard") return "dashboard";
    if (p === "/calendar") return "calendar";
    if (p === "/cams") return "cams";
    if (p?.startsWith("/journal")) return "journal";
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

  // Position the pill directly on the DOM — runs before paint via useLayoutEffect.
  // No React state involved, so no re-render or Framer Motion mount animation.
  const positionPill = useCallback(() => {
    const el = tabRefs.current[activeTabId];
    const nav = navRef.current;
    const pill = pillRef.current;
    if (!el || !nav || !pill) return;

    const navRect = nav.getBoundingClientRect();
    const tabRect = el.getBoundingClientRect();

    // First measurement after mount: no transition (appear instantly)
    pill.style.transition = hasMounted.current ? PILL_TRANSITION : "none";
    pill.style.left = `${tabRect.left - navRect.left}px`;
    pill.style.width = `${tabRect.width}px`;
    pill.style.opacity = "1";

    // After first paint, enable transitions for future changes
    if (!hasMounted.current) {
      hasMounted.current = true;
    }
  }, [activeTabId]);

  useLayoutEffect(() => {
    positionPill();
  }, [positionPill, compact]);

  useEffect(() => {
    window.addEventListener("resize", positionPill);
    return () => window.removeEventListener("resize", positionPill);
  }, [positionPill]);

  return (
    <nav
      ref={navRef}
      className={`relative flex items-center gap-0.5 p-1 bg-ink/[0.04] rounded-full ${className}`}
    >
      {/* Always-rendered pill — positioned via DOM, animated via CSS transition */}
      <div
        ref={pillRef}
        className="absolute top-1 bottom-1 bg-newsprint rounded-full shadow-card border border-ink/10"
        style={{ opacity: 0 }}
      />

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

      {rightContent && (
        <>
          <div className="flex-1" />
          {rightContent}
        </>
      )}
    </nav>
  );
}
