"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, MapPin } from "lucide-react";
import { MainLayout } from "../components/layout/MainLayout";
import { useSport } from "../components/sport/SportProvider";
import { useUser } from "../components/auth/AuthProvider";
import { useFlag } from "../components/flags/FlagProvider";
import { VerdictCard } from "../components/now/VerdictCard";
import { InTheWaterCard, ModelAgreementCard } from "../components/now/EvidenceStack";
import { LabsSection } from "../components/ui/LabsSection";
import { agreementSentence, BANDS } from "../lib/agreement";
import { LiveCam, streamUrlFor } from "../components/now/LiveCam";
import { WebcamFullscreen } from "../components/webcam/WebcamFullscreen";
import { useNowData } from "../components/now/useNowData";
import { WindowCard } from "../components/next/WindowCard";
import { riderCount as fixtureRiderCount } from "../lib/fixtures/riderCounts";
import { primaryMetric } from "../lib/conditions";
import { dayStartOf } from "../lib/windows";
import { toSpotSlug } from "../lib/spotSlug";
import { VERDICT } from "../lib/verdict";

export function NowContent() {
  const router = useRouter();
  const { sport, meta } = useSport();
  const showRiderCounts = useFlag("riderCounts");
  const showStation = useFlag("stationEvidence");
  const showModels = useFlag("modelConfidence");
  const user = useUser();
  const favoriteIds = user?.favoriteSpots ?? [];
  const { loading, error, data } = useNowData(sport, favoriteIds);
  // Which cam is open (spot id) — two verdict cards may each have a stream.
  const [camSpotId, setCamSpotId] = useState(null);

  const verdicts = data?.verdicts ?? [];
  const primary = verdicts[0] ?? null;

  return (
    <MainLayout>
      {loading && <NowSkeleton />}

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
          <div className="flex flex-col gap-3">
            {verdicts.map((pack, index) => {
              const riderCount =
                showRiderCounts && pack.spot
                  ? fixtureRiderCount(pack.spot._id)
                  : null;
              return (
                <VerdictCard
                  key={pack.spot?._id ?? index}
                  verdict={pack.verdict}
                  sport={sport}
                  spotName={pack.spot?.name}
                  score={pack.slot?.score}
                  metric={primaryMetric(pack.slot, sport)}
                  liveReportUrl={pack.spot?.liveReportUrl}
                  riderCount={riderCount}
                  station={showStation ? pack.station : null}
                  waves={pack.waves}
                  trajectory={pack.trajectory}
                  // Elsewhere only on the primary card when it is a flat day.
                  elsewhereToday={
                    index === 0 && pack.verdict === VERDICT.NO
                      ? data.elsewhereToday
                      : 0
                  }
                  onSeeElsewhere={() => router.push("/next")}
                  camSlot={
                    pack.spot && streamUrlFor(pack.spot) ? (
                      <LiveCam spot={pack.spot} />
                    ) : null
                  }
                  onOpenCam={() => setCamSpotId(pack.spot?._id ?? null)}
                  onOpenSpot={
                    pack.spot
                      ? () => router.push(`/next/${toSpotSlug(pack.spot.name)}`)
                      : undefined
                  }
                />
              );
            })}
          </div>

          {camSpotId &&
            (() => {
              const pack = verdicts.find((v) => v.spot?._id === camSpotId);
              if (!pack?.spot) return null;
              return (
                <WebcamFullscreen
                  spot={pack.spot}
                  score={pack.slot?.score}
                  onClose={() => setCamSpotId(null)}
                />
              );
            })()}

          {data.nextWindows?.length > 0 && (
            <section className="pt-4">
              <div className="flex items-baseline justify-between gap-3 mb-2.5">
                <h2 className="font-data text-[9px] tracking-label-wide text-dim">
                  IF NOT NOW
                </h2>
                <button
                  type="button"
                  onClick={() => router.push("/next")}
                  className="font-data text-[10px] tracking-label text-accent focus-ring hover:underline"
                >
                  SEE THE WEEK →
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {data.nextWindows.map(({ spot, window }, i) => (
                  <WindowCard
                    key={`${spot._id}-${window.start}`}
                    spot={spot}
                    window={window}
                    sport={sport}
                    highlight={i === 0}
                    onClick={() =>
                      router.push(
                        `/window/${dayStartOf(window.start)}/${window.start}?spot=${spot._id}`
                      )
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* Model agreement lives in Labs — same pattern as the window page.
              It is a curiosity, not the reason for the verdict above. */}
          {showModels &&
            primary?.agreement &&
            primary.agreement.band !== BANDS.UNKNOWN && (
              <LabsSection
                title="Model comparison"
                caption={
                  agreementSentence(primary.agreement) ??
                  `${primary.agreement.agreed} of ${primary.agreement.total}`
                }
              >
                <ModelAgreementCard agreement={primary.agreement} bare />
              </LabsSection>
            )}

          {showRiderCounts && primary?.spot && fixtureRiderCount(primary.spot._id) && (
            <LabsSection title="IN THE WATER" caption="Estimated from webcam footage">
              <InTheWaterCard
                reading={fixtureRiderCount(primary.spot._id)}
                sportNoun={meta.noun}
                bare
              />
            </LabsSection>
          )}

          {verdicts.length === 0 && (
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
