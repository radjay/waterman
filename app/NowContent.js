"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, ChevronRight, MapPin, Share } from "lucide-react";
import { MainLayout } from "../components/layout/MainLayout";
import { useSport } from "../components/sport/SportProvider";
import { useUser } from "../components/auth/AuthProvider";
import { useFlag } from "../components/flags/FlagProvider";
import { VerdictCard } from "../components/now/VerdictCard";
import { EvidenceStack } from "../components/now/EvidenceStack";
import { LiveCam, streamUrlFor } from "../components/now/LiveCam";
import { useNowData } from "../components/now/useNowData";
import { riderCount as fixtureRiderCount } from "../lib/fixtures/riderCounts";
import { relativeDay } from "../lib/verdict";
import { conditionSummary, primaryMetric } from "../lib/conditions";
import { useShare } from "../hooks/useShare";

const TZ = "Europe/Lisbon";
const time = (ms) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(
    new Date(ms)
  );
const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function NowContent() {
  const router = useRouter();
  const { sport, meta } = useSport();
  const showRiderCounts = useFlag("riderCounts");
  const showStation = useFlag("stationEvidence");
  const showModels = useFlag("modelConfidence");
  const user = useUser();
  const favoriteIds = user?.favoriteSpots ?? [];
  const { loading, error, data } = useNowData(sport, favoriteIds);
  const { share } = useShare({
    url: typeof window !== "undefined" ? window.location.href : "",
    title: "Waterman",
  });

  // Fixtures only. Never written to Convex — production and development share
  // one deployment, so seeded dummies would be shown to real users.
  const riderCount = showRiderCounts && data?.spot ? fixtureRiderCount(data.spot._id) : null;

  return (
    <MainLayout>
      <header className="flex items-center justify-between gap-3 pt-[22px] pb-3.5">
        {/* The wordmark is in TopNav at md+, so repeating it here stacks a
            second logo under the first. Mobile has no TopNav, so it stays. */}
        <h1 className="md:hidden font-headline font-extrabold text-[22px] tracking-display-tight text-ink leading-none">
          Waterman
        </h1>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={share}
            aria-label="Share"
            className="md:hidden w-9 h-9 flex-none flex items-center justify-center rounded-pill border border-btn text-faded-ink focus-ring"
          >
            <Share size={14} />
          </button>
        </div>
      </header>

      {loading && <NowSkeleton />}

      {/* An error is not a flat day. Saying "nothing on" when the backend
          failed is the RAD-59 bug, and it destroys trust in every other NO. */}
      {!loading && error && (
        <div className="rounded-card-lg border border-marginal/30 bg-marginal/10 p-4">
          <div className="font-data text-[10px] tracking-label text-marginal mb-1.5">
            CANNOT REACH THE FORECAST
          </div>
          <p className="text-[13px] text-faded-ink leading-[1.45]">
            This is a connection problem, not a flat day. Try again in a moment.
          </p>
          <button
            onClick={() => router.refresh()}
            className="mt-3 font-data text-[11px] tracking-label text-accent focus-ring"
          >
            RETRY
          </button>
        </div>
      )}

      {!loading && !error && data?.needsFavorites && (
        <div className="rounded-card-xl border border-card bg-surface p-5 mt-1">
          <h2 className="font-headline font-extrabold text-[25px] tracking-display-tight text-ink leading-[1.1]">
            Which spots are yours?
          </h2>
          <p className="text-[14px] text-faded-ink mt-2.5 leading-[1.5]">
            Now answers &ldquo;can I go&rdquo; for one spot. Tell us where you actually ride and
            it will speak for those — otherwise it would rank the whole coast and could send
            you an hour up the road without saying so.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <button
              onClick={() => router.push("/settings")}
              className="flex items-center gap-2 rounded-pill bg-accent text-page px-4 py-2.5 font-data text-[11px] font-bold tracking-[0.1em] focus-ring active:scale-[0.98] transition-transform duration-fast ease-smooth"
            >
              <MapPin size={14} />
              CHOOSE YOUR SPOTS
            </button>
            <button
              onClick={() => router.push("/next")}
              className="flex items-center gap-2 rounded-pill border border-btn text-ink px-4 py-2.5 font-data text-[11px] tracking-[0.1em] focus-ring hover:bg-ink-hover transition-colors duration-fast ease-smooth"
            >
              <CalendarClock size={14} />
              SEE NEXT WINDOWS
            </button>
          </div>
        </div>
      )}

      {!loading && !error && data && !data.needsFavorites && (
        <>
          <VerdictCard
            verdict={data.verdict}
            sport={sport}
            spotName={data.spot?.name}
            metric={primaryMetric(data.slot, sport)}
            liveReportUrl={data.spot?.liveReportUrl}
            reason={data.reason}
            riderCount={riderCount}
            camSlot={data.spot && streamUrlFor(data.spot) ? <LiveCam spot={data.spot} /> : null}
            // The cam itself is the affordance — a separate WATCH CAM button
            // underneath was a second control for the same thing.
            onWatchCam={() => router.push("/cams")}
          />

          {/* Three, not one. A single next window answers "when" but not "or
              else what", and on a flat day the second and third options are the
              ones that actually get someone on the water. */}
          {data.nextWindows?.length > 0 && (
            <section className="pt-5">
              <h2 className="font-data text-[9px] tracking-label-wide text-dim mb-[11px]">
                NEXT WINDOWS
              </h2>
              <div className="flex flex-col gap-2">
                {data.nextWindows.map(({ spot, window }, i) => (
                  <button
                    key={`${spot._id}-${window.start}`}
                    onClick={() =>
                      router.push(
                        `/window/${window.start}/${window.start}?spot=${spot._id}`
                      )
                    }
                    className={`w-full text-left flex items-center gap-3 rounded-[15px] border px-[14px] py-[13px] focus-ring transition-colors duration-fast ease-smooth ${
                      i === 0
                        ? "bg-accent-tint-card border-accent-border"
                        : "bg-surface border-card hover:bg-ink-hover"
                    }`}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block font-headline font-bold text-[15px] tracking-display text-ink truncate">
                        {capitalise(relativeDay(window.start))} · {spot.name}
                      </span>
                      <span className="block font-data text-[10px] text-faded-ink mt-0.5">
                        {time(window.start)}–{time(window.end)}
                        {conditionSummary(window.peak, sport)
                          ? ` · ${conditionSummary(window.peak, sport)}`
                          : ""}
                      </span>
                    </span>
                    <ChevronRight size={16} className={i === 0 ? "text-accent" : "text-dim"} />
                  </button>
                ))}
              </div>
            </section>
          )}

          <EvidenceStack
            riderCount={riderCount}
            station={showStation ? data.station : null}
            agreement={showModels ? data.agreement : null}
            reasoning={data.reasoning}
            sportNoun={meta.noun}
          />

          {!data.spot && (
            <div className="pt-10 text-center">
              <p className="font-headline font-extrabold text-[27px] tracking-display-tight text-ink leading-[1.1]">
                {data.noSpotForSport
                  ? `None of your spots do ${meta.label.toLowerCase()}`
                  : "Nothing on right now"}
              </p>
              <p className="text-[14px] text-faded-ink mt-3">
                {data.noSpotForSport
                  ? "Pick another sport, or add a spot that does."
                  : `No conditions for ${meta.label.toLowerCase()} at your spots at the moment.`}
              </p>
              <button
                onClick={() => router.push("/next")}
                className="mt-5 font-data text-[11px] tracking-label text-accent focus-ring"
              >
                SEE NEXT WINDOWS →
              </button>
            </div>
          )}
        </>
      )}
    </MainLayout>
  );
}

/**
 * Evidence arrives separately from the forecast — station and rider counts are
 * different round trips — so each card needs its own resting state rather than
 * the whole screen blocking on the slowest one.
 */
function NowSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="rounded-card-xl bg-surface border border-card h-[260px]" />
      <div className="h-3 w-28 bg-surface rounded mt-6 mb-3" />
      <div className="flex flex-col gap-2">
        <div className="rounded-[15px] bg-surface border border-card h-[68px]" />
        <div className="rounded-[15px] bg-surface border border-card h-[68px]" />
        <div className="rounded-[15px] bg-surface border border-card h-[68px]" />
      </div>
    </div>
  );
}
