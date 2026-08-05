"use client";

import Link from "next/link";
import {
  BookOpen,
  Calendar,
  CalendarClock,
  ChevronRight,
  CircleGauge,
  FileText,
  List,
  LogIn,
  MapPin,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import { MainLayout } from "../../components/layout/MainLayout";
import { PageHeader } from "../../components/layout/PageHeader";
import { useAuth } from "../../components/auth/AuthProvider";
import { useFlagAdmin } from "../../components/flags/FlagProvider";
import { FLAGS } from "../../lib/flags";

/**
 * Everything the new IA demotes.
 *
 * The legacy surfaces are kept and reachable rather than deleted — shareable
 * /wing/best links, /report/[spot] deep links and the ICS feeds all still work,
 * and the detailed forecast table carries more than the week strip does.
 *
 * There is deliberately no Alerts entry. Nothing can deliver an alert yet, and
 * a "coming soon" row promising to wake a rider up is worse than its absence.
 */
const GROUPS = [
  {
    title: "FORECAST",
    items: [
      { href: "/report", label: "Full report", hint: "Every slot, every spot", icon: List },
      { href: "/calendar", label: "Calendar", hint: "Windows by day", icon: Calendar },
      { href: "/dashboard", label: "Dashboard", hint: "The previous home screen", icon: CircleGauge },
      { href: "/subscribe", label: "Calendar feed", hint: "Subscribe in your calendar app", icon: CalendarClock },
    ],
  },
  {
    title: "YOURS",
    items: [
      { href: "/journal", label: "Journal", hint: "Your sessions", icon: BookOpen },
      { href: "/settings", label: "Settings", hint: "Sports, spots, appearance", icon: Settings },
      { href: "/profile", label: "Profile", hint: "Name and account", icon: User },
      { href: "/profile/spots", label: "Spot notes", hint: "Improve your scores", icon: Sparkles },
    ],
  },
  {
    title: "ABOUT",
    items: [
      { href: "/request-spot", label: "Request a spot", hint: "Somewhere missing?", icon: MapPin },
      { href: "/changelog", label: "Changelog", hint: "What changed", icon: FileText },
    ],
  },
];

export default function MorePage() {
  const { isAuthenticated } = useAuth();
  const flagAdmin = useFlagAdmin();

  return (
    <MainLayout>
      <PageHeader
        title="More"
        subtitle="Settings, journal, and the rest."
      />

      {!isAuthenticated && (
        <Link
          href="/auth/login"
          className="flex items-center gap-3 rounded-card-lg bg-accent-tint-card border border-accent-border p-4 mb-6 focus-ring"
        >
          <LogIn size={18} className="text-accent" />
          <span className="flex-1">
            <span className="block text-[14px] text-ink font-medium">Sign in</span>
            <span className="block font-data text-[10px] text-faded-ink mt-0.5">
              Save spots and personalise your scores
            </span>
          </span>
          <ChevronRight size={17} className="text-dim" />
        </Link>
      )}

      <div className="flex flex-col gap-7">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="font-data text-[9px] tracking-label-wide text-dim mb-[11px]">
              {group.title}
            </h2>
            <div className="flex flex-col gap-2">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-[11px] rounded-card-sm bg-surface border border-card px-[14px] py-[13px] hover:bg-ink-hover transition-colors duration-fast ease-smooth focus-ring"
                >
                  <item.icon size={16} className="text-faded-ink" />
                  <span className="flex-1">
                    <span className="block text-[13px] text-ink">{item.label}</span>
                    <span className="block font-data text-[10px] text-faded-ink mt-0.5">
                      {item.hint}
                    </span>
                  </span>
                  <ChevronRight size={16} className="text-dim" />
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* Only rendered in builds that opted into overrides — never production. */}
        {flagAdmin?.canOverride && (
          <section>
            <h2 className="font-data text-[9px] tracking-label-wide text-marginal mb-[11px]">
              FEATURE FLAGS · NON-PRODUCTION
            </h2>
            <div className="flex flex-col gap-2">
              {Object.entries(FLAGS).map(([name, def]) => (
                <label
                  key={name}
                  className="flex items-center gap-3 rounded-card-sm bg-surface border border-card px-[14px] py-[13px] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(flagAdmin.flags[name])}
                    onChange={(e) => flagAdmin.setFlag(name, e.target.checked)}
                    className="accent-[rgb(var(--wm-accent))]"
                  />
                  <span className="flex-1">
                    <span className="block font-data text-[11px] text-ink">{name}</span>
                    <span className="block text-[11px] text-faded-ink mt-0.5">
                      {def.description}
                    </span>
                  </span>
                </label>
              ))}
              <button
                onClick={flagAdmin.resetFlags}
                className="self-start font-data text-[10px] tracking-label text-dim mt-1 focus-ring"
              >
                RESET TO BUILD DEFAULTS
              </button>
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
}
