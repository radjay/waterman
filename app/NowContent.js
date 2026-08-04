"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, MapPin, Share } from "lucide-react";
import { MainLayout } from "../components/layout/MainLayout";
import { useSport } from "../components/sport/SportProvider";
import { useUser } from "../components/auth/AuthProvider";
import { useFlag } from "../components/flags/FlagProvider";
import { VerdictCard } from "../components/now/VerdictCard";
import { VERDICT } from "../lib/verdict";
import { EvidenceStack, InTheWaterCard } from "../components/now/EvidenceStack";
import { LabsSection } from "../components/ui/LabsSection";
import { LiveCam, streamUrlFor } from "../components/now/LiveCam";
import { WebcamFullscreen } from "../components/webcam/WebcamFullscreen";
import { useNowData } from "../components/now/useNowData";
import { WindowCard } from "../components/next/WindowCard";
import { riderCount as fixtureRiderCount } from "../lib/fixtures/riderCounts";
import { primaryMetric } from "../lib/conditions";
import { dayStartOf } from "../lib/windows";
import { useShare } from "../hooks/useShare";

export function NowContent() {
  const router = useRouter();
  const { sport, meta } = useSport();
  const showRiderCounts = useFlag("riderCounts");
  const showStation = useFlag("stationEvidence");
  const showModels = useFlag("modelConfidence");
  const user = useUser();
  const favoriteIds = user?.favoriteSpots ?? [];
  const { loading, error, data } = useNowData(sport, favoriteIds);
  // The cam opens where it already is. Sending the rider to /cams to watch the
  // picture they were already looking at loses the verdict it belongs to.
  const [camOpen, setCamOpen] = useState(false);
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
            score={data.slot?.score}
            metric={primaryMetric(data.slot, sport)}
            liveReportUrl={data.spot?.liveReportUrl}
            reason={data.reason}
            riderCount={riderCount}
            reasoning={data.reasoning}
            trajectory={data.trajectory}
            better={data.better}
            elsewhereToday={data.elsewhereToday}
            onSeeElsewhere={() => router.push("/next")}
            // On a NO GO the video is the least useful thing on screen and was
            // taking half the viewport. Collapsed to a strip, still one tap
            // from the full picture.
            compactCam={data.verdict === VERDICT.NO}
            camSlot={data.spot && streamUrlFor(data.spot) ? <LiveCam spot={data.spot} /> : null}
            // The cam itself is the affordance — a separate WATCH CAM button
            // underneath was a second control for the same thing.
            onOpenCam={() => setCamOpen(true)}
            // The verdict is about one spot; the card is the way into that
            // spot's week rather than into the coast-wide list.
            onOpenSpot={
              data.spot ? () => router.push(`/next?spot=${data.spot._id}`) : undefined
            }
          />

          {camOpen && data.spot && (
            <WebcamFullscreen
              spot={data.spot}
              score={data.slot?.score}
              onClose={() => setCamOpen(false)}
            />
          )}

          {/* Three, not one. A single next window answers "when" but not "or
              else what", and on a flat day the second and third options are the
              ones that actually get someone on the water. */}
          {data.nextWindows?.length > 0 && (
            <section className="pt-5">
              <h2 className="font-data text-[9px] tracking-label-wide text-dim mb-[11px]">
                NEXT WINDOWS
              </h2>
              <div className="grid gap-2 md:grid-cols-3">
                {data.nextWindows.map(({ spot, window }, i) => (
                  <WindowCard
                    key={`${spot._id}-${window.start}`}
                    spot={spot}
                    window={window}
                    sport={sport}
                    highlight={i === 0}
                    onClick={() =>
                      // dayStartOf, not window.start — Next generates the day
                      // segment that way, and two callers disagreeing about
                      // what the first path segment means is a URL nobody can
                      // rely on.
                      router.push(
                        `/window/${dayStartOf(window.start)}/${window.start}?spot=${spot._id}`
                      )
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* `reasoning` is deliberately not passed: it now sits under the
              verdict where it belongs, and the stack would render it a second
              time as its backstop card. */}
          <EvidenceStack
            station={showStation ? data.station : null}
            agreement={showModels ? data.agreement : null}
          />

          {riderCount && (
            <LabsSection title="IN THE WATER" caption="Estimated from webcam footage">
              <InTheWaterCard reading={riderCount} sportNoun={meta.noun} bare />
            </LabsSection>
          )}

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
