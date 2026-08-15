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

    // Measure the slot (grid cell), not getBoundingClientRect against the bar
    // border box — that pairing could stretch the highlight across neighbouring
    // tabs when padding/border and flex intrinsic widths disagreed.
    pill.style.transition = hasMounted.current ? PILL_TRANSITION : "none";
    pill.style.left = `${el.offsetLeft}px`;
    pill.style.width = `${el.offsetWidth}px`;
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
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: 92,
            background: "linear-gradient(to top, rgb(var(--wm-page)) 50%, transparent)",
          }}
        />
        <div
          ref={barRef}
          className="relative grid grid-cols-4 items-center h-[56px] p-[5px] bg-nav-bg border border-nav-border rounded-pill shadow-nav backdrop-blur-md"
        >
          {/* Always-rendered pill — one slot wide, slides under the active tab */}
          <div
            ref={pillRef}
            className="absolute top-[5px] bottom-[5px] bg-accent-tint rounded-pill pointer-events-none"
            style={{ opacity: 0 }}
          />

          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <div
                key={tab.id}
                ref={(el) => { tabRefs.current[tab.id] = el; }}
                className="relative z-10 min-w-0 h-full"
              >
                <Link
                  href={tab.path}
                  onClick={() => setOptimisticTab(tab.id)}
                  className="flex h-full w-full flex-col items-center justify-center gap-[3px] rounded-full transition-colors duration-fast ease-smooth"
                  aria-label={tab.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <tab.icon
                    size={17}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={isActive ? "text-accent" : "text-dim"}
                  />
                  <span
                    className={`font-data text-[7.5px] uppercase tracking-[0.1em] leading-none ${
                      isActive ? "text-accent" : "text-dim"
                    }`}
                  >
                    {tab.label}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
    </nav>
  );
}
