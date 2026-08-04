"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { MainLayout } from "../../components/layout/MainLayout";
import { SportFilterChip } from "../../components/sport/SportFilterChip";
import { useSport } from "../../components/sport/SportProvider";
import { WeekStrip } from "../../components/next/WeekStrip";
import { detectWindows, soonestWindow, spotSummaries } from "../../lib/windows";
import { getDisplayWindDirection } from "../../lib/utils";
import { spotsWithSlots } from "../../lib/reportData";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const TZ = "Europe/Lisbon";
const DAY_MS = 24 * 60 * 60 * 1000;

const fmt = (ms, options) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...options }).format(new Date(ms));

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
  const [state, setState] = useState({ loading: true, error: null, data: null });

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

        const now = Date.now();
        const soonest = soonestWindow(bySpot, now);

        // Six day rows, starting today.
        const today = dayStartOf(now);
        const days = Array.from({ length: 6 }, (_, i) => {
          const dayStart = today + i * DAY_MS;
          const dayEnd = dayStart + DAY_MS;
          const windows = bySpot
            .flatMap(({ windows: ws }) => ws)
            .filter((w) => w.start < dayEnd && w.end > dayStart);
          const bestScore = windows.reduce(
            (best, w) => (w.score !== null && w.score > (best ?? -1) ? w.score : best),
            null
          );
          return {
            dayStart,
            label: fmt(dayStart, { weekday: "short" }).toUpperCase(),
            windows,
            bestScore,
          };
        });

        setState({
          loading: false,
          error: null,
          data: { soonest, days, summaries: spotSummaries(bySpot, now) },
        });
      } catch (error) {
        if (cancelled) return;
        setState({ loading: false, error, data: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sport]);

  const { loading, error, data } = state;

  return (
    <MainLayout wide>
      <header className="flex items-center justify-between pt-[22px] pb-3">
        <h1 className="font-headline font-extrabold text-[25px] tracking-display-tight text-ink">
          Next windows
        </h1>
        <SportFilterChip />
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

      {!loading && !error && data && (
        <>
          {data.soonest ? (
            <div className="rounded-card-lg bg-accent-tint-card border border-accent-border p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-data text-[9px] tracking-label-wide text-accent">
                  SOONEST GOOD WINDOW
                </span>
                <AgreementBars agreement={data.soonest.window.agreement} />
              </div>
              <div className="font-headline font-extrabold text-[30px] tracking-display-tight leading-[1.05] text-ink mt-[9px]">
                {sameDay(data.soonest.window.start)
                  ? "Today"
                  : fmt(data.soonest.window.start, { weekday: "long" })}
                , {fmt(data.soonest.window.start, { hour: "2-digit", minute: "2-digit" })} –{" "}
                {fmt(data.soonest.window.end, { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="font-data text-[13px] text-accent mt-1.5 uppercase">
                {data.soonest.spot.name} · {Math.round(data.soonest.window.peak.speed)} kn{" "}
                {getDisplayWindDirection(data.soonest.window.peak.direction)}
              </div>
            </div>
          ) : (
            <div className="rounded-card-lg border border-card bg-surface p-5 text-center">
              <p className="font-headline font-extrabold text-[25px] tracking-display-tight text-ink leading-[1.1]">
                Nothing on this week
              </p>
              <p className="text-[14px] text-faded-ink mt-2.5">
                No {meta.label.toLowerCase()} windows clear 60 in the next six days.
              </p>
            </div>
          )}

          <WeekStrip
            days={data.days}
            sportLabel={meta.label}
            onSelectWindow={(day, window) =>
              router.push(`/window/${day.dayStart}/${window.start}`)
            }
          />

          <section className="pt-[22px]">
            <h2 className="font-data text-[9px] tracking-label-wide text-dim mb-2.5">
              WHERE, THIS WEEK
            </h2>
            <div className="flex flex-col gap-[7px]">
              {data.summaries.map(({ spot, windowCount, soonest }) => (
                <div
                  key={spot._id}
                  className={`flex items-center gap-[11px] rounded-card-sm border px-[13px] py-[11px] ${
                    windowCount === 0
                      ? "border-card opacity-55"
                      : "bg-surface border-card"
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-headline font-bold text-[15px] tracking-display text-ink">
                      {spot.name}
                    </div>
                    <div className="font-data text-[10px] text-faded-ink mt-0.5">
                      {windowCount === 0
                        ? "Nothing this week"
                        : `${windowCount} window${windowCount === 1 ? "" : "s"} · ${describeSpot(spot)}`}
                    </div>
                  </div>
                  {soonest && (
                    <div className="font-data text-[10px] text-accent uppercase">
                      {sameDay(soonest) ? "TODAY" : fmt(soonest, { weekday: "short" })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
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

/**
 * The handoff labels each spot with what kind of riding it offers —
 * "wave + wind", "flat water" — not just a window count. Derived from the
 * spot's own wave data rather than invented.
 */
function describeSpot(spot) {
  if (spot.webcamOnly) return "cam only";
  const hasWaves = Number(spot.maxWaveHeight ?? 0) > 0.5 || spot.sports?.includes("surfing");
  return hasWaves ? "wave + wind" : "flat water";
}

function sameDay(ms) {
  return dayStartOf(ms) === dayStartOf(Date.now());
}
