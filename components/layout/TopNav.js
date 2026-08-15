"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Zap, CalendarClock, Video, Ellipsis, LogIn } from "lucide-react";
import { NAV_TABS, activeTabFor } from "./navTabs";
import { useAuth, useUser } from "../auth/AuthProvider";
import { SportSegmented } from "../sport/SportSegmented";

/**
 * The desktop header: wordmark · tabs · sport · account.
 *
 * Every control in this bar is a 34px pill with matching radius, including the
 * segmented sport control whose items fill the group height. That uniformity is
 * the whole design of the bar — mixed heights made the sport selector read as a
 * fifth tab that had somehow grown.
 *
 * One source of truth for the tabs (navTabs.js) so this and the mobile pill
 * cannot drift.
 */
const ICONS = { now: Zap, next: CalendarClock, cams: Video, more: Ellipsis };

export function TopNav({ tools = null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const user = useUser();
  const activeTab = activeTabFor(pathname);

  const hiddenPaths = ["/admin", "/auth", "/ui-kit"];
  if (hiddenPaths.some((p) => pathname?.startsWith(p))) return null;

  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();
  const handle = (user?.name || user?.email || "").split("@")[0].slice(0, 8).toUpperCase();

  return (
    <header className="hidden md:block sticky top-0 z-40 bg-page/90 backdrop-blur-xl border-b border-card">
      <div className="mx-auto max-w-[1440px] px-10 h-[66px] flex items-center gap-[34px]">
        <Link
          href="/"
          className="font-headline font-extrabold text-[21px] tracking-display-tight text-ink leading-none focus-ring rounded-[4px]"
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
                className={`flex items-center gap-[7px] h-[34px] px-[15px] rounded-pill font-data text-[11px] tracking-[0.12em] transition-colors duration-fast ease-smooth focus-ring ${
                  isActive
                    ? "bg-accent-tint text-accent"
                    : "text-dim hover:text-ink hover:bg-ink-hover"
                }`}
              >
                <Icon size={14} strokeWidth={isActive ? 2.4 : 2} />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          {tools}
          <SportSegmented />
          {authLoading ? (
            <div className="w-[86px] h-[34px]" />
          ) : isAuthenticated ? (
            <Link
              href="/settings"
              className="flex items-center gap-2 h-[34px] border border-nav-border rounded-pill pl-1 pr-[14px] focus-ring hover:bg-ink-hover transition-colors duration-fast ease-smooth"
            >
              <span className="w-6 h-6 rounded-full bg-accent-tint text-accent flex items-center justify-center font-data text-[11px]">
                {initial}
              </span>
              <span className="font-data text-[11px] tracking-[0.1em] text-faded-ink">
                {handle || "ME"}
              </span>
            </Link>
          ) : (
            <button
              onClick={() => router.push("/auth/login")}
              className="flex items-center gap-1.5 h-[34px] px-[15px] rounded-pill border border-nav-border text-faded-ink font-data text-[10.5px] tracking-[0.1em] hover:bg-ink-hover hover:text-ink transition-colors duration-fast ease-smooth focus-ring"
            >
              <LogIn size={13} />
              SIGN IN
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
