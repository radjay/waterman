"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePersistedState } from "../../lib/hooks/usePersistedState";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { MainLayout } from "../../components/layout/MainLayout";
import { PageHeader } from "../../components/layout/PageHeader";
import { SportFilterChip } from "../../components/sport/SportFilterChip";
import { useSport } from "../../components/sport/SportProvider";
import { WeekStrip } from "../../components/next/WeekStrip";
import { ALL_SPOTS, FAVORITES, SpotPicker } from "../../components/next/SpotPicker";
import { useUser } from "../../components/auth/AuthProvider";
import {
  dayStartOf,
  detectWindows,
  isChartedSlot,
  soonestWindow,
  spotSummaries,
  upcomingWindows,
} from "../../lib/windows";
import {
  LiveWindIndicator,
  extractWindguruStationId,
} from "../../components/wind/LiveWindIndicator";
import { spotsWithSlots } from "../../lib/reportData";
import { WindowCard } from "../../components/next/WindowCard";
import { dtf } from "../../lib/datetime";
import { spotFromSlug, toSpotSlug } from "../../lib/spotSlug";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const TZ = "Europe/Lisbon";
const DAY_MS = 24 * 60 * 60 * 1000;
const NEXT_SPOT_STORAGE_KEY = "waterman_next_spot";

const fmt = (ms, options) =>
  dtf("en-GB", { timeZone: TZ, ...options }).format(new Date(ms));

/** Path for a Next scope — shareable for a named spot. */
export function nextPathForScope(scope, spots = []) {
  if (!scope || scope === FAVORITES || scope === ALL_SPOTS) return "/next";
  const spot = spots.find((s) => s._id === scope);
  if (!spot?.name) return "/next";
  return `/next/${toSpotSlug(spot.name)}`;
}

/**
 * @param {string|null} spotSlug - From `/next/[spot]`; null on bare `/next`.
 */
export function NextContent({ spotSlug = null }) {
  const router = useRouter();
  const { sport, meta } = useSport();
  // Persisted for favorites/all and as a fallback when landing on bare /next.
  // A path slug always wins — that is the shareable address of a spot week.
  const [scope, setScope] = usePersistedState(
    NEXT_SPOT_STORAGE_KEY,
    FAVORITES,
    (v) => typeof v === "string"
  );

  const search = useSearchParams();
  // Legacy `?spot=<convexId>` links (Now handoff before path routes). Upgrade
  // them to `/next/<slug>` once spots are loaded so the URL stays shareable.
  const legacySpotId = search.get("spot");

  const user = useUser();
  const favoriteIds = user?.favoriteSpots ?? [];
  const [state, setState] = useState({ loading: true, error: null, bySpot: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const report = await client.query(api.spots.getReportData, { sports: [sport] });
        if (cancelled) return;
        const bySpot = spotsWithSlots(report, sport).map(({ spot, slots }) => ({
          spot,
          slots,
          windows: detectWindows(slots),
        }));
        setState({ loading: false, error: null, bySpot });
      } catch (error) {
        if (cancelled) return;
        setState({ loading: false, error, bySpot: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sport]);

  const { loading, error, bySpot } = state;

  const view = useMemo(() => {
    if (!bySpot) return null;
    const now = Date.now();

    // "Best spot" reads across the coast; a named spot reads only itself.
    // Aggregating hides a spot's own week — a Thursday window looks identical
    // to no window at all when a better spot covers the same hours.
    // A stored spot can outlive the spot itself, or stop supporting the
    // selected sport. Falling back to the whole coast beats rendering an empty
    // week with no explanation.
    const isSpot = scope && scope !== FAVORITES && scope !== ALL_SPOTS;
    const known = isSpot && bySpot.some((s) => s.spot._id === scope) ? scope : null;

    const usingFavorites =
      scope === FAVORITES && bySpot.some(({ spot }) => favoriteIds.includes(spot._id));

    const scoped = known
      ? bySpot.filter((s) => s.spot._id === known)
      : usingFavorites
        ? bySpot.filter(({ spot }) => favoriteIds.includes(spot._id))
        : bySpot;
    const soonest = soonestWindow(scoped, now);
    // Three, not one. A single window answers "when" but not "or else what".
    // Scoped to one spot the question is "when here", so the same beach may
    // legitimately fill all three rows.
    const upcoming = upcomingWindows(scoped, now, 3, { uniqueSpots: !known });

    const today = dayStartOf(now);
    const days = Array.from({ length: 6 }, (_, i) => {
      const dayStart = today + i * DAY_MS;
      const dayEnd = dayStart + DAY_MS;

      // One readout per timestamp. In "best spot" mode that is the best-scoring
      // spot at that hour, named — otherwise the tooltip would show a number
      // from a beach the band does not represent.
      const byTimestamp = new Map();
      for (const { spot, slots } of scoped) {
        for (const slot of slots) {
          if (slot.timestamp < dayStart || slot.timestamp >= dayEnd) continue;
          // Windows must not extend into hours the chart never draws.
          if (!isChartedSlot(slot.timestamp)) continue;
          const existing = byTimestamp.get(slot.timestamp);
          if (!existing || (slot.score ?? -1) > (existing.score ?? -1)) {
            byTimestamp.set(slot.timestamp, {
              ...slot,
              spotName: known ? null : spot.name,
            });
          }
        }
      }

      // Unscored slots are dropped rather than drawn empty. The scorer skips
      // hours outside daylight, so the 22:00 block (which runs to 01:00) has no
      // score and nothing to say — it was stretching the axis three hours past
      // the last real reading and leaving dead track on the right.
      const daySlots = [...byTimestamp.values()]
        .filter((slot) => slot.score !== null && slot.score !== undefined)
        .sort((a, b) => a.timestamp - b.timestamp);

      // Bands are derived from the day's own resolved slots rather than from
      // each spot's windows. In best-spot mode those overlap — several spots
      // cover the same hours — and drawing them on top of each other left
      // seams at every boundary that looked like arbitrary dividers.
      // One slot per timestamp means one continuous band.
      const windows = detectWindows(daySlots);

      const bestScore = windows.reduce(
        (best, w) => (w.score !== null && w.score > (best ?? -1) ? w.score : best),
        null
      );

      return {
        dayStart,
        label: fmt(dayStart, { weekday: "short" }).toUpperCase(),
        windows,
        bestScore,
        slots: daySlots,
      };
    });

    // The list underneath is for the spots the strip is NOT showing — it is a
    // way to switch to them, not a second copy of what is already on screen.
    const featuredId = known ?? soonest?.spot?._id ?? null;
    const others = spotSummaries(
      bySpot.filter(({ spot }) => spot._id !== featuredId),
      now
    );

    return { soonest, upcoming, days, others, featuredId, known, usingFavorites };
  }, [bySpot, scope, favoriteIds.join(",")]);

  const spots = useMemo(() => (bySpot ?? []).map((s) => s.spot), [bySpot]);

  // Path slug → scope. Unknown slug falls back to the coast-wide list.
  useEffect(() => {
    if (!spotSlug || !bySpot) return;
    const match = spotFromSlug(spots, spotSlug);
    if (match) {
      if (scope !== match._id) setScope(match._id);
    } else {
      router.replace("/next", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to path + data
  }, [spotSlug, bySpot, spots]);

  // Legacy ?spot=<id> → /next/<slug>
  useEffect(() => {
    if (!legacySpotId || !bySpot) return;
    const spot = spots.find((s) => s._id === legacySpotId);
    if (spot) {
      router.replace(nextPathForScope(spot._id, spots), { scroll: false });
    } else {
      router.replace("/next", { scroll: false });
    }
  }, [legacySpotId, bySpot, spots, router]);

  // Bare /next with a remembered spot: put the slug in the bar so copy-paste works.
  useEffect(() => {
    if (spotSlug || legacySpotId || !bySpot) return;
    if (!scope || scope === FAVORITES || scope === ALL_SPOTS) return;
    const path = nextPathForScope(scope, spots);
    if (path !== "/next") router.replace(path, { scroll: false });
  }, [spotSlug, legacySpotId, bySpot, scope, spots, router]);

  // Persist + keep the address bar honest so a friend can open the same week.
  const selectScope = useCallback(
    (id) => {
      setScope(id);
      const path = nextPathForScope(id, spots);
      const current =
        typeof window !== "undefined" ? window.location.pathname : "";
      if (current !== path) {
        router.push(path, { scroll: false });
      }
    },
    [setScope, spots, router]
  );

  return (
    <MainLayout>
      <PageHeader
        subtitle="Upcoming windows, then the week at a glance."
        tools={
          <>
            {/* Only when the screen names one spot. Across favourites there is no
                single station the reading could honestly belong to. */}
            {view?.known && (
              <LiveWindIndicator
                stationId={extractWindguruStationId(
                  spots.find((s) => s._id === view.known)?.liveReportUrl
                )}
                label="LIVE"
              />
            )}
            <SportFilterChip />
          </>
        }
      >
        When&rsquo;s next
        <span className="text-faded-ink font-normal mx-[0.28em]">at</span>
        <SpotPicker
          spots={spots}
          value={scope}
          onChange={selectScope}
          hasFavorites={favoriteIds.length > 0}
        />
      </PageHeader>

      {loading && (
        <div className="animate-pulse" aria-hidden="true">
          <div className="rounded-card-lg bg-surface border border-card h-[150px]" />
          <div className="rounded-card bg-surface border border-card h-[220px] mt-6" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-card-lg border border-marginal/30 bg-marginal/10 p-4">
          <div className="font-data text-[10px] tracking-label text-marginal mb-1.5">
            CANNOT REACH THE FORECAST
          </div>
          <p className="text-[13px] text-faded-ink leading-[1.45]">
            This is a connection problem, not an empty week.
          </p>
        </div>
      )}

      {!loading && !error && view && (
        <>
          {view.upcoming.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-3">
              {view.upcoming.map(({ spot, window }, i) => (
                <WindowCard
                  key={`${spot._id}-${window.start}`}
                  spot={spot}
                  window={window}
                  sport={sport}
                  // Naming the spot on every card is noise once the title
                  // already says which spot the screen is about.
                  showSpot={!view.known}
                  highlight={i === 0}
                  onClick={() =>
                    router.push(
                      `/window/${dayStartOf(window.start)}/${window.start}?spot=${spot._id}`
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <div className="rounded-card-lg border border-card bg-surface p-5 text-center">
              <p className="font-headline font-extrabold text-[25px] tracking-display-tight text-ink leading-[1.1]">
                Nothing on this week
              </p>
              <p className="text-[14px] text-faded-ink mt-2.5">
                No {meta.label.toLowerCase()} windows clear 60
                {view.known || view.usingFavorites ? " here" : ""} in the next six days.
              </p>
            </div>
          )}

          <WeekStrip
            days={view.days}
            sport={sport}
            title="This week"
            onSelectWindow={(day, window) => {
              // In best-spot mode a band can be built from several spots, so
              // the peak slot's own spot is the honest owner of the window.
              const spotId = view.known ?? window.peak?.spotId ?? "";
              router.push(
                `/window/${day.dayStart}/${window.start}${spotId ? `?spot=${spotId}` : ""}`
              );
            }}
          />

          {view.others.length > 0 && (
            <section className="pt-[22px]">
              <h2 className="font-headline font-extrabold text-[25px] tracking-display-tight text-ink mb-3">
                {view.known ? "At other spots" : "Elsewhere, this week"}
              </h2>
              <div className="flex flex-col gap-[7px]">
                {view.others.map(({ spot, windowCount, soonest }) => (
                  <button
                    key={spot._id}
                    onClick={() => selectScope(spot._id)}
                    aria-label={`Show the week for ${spot.name}`}
                    className={`w-full text-left flex items-center gap-[11px] rounded-card-sm border px-[13px] py-[11px] focus-ring transition-colors duration-fast ease-smooth ${
                      windowCount === 0
                        ? "border-card opacity-55 hover:opacity-80"
                        : "bg-surface border-card hover:bg-ink-hover"
                    }`}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block font-headline font-bold text-[15px] tracking-display text-ink truncate">
                        {spot.name}
                      </span>
                      <span className="flex items-center gap-2 font-data text-[10px] text-faded-ink mt-0.5">
                        {windowCount === 0
                          ? "Nothing this week"
                          : `${windowCount} window${windowCount === 1 ? "" : "s"}`}
                      </span>
                    </span>
                    {soonest && (
                      <span className="font-data text-[10px] text-accent uppercase flex-none">
                        {dayStartOf(soonest) === dayStartOf(Date.now())
                          ? "TODAY"
                          : fmt(soonest, { weekday: "short" })}
                      </span>
                    )}
                    <ChevronRight size={16} className="text-dim flex-none" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Scope changes live in the title SpotPicker — no second back link. */}
        </>
      )}
    </MainLayout>
  );
}
