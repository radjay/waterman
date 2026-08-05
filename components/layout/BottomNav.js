"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Zap, CalendarClock, Video, Ellipsis } from "lucide-react";
import { NAV_TABS, activeTabFor } from "./navTabs";

const PILL_TRANSITION = "left 0.45s cubic-bezier(0.4, 0, 0.2, 1), width 0.45s cubic-bezier(0.4, 0, 0.2, 1)";

const ICONS = { now: Zap, next: CalendarClock, cams: Video, more: Ellipsis };
const tabs = NAV_TABS.map((tab) => ({ ...tab, icon: ICONS[tab.id] }));

/**
 * BottomNav — floating pill-shaped bottom tab bar for mobile.
 *
 * Uses direct DOM manipulation + CSS transitions instead of Framer Motion
 * to avoid mount/unmount animation issues.
 */
export function BottomNav() {
  const pathname = usePathname();
  const [optimisticTab, setOptimisticTab] = useState(null);
  const tabRefs = useRef({});
  const barRef = useRef(null);
  const pillRef = useRef(null);
  const hasMounted = useRef(false);

  useEffect(() => {
    setOptimisticTab(null);
  }, [pathname]);

  const activeTab = optimisticTab || activeTabFor(pathname);

  const positionPill = useCallback(() => {
    const el = tabRefs.current[activeTab];
    const bar = barRef.current;
    const pill = pillRef.current;
    if (!el || !bar || !pill) return;

    const barRect = bar.getBoundingClientRect();
    const tabRect = el.getBoundingClientRect();

    pill.style.transition = hasMounted.current ? PILL_TRANSITION : "none";
    pill.style.left = `${tabRect.left - barRect.left}px`;
    pill.style.width = `${tabRect.width}px`;
    pill.style.opacity = "1";

    if (!hasMounted.current) {
      hasMounted.current = true;
    }
  }, [activeTab]);

  useLayoutEffect(() => {
    positionPill();
  }, [positionPill]);

  useEffect(() => {
    window.addEventListener("resize", positionPill);
    return () => window.removeEventListener("resize", positionPill);
  }, [positionPill]);

  const hiddenPaths = ["/admin", "/auth", "/ui-kit", "/subscribe", "/request-spot", "/changelog"];
  if (hiddenPaths.some((p) => pathname?.startsWith(p))) return null;

  return (
    <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-[14px]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)" }}
      >
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: 96,
            background: "linear-gradient(to top, rgb(var(--wm-page)) 48%, transparent)",
          }}
        />
        <div
          ref={barRef}
          className="relative flex items-center p-[5px] bg-nav-bg border border-nav-border rounded-pill shadow-nav backdrop-blur-md"
        >
          {/* Always-rendered pill */}
          <div
            ref={pillRef}
            className="absolute top-[5px] bottom-[5px] bg-accent-tint rounded-pill"
            style={{ opacity: 0 }}
          />

          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const inner = (
              <span className="relative z-10 flex flex-col items-center gap-0.5">
                <tab.icon
                  size={17}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? "text-accent" : "text-dim"}
                />
                <span
                  className={`font-data text-[0.47rem] uppercase tracking-[0.1em] leading-none ${
                    isActive ? "text-accent" : "text-dim"
                  }`}
                >
                  {tab.label}
                </span>
              </span>
            );

            const sharedClass =
              "relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-full transition-colors duration-fast ease-smooth";

            return (
                <Link
                  key={tab.id}
                  ref={(el) => { tabRefs.current[tab.id] = el; }}
                  href={tab.path}
                  onClick={() => setOptimisticTab(tab.id)}
                  className={sharedClass}
                  aria-label={tab.label}
                  aria-current={isActive ? "page" : undefined}
                >
                {inner}
              </Link>
            );

          })}
        </div>
    </nav>
  );
}
