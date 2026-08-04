"use client";

import { useRouter } from "next/navigation";
import { Share, Video } from "lucide-react";
import { MainLayout } from "../components/layout/MainLayout";
import { SportSegmented } from "../components/sport/SportSegmented";
import { useSport } from "../components/sport/SportProvider";
import { useFlag } from "../components/flags/FlagProvider";
import { VerdictCard } from "../components/now/VerdictCard";
import { EvidenceStack } from "../components/now/EvidenceStack";
import { LiveCam, streamUrlFor } from "../components/now/LiveCam";
import { useNowData } from "../components/now/useNowData";
import { riderCount as fixtureRiderCount } from "../lib/fixtures/riderCounts";
import { VERDICT, relativeDay } from "../lib/verdict";
import { getDisplayWindDirection } from "../lib/utils";
import { useShare } from "../hooks/useShare";

export function NowContent() {
  const router = useRouter();
  const { sport, meta } = useSport();
  const showRiderCounts = useFlag("riderCounts");
  const showStation = useFlag("stationEvidence");
  const showModels = useFlag("modelConfidence");
  const { loading, error, data } = useNowData(sport);
  const { share } = useShare({
    url: typeof window !== "undefined" ? window.location.href : "",
    title: "Waterman",
  });

  // Fixtures only. Never written to Convex — production and development share
  // one deployment, so seeded dummies would be shown to real users.
  const riderCount =
    showRiderCounts && data?.spot ? fixtureRiderCount(data.spot._id) : null;

  return (
    <MainLayout>
      <header className="flex items-center justify-between gap-3 pt-[22px] pb-3.5">
        <h1 className="font-headline font-extrabold text-[22px] tracking-display-tight text-ink leading-none">
          Waterman
        </h1>
        <SportSegmented />
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

      {!loading && !error && data && (
        <>
          <VerdictCard
            verdict={data.verdict ?? VERDICT.NO}
            sport={sport}
            speed={data.slot?.speed}
            gust={data.slot?.gust}
            directionLabel={
              data.slot ? getDisplayWindDirection(data.slot.direction) : null
            }
            directionDegrees={data.slot?.direction}
            reason={data.reason}
            riderCount={riderCount}
            camSlot={
              data.spot && streamUrlFor(data.spot) ? <LiveCam spot={data.spot} /> : null
            }
            onWatchCam={() => router.push("/cams")}
          />

          <EvidenceStack
            riderCount={riderCount}
            station={showStation ? data.station : null}
            agreement={showModels ? data.agreement : null}
            reasoning={data.reasoning}
            sportNoun={meta.noun}
          />

          <div className="flex gap-2 pt-[18px]">
            <button
              onClick={() => router.push("/cams")}
              className="flex-1 flex items-center justify-center gap-[7px] rounded-pill bg-accent text-page py-[13px] font-data text-[11px] font-bold tracking-[0.1em] focus-ring active:scale-[0.98] transition-transform duration-fast ease-smooth"
            >
              <Video size={14} />
              WATCH CAM
            </button>
            <button
              onClick={share}
              aria-label="Share"
              className="w-12 flex items-center justify-center rounded-pill border border-btn text-faded-ink focus-ring"
            >
              <Share size={15} />
            </button>
          </div>

          {/* When the answer is no, the screen pivots to where to look instead.
              A flat day is the most common real screen, not an edge case. */}
          {data.verdict === VERDICT.NO && data.nextWindow && (
            <button
              onClick={() => router.push("/next")}
              className="w-full text-left mt-4 rounded-card-lg bg-accent-tint-card border border-accent-border p-4 focus-ring"
            >
              <div className="font-data text-[9px] tracking-label-wide text-accent mb-1">
                NEXT WINDOW
              </div>
              <div className="font-headline font-bold text-[17px] tracking-display text-ink">
                {capitalise(relativeDay(data.nextWindow.window.start))} ·{" "}
                {data.nextWindow.spot.name}
              </div>
              <div className="font-data text-[11px] text-faded-ink mt-0.5">
                from{" "}
                {new Intl.DateTimeFormat("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Europe/Lisbon",
                }).format(new Date(data.nextWindow.window.start))}
              </div>
            </button>
          )}

          {!data.spot && (
            <div className="pt-10 text-center">
              <p className="font-headline font-extrabold text-[27px] tracking-display-tight text-ink leading-[1.1]">
                Nothing on right now
              </p>
              <p className="text-[14px] text-faded-ink mt-3">
                No spot has conditions for {meta.label.toLowerCase()} at the moment.
              </p>
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
const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function NowSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="rounded-card-xl bg-surface border border-card h-[260px]" />
      <div className="h-3 w-28 bg-surface rounded mt-6 mb-3" />
      <div className="flex flex-col gap-2">
        <div className="rounded-card-sm bg-surface border border-card h-[104px]" />
        <div className="rounded-card-sm bg-surface border border-card h-[104px]" />
      </div>
    </div>
  );
}
