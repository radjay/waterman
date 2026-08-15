"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TvMinimal } from "lucide-react";
import { MainLayout } from "../../components/layout/MainLayout";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { useSport, isWindSport } from "../../components/sport/SportProvider";
import { useCoastData } from "../../components/data/useCoastData";
import { useIsDesktop } from "../../lib/hooks/useMediaQuery";
import { useSelectedSpot } from "../../lib/hooks/useSelectedSpot";
import { ALL_SPOTS, ALL_COAST_SPOTS, SpotPickerSheet } from "../../components/spot/SpotPickerSheet";
import { LiveCard, LiveLegend } from "../../components/live/LiveCard";
import { WebcamFullscreen } from "../../components/webcam/WebcamFullscreen";
import { TvMode } from "../../components/webcam/TvMode";
import { ScreenError, ScreenEmpty, ScreenSkeleton } from "../../components/common/ScreenState";
import { buildDayChart } from "../../lib/dayChart";

/**
 * Live — what is actually happening, against what was forecast.
 *
 * Every card carries both: the cam for the eye and the station line drawn over
 * the forecast columns for the argument. A rider who can see whitecaps and a
 * model that says 12 knots is the most useful thing this app can show, and it
 * only works if the two sit on the same card.
 *
 * Scores are CURRENT, matching Now — this screen is the same instant seen from
 * a different angle, so a spot showing 72 here has to show 72 there.
 *
 * Surfing gets no station traces anywhere: the sensors measure wind, and wind
 * is the quality note for surf rather than the answer. The cam is the only live
 * evidence, and the chart says so by dropping the live legend.
 */
export default function LiveContent() {
  const router = useRouter();
  const { sport } = useSport();
  const isDesktop = useIsDesktop();
  const { loading, error, mySpots, spots, now, today } = useCoastData(sport);
  const [selectedId, setSelectedId] = useSelectedSpot();
  const [camSpot, setCamSpot] = useState(null);
  const [tvMode, setTvMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [onlyId, setOnlyId] = useState(ALL_SPOTS);

  const pool = onlyId === ALL_COAST_SPOTS ? spots : mySpots;

  // Same ranking as Now, so the wall reads top-left to bottom-right as best to
  // worst rather than as whatever order the database happened to return.
  const ranked = useMemo(() => {
    const sorted = [...pool].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    if (onlyId === ALL_SPOTS || onlyId === ALL_COAST_SPOTS) return sorted;
    const one = sorted.filter((p) => p.spot._id === onlyId);
    if (one.length) return one;
    // Single-spot pick may be outside the current pool (e.g. coast spot while
    // still on favorites) — fall back to the full coast list.
    const fromCoast = spots
      .filter((p) => p.spot._id === onlyId)
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    return fromCoast.length ? fromCoast : sorted;
  }, [pool, spots, onlyId]);

  const charts = useMemo(() => {
    const map = new Map();
    for (const pack of ranked) {
      map.set(pack.spot._id, buildDayChart({ slots: pack.charted, dayStart: today, nowMs: now }));
    }
    return map;
  }, [ranked, today, now]);

  const headerTitle =
    onlyId === ALL_COAST_SPOTS
      ? "All spots"
      : onlyId === ALL_SPOTS
        ? "My spots"
        : (ranked[0]?.spot?.name ?? "My spots");

  // Desktop favorites wall stays a 2×2; All spots scrolls the full coast.
  const desktopCards = onlyId === ALL_COAST_SPOTS ? ranked : ranked.slice(0, 4);
  const camPack = camSpot ? ranked.find((p) => p.spot._id === camSpot._id) : null;
  const camStation = isWindSport(sport) ? (camPack?.station ?? null) : null;

  if (loading) {
    return (
      <MainLayout>
        <ScreenSkeleton variant="live" />
      </MainLayout>
    );
  }
  if (error) {
    return (
      <MainLayout>
        <ScreenError body="This is a connection problem, not a dead cam." />
      </MainLayout>
    );
  }
  if (!ranked.length) {
    return (
      <MainLayout>
        <ScreenEmpty
          title="Nothing here for this sport"
          body="None of your spots do this sport. Pick another sport, or add a spot that does."
          actionLabel="CHOOSE YOUR SPOTS"
          onAction={() => router.push("/settings")}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout
      tools={
        // TV mode is desktop only — it is for a screen on the wall of a club,
        // which is not a thing you do with a phone in your hand.
        <button
          type="button"
          onClick={() => setTvMode(true)}
          className="flex items-center gap-[7px] h-[34px] px-[15px] rounded-pill border border-nav-border font-data text-[10.5px] tracking-[0.1em] text-faded-ink hover:text-ink hover:bg-ink-hover transition-colors duration-fast ease-smooth focus-ring"
          aria-label="TV mode"
        >
          <TvMinimal size={13} />
          TV MODE
        </button>
      }
    >
      <ScreenHeader
        title={headerTitle}
        pickerOpen={pickerOpen}
        onTogglePicker={() => setPickerOpen((v) => !v)}
        sheet={
          <SpotPickerSheet
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            spots={spots}
            value={onlyId}
            allOption
            coastAllOption
            onChange={(id) => {
              setOnlyId(id);
              if (id !== ALL_SPOTS && id !== ALL_COAST_SPOTS) setSelectedId(id);
            }}
            sport={sport}
          />
        }
        tools={isDesktop ? <LiveLegend live={isWindSport(sport)} /> : null}
      />

      {isDesktop ? (
        <div
          className={`grid grid-cols-2 gap-4 mt-3.5 ${
            onlyId === ALL_COAST_SPOTS ? "overflow-y-auto content-start" : ""
          }`}
          style={{
            height: "calc(100vh - 190px)",
            minHeight: 520,
            ...(onlyId === ALL_COAST_SPOTS
              ? { gridAutoRows: "minmax(280px, 42vh)" }
              : null),
          }}
        >
          {desktopCards.map((pack) => (
            <LiveCard
              key={pack.spot._id}
              pack={pack}
              sport={sport}
              chart={charts.get(pack.spot._id)}
              highlight={pack.spot._id === (selectedId ?? ranked[0].spot._id)}
              desktop
              onOpenCam={() => setCamSpot(pack.spot)}
              onSelect={() => setSelectedId(pack.spot._id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-[7px] mt-[9px]">
          {ranked.map((pack) => (
            <LiveCard
              key={pack.spot._id}
              pack={pack}
              sport={sport}
              chart={charts.get(pack.spot._id)}
              highlight={pack.spot._id === (selectedId ?? ranked[0].spot._id)}
              onOpenCam={() => setCamSpot(pack.spot)}
              onSelect={() => setSelectedId(pack.spot._id)}
            />
          ))}
        </div>
      )}

      {camSpot && (
        <WebcamFullscreen
          spot={camSpot}
          score={camPack?.score ?? null}
          station={camStation}
          showExternalLinks
          onClose={() => setCamSpot(null)}
          allWebcams={ranked.map((p) => p.spot)}
          onNavigate={setCamSpot}
        />
      )}

      {tvMode && (
        <TvMode
          packs={ranked.map((p) => ({
            spot: p.spot,
            station: isWindSport(sport) ? p.station : null,
          }))}
          onClose={() => setTvMode(false)}
        />
      )}
    </MainLayout>
  );
}
