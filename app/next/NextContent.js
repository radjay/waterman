"use client";

import { useEffect, useMemo, useState } from "react";
import { usePersistedState } from "../../lib/hooks/usePersistedState";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { MainLayout } from "../../components/layout/MainLayout";
import { SportFilterChip } from "../../components/sport/SportFilterChip";
import { useSport } from "../../components/sport/SportProvider";
import { WeekStrip } from "../../components/next/WeekStrip";
import { ALL_SPOTS, FAVORITES, SpotPicker } from "../../components/next/SpotPicker";
import { useUser } from "../../components/auth/AuthProvider";
import { detectWindows, soonestWindow, spotSummaries } from "../../lib/windows";
import { conditionSummary } from "../../lib/conditions";
import { spotsWithSlots } from "../../lib/reportData";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const TZ = "Europe/Lisbon";
const DAY_MS = 24 * 60 * 60 * 1000;
const NEXT_SPOT_STORAGE_KEY = "waterman_next_spot";

const fmt = (ms, options) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...options }).format(new Date(ms));

/** Local midnight for the day containing `ms`, in the spot's timezone. */
function dayStartOf(ms) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (t) => parts.find((p) => p.type === t).value;
  return new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00`).getTime();
}

export function NextContent() {
  const router = useRouter();
  const { sport, meta } = useSport();
  // Persisted: a rider who only drives to one beach should not have to pick it
  // again on every visit. Validated against null-or-string so a stale key from
  // an older build cannot put the screen into an unrenderable state.
  // Defaults to the rider's own spots. Somebody who has told us where they go
  // should not have to say it again on every visit, and a coast-wide view is a
  // worse first answer for them than their own three beaches.
  const [scope, setScope] = usePersistedState(
    NEXT_SPOT_STORAGE_KEY,
    FAVORITES,
    (v) => typeof v === "string"
  );
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

    return { soonest, days, others, featuredId, known, usingFavorites };
  }, [bySpot, scope, favoriteIds.join(",")]);

  const spots = useMemo(() => (bySpot ?? []).map((s) => s.spot), [bySpot]);

  return (
    <MainLayout wide>
      <header className="flex items-start justify-between gap-3 pt-[22px] pb-3">
        <h1 className="font-headline font-extrabold text-[25px] tracking-display-tight text-ink leading-tight">
          Next windows
          {/* Lighter and set off with its own space on each side, so the phrase
              breaks into "what" and "where" rather than reading as one long run
              of bold. A plain word space was not enough separation at 25px. */}
          <span className="text-faded-ink font-normal mx-[0.28em]">at</span>
          <SpotPicker
            spots={spots}
            value={scope}
            onChange={setScope}
            hasFavorites={favoriteIds.length > 0}
          />
        </h1>
        <SportFilterChip className="flex-none mt-1" />
      </header>

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
          {view.soonest ? (
            <div className="rounded-card-lg bg-accent-tint-card border border-accent-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="font-headline font-extrabold text-[30px] tracking-display-tight leading-[1.05] text-ink">
                {dayStartOf(view.soonest.window.start) === dayStartOf(Date.now())
                  ? "Today"
                  : fmt(view.soonest.window.start, { weekday: "long" })}
                , {fmt(view.soonest.window.start, { hour: "2-digit", minute: "2-digit" })} –{" "}
                  {fmt(view.soonest.window.end, { hour: "2-digit", minute: "2-digit" })}
                </div>
                <AgreementBars agreement={view.soonest.window.agreement} />
              </div>
              <div className="font-data text-[13px] text-accent mt-1.5 uppercase">
                {view.soonest.spot.name} ·{" "}
                {conditionSummary(view.soonest.window.peak, sport, { gust: true }) ?? "—"}
              </div>
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
            title="The week"
            onSelectWindow={(day, window) =>
              router.push(`/window/${day.dayStart}/${window.start}`)
            }
          />

          {view.others.length > 0 && (
            <section className="pt-[22px]">
              <h2 className="font-headline font-extrabold text-[25px] tracking-display-tight text-ink mb-3">
                {view.known ? "Other spots" : "Elsewhere, this week"}
              </h2>
              <div className="flex flex-col gap-[7px]">
                {view.others.map(({ spot, windowCount, soonest }) => (
                  <button
                    key={spot._id}
                    onClick={() => setScope(spot._id)}
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
                      <span className="block font-data text-[10px] text-faded-ink mt-0.5">
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

          {view.known && (
            <button
              onClick={() => setScope(FAVORITES)}
              className="mt-4 font-data text-[10px] tracking-label text-faded-ink hover:text-ink focus-ring"
            >
              ← BACK TO ALL WINDOWS
            </button>
          )}
        </>
      )}
    </MainLayout>
  );
}

/**
 * Five bars showing how many models back the window, matching the handoff's
 * 13x5px row. Renders track-coloured throughout when there is no per-model data
 * — five empty bars say "we cannot tell", which is honest; omitting them would
 * silently imply the question was never asked.
 */
function AgreementBars({ agreement, total = 5 }) {
  const agreed = agreement?.agreed ?? 0;
  return (
    <span className="flex gap-[3px] flex-none" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`w-[13px] h-[5px] rounded-[2px] ${i < agreed ? "bg-accent" : "bg-track"}`}
        />
      ))}
    </span>
  );
}
