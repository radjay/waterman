"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { formatFullDate } from "../../lib/utils";
import { usePathname } from "next/navigation";
// ShareButton removed — share is now in the UserMenu/MobileMenu

// Share functionality moved to UserMenu (desktop) and MobileMenu (mobile).

/**
 * Header — clean sticky header.
 *
 * Mobile: masthead only (title + date). Nav is handled by BottomNav.
 * Desktop: masthead (container-width) + full-width nav bar with auth inside.
 * Collapses on scroll with smooth Framer Motion animation.
 *
 * A ShareButton is rendered automatically on every page. User-specific routes
 * (/dashboard, /journal, /settings, /profile) share the app homepage URL;
 * all other routes share the current page URL.
 */
export function Header({ className = "" }) {
  const todayStr = formatFullDate(new Date());
  const [isScrolled, setIsScrolled] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/dashboard";

  useLayoutEffect(() => {
    setIsScrolled(window.scrollY > 20);
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 -mx-4 md:-mx-8 transition-colors duration-300 ease-smooth ${
        isScrolled
          ? "bg-page/80 backdrop-blur-xl border-b border-card"
          : ""
      } ${className}`}
    >
      {/* ── Masthead: title + date — smooth collapse on scroll ── */}
      {/* On mobile, only show on home/dashboard tab */}
      <motion.div
        initial={false}
        animate={isScrolled ? "collapsed" : "expanded"}
        variants={{
          expanded: { height: "auto", opacity: 1 },
          collapsed: { height: 0, opacity: 0 },
        }}
        transition={
          hasMounted
            ? {
                height: { duration: 0.3, ease: [0.32, 0.72, 0, 1] },
                opacity: { duration: 0.2, ease: "easeOut" },
              }
            : { duration: 0 }
        }
        className={`overflow-hidden ${!isHome ? "hidden md:block" : ""}`}
      >
        <div className="px-4 md:px-8 pt-3 md:pt-4 pb-5 md:pb-6">
          {/* Centered title */}
          <div className="flex items-center justify-center">
            <Link
              href="/"
              className="font-headline font-extrabold uppercase tracking-display-tight leading-none text-ink text-[1.5rem] sm:text-[1.75rem] md:text-[2rem] hover:opacity-80 transition-opacity text-center"
            >
              The Waterman Report
            </Link>
          </div>

          {/* Date */}
          <div className="flex justify-center mt-2">
            <span className="font-data uppercase text-[0.65rem] md:text-[0.7rem] text-dim tracking-label">
              {todayStr}
            </span>
          </div>
        </div>
        {/* Divider under logo on mobile */}
        <div className="md:hidden border-b border-ink/10" />
      </motion.div>

      {/* Desktop navigation lives in TopNav now. This used to render a
          ViewToggle listing the PREVIOUS five destinations (Home / Report /
          Cams / Journal / Calendar), which meant the whole IA change was
          invisible at width. One nav, one source of truth (navTabs.js). */}

    </header>
  );
}
