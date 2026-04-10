"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, List, Video, BookOpen, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { MobileMenu } from "./MobileMenu";

const tabs = [
  { id: "home", label: "Home", icon: Home, path: "/dashboard" },
  { id: "report", label: "Report", icon: List, path: "/report" },
  { id: "cams", label: "Cams", icon: Video, path: "/cams" },
  { id: "journal", label: "Journal", icon: BookOpen, path: "/journal" },
  { id: "more", label: "More", icon: MoreHorizontal, path: null },
];

/**
 * BottomNav — floating pill-shaped bottom tab bar for mobile.
 * Matches the desktop ViewToggle pill aesthetic.
 * Hidden on md+ (desktop uses ViewToggle in the header).
 */
export function BottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [optimisticTab, setOptimisticTab] = useState(null);

  const getActiveTab = (p) => {
    if (p === "/" || p === "/dashboard") return "home";
    if (
      p === "/report" ||
      p?.startsWith("/report/") ||
      p?.match(/^\/(wing|kite|surf)/)
    )
      return "report";
    if (p?.startsWith("/cams")) return "cams";
    if (p?.startsWith("/journal")) return "journal";
    // Calendar, settings, profile etc. highlight "more"
    if (p?.startsWith("/calendar")) return "more";
    if (p?.startsWith("/settings")) return "more";
    if (p?.startsWith("/profile")) return "more";
    return "home";
  };

  // Clear optimistic state once navigation completes
  useEffect(() => {
    setOptimisticTab(null);
  }, [pathname]);

  const activeTab = optimisticTab || getActiveTab(pathname);

  // Don't show on admin, auth, onboarding, or other non-main pages
  const hiddenPaths = ["/admin", "/auth", "/ui-kit", "/subscribe", "/request-spot", "/changelog"];
  if (hiddenPaths.some((p) => pathname?.startsWith(p))) return null;

  return (
    <>
      {/* Mobile menu panel — controlled by BottomNav */}
      <MobileMenu isOpen={menuOpen} onOpenChange={setMenuOpen} />

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 28px)" }}
      >
        {/* Gradient fade so content doesn't peek through */}
        <div className="absolute inset-x-0 bottom-0 h-full pointer-events-none bg-gradient-to-t from-newsprint via-newsprint/80 to-transparent" />
        <div className="relative flex items-center gap-0.5 p-1 bg-newsprint rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const inner = (
              <>
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-pill"
                    initial={false}
                    className="absolute inset-0 bg-newsprint rounded-full shadow-card border border-ink/10"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10 flex flex-col items-center gap-0.5">
                  <tab.icon
                    size={18}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    className={isActive ? "text-ink" : "text-faded-ink"}
                  />
                  <span
                    className={`text-[0.55rem] font-semibold uppercase tracking-wider leading-none ${
                      isActive ? "text-ink" : "text-faded-ink"
                    }`}
                  >
                    {tab.label}
                  </span>
                </span>
              </>
            );

            const sharedClass =
              "relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-full transition-colors duration-fast ease-smooth";

            if (tab.path) {
              return (
                <Link
                  key={tab.id}
                  href={tab.path}
                  onClick={() => setOptimisticTab(tab.id)}
                  className={sharedClass}
                  aria-label={tab.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  {inner}
                </Link>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => setMenuOpen(true)}
                className={sharedClass}
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
