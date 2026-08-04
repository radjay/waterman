"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Zap, CalendarClock, Video, Ellipsis, LogIn } from "lucide-react";
import { NAV_TABS, activeTabFor } from "./navTabs";
import { useAuth } from "../auth/AuthProvider";
import UserMenu from "../auth/UserMenu";
import { ShareButton } from "../ui/ShareButton";

/**
 * Desktop navigation.
 *
 * The handoff designed nothing for desktop — every screen was drawn at 390px.
 * But the new IA has to be reachable at width, and the old ViewToggle still
 * listed the PREVIOUS five destinations (Home/Report/Cams/Journal/Calendar), so
 * on desktop the nav change was invisible and, on the new screens, absent
 * entirely: BottomNav is md:hidden and the new pages never rendered Header.
 *
 * So the four tabs are promoted into a header bar at md+, using the same icons,
 * labels and accent-tint active treatment as the floating pill. Mobile keeps
 * the pill. One source of truth for the tabs (navTabs.js) so the two can't
 * drift.
 */
const ICONS = { now: Zap, next: CalendarClock, cams: Video, more: Ellipsis };

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const activeTab = activeTabFor(pathname);

  const hiddenPaths = ["/admin", "/auth", "/ui-kit"];
  if (hiddenPaths.some((p) => pathname?.startsWith(p))) return null;

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <header className="hidden md:block sticky top-0 z-40 bg-page/85 backdrop-blur-xl border-b border-card">
      <div className="max-w-[1200px] mx-auto px-8 h-14 flex items-center gap-6">
        <Link
          href="/"
          className="font-headline font-extrabold text-[19px] tracking-display-tight text-ink leading-none focus-ring"
        >
          Waterman
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-1">
          {NAV_TABS.map((tab) => {
            const Icon = ICONS[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.path}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-pill transition-colors duration-fast ease-smooth focus-ring ${
                  isActive
                    ? "bg-accent-tint text-accent"
                    : "text-dim hover:text-faded-ink hover:bg-ink-hover"
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                <span className="font-data text-[10px] tracking-[0.1em]">{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ShareButton
            url={shareUrl}
            className="h-8 w-8 rounded-full border border-card text-faded-ink hover:bg-ink-hover transition-colors duration-fast ease-smooth"
          />
          {authLoading ? (
            <div className="w-20 h-8" />
          ) : isAuthenticated ? (
            <UserMenu />
          ) : (
            <button
              onClick={() => router.push("/auth/login")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill border border-btn text-ink font-data text-[10px] tracking-[0.1em] hover:bg-ink-hover transition-colors duration-fast ease-smooth focus-ring"
            >
              <LogIn size={14} />
              SIGN IN
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
