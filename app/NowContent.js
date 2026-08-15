"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MainLayout } from "../components/layout/MainLayout";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { useSport } from "../components/sport/SportProvider";
import { useCoastData } from "../components/data/useCoastData";
import { useSelectedSpot } from "../lib/hooks/useSelectedSpot";
import { useIsDesktop } from "../lib/hooks/useMediaQuery";
import { SpotPickerSheet } from "../components/spot/SpotPickerSheet";
import { SpotRow } from "../components/spot/SpotRow";
import { CamFrame, CamThumb } from "../components/ui/CamFrame";
import { SwipeDots } from "../components/ui/SwipeDots";
import { ScoreDial } from "../components/ui/ScoreDial";
import { DayChartPanel } from "../components/chart/DayChartPanel";
import { WebcamFullscreen } from "../components/webcam/WebcamFullscreen";
import { ScreenError, ScreenSkeleton, ScreenEmpty } from "../components/common/ScreenState";
import { buildDayChart } from "../lib/dayChart";
import { VERDICT, VERDICT_TONE, VERDICT_WORD, deriveVerdict } from "../lib/verdict";
import { toSpotSlug } from "../lib/spotSlug";
import { isWindSport } from "../components/sport/SportProvider";

const TONE_TEXT = { accent: "text-accent", caution: "text-caution", dim: "text-dim" };

/**
 * Now — can I go, right now, at the spot the app is recommending.
 *
 * One spot at a time. The previous screen stacked a card per spot, which
 * answered "here is everything" rather than "can I go": two verdicts on one
 * screen is a comparison, and a comparison is what Next is for. So the choice
 * is made for the rider (best score now), the answer is a single word, and the
 * other spots are one swipe or one tap away.
 *
 * The dial is the score RIGHT NOW, never today's peak — the whole screen is
 * about this hour, and a peak here would quietly promise the afternoon. The
 * afternoon is what GO LATER and the score band are for.
 *
 * Mobile and desktop are branched in JS rather than with `hidden md:block`,
 * because both halves contain a live cam: rendering the tree twice meant two
 * HLS players pulling the same stream, one of them into a zero-height box.
 */
export function NowContent() {
  const router = useRouter();
  const search = useSearchParams();
  const { sport } = useSport();
  const isDesktop = useIsDesktop();
  const { loading, error, mySpots, spots, now, today } = useCoastData(sport);

  const [selectedId, setSelectedId] = useSelectedSpot();
  const [pickerOpen, setPickerOpen] = useState(false);
  /** Spot whose cam is open in WebcamFullscreen (null = closed). */
  const [camSpot, setCamSpot] = useState(null);

  // A ?spot= slug is how Spot forecast's LIVE button lands here on the right
  // beach. It is consumed once and folded into the persisted choice, so a
  // refresh does not keep overriding a later pick.
  const spotParam = search.get("spot");
  useEffect(() => {
    if (!spotParam || !spots.length) return;
    const match = spots.find((p) => toSpotSlug(p.spot.name) === spotParam);
    if (match) setSelectedId(match.spot._id);
    router.replace("/", { scroll: false });
  }, [spotParam, spots.length]);

  // Ranked by score, so "no choice made yet" still lands on the best answer.
  const ranked = useMemo(
    () => [...mySpots].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
    [mySpots]
  );

  const found = ranked.findIndex((p) => p.spot._id === selectedId);
  const index = found === -1 ? 0 : found;
  const pack = ranked[index] ?? null;
  const others = ranked.filter((p) => p.spot._id !== pack?.spot?._id).slice(0, 3);

  const chart = useMemo(
    () => (pack ? buildDayChart({ slots: pack.charted, dayStart: today, nowMs: now }) : null),
    [pack, today, now]
  );

  const verdict = useMemo(() => {
    if (!pack) return VERDICT.NO;
    const laterPeak = (chart?.columns ?? [])
      .filter((c) => !c.isPast && !c.isCurrent)
      .reduce((best, c) => {
        const s = c.slot?.score;
        return s !== null && s !== undefined && s > best ? s : best;
      }, -1);
    return deriveVerdict({
      score: pack.score,
      agreement: null,
      stationDelta: pack.station?.delta ?? null,
      laterPeak: laterPeak >= 0 ? laterPeak : null,
    });
  }, [pack, chart]);

  const swipe = useSwipe((dir) => {
    if (ranked.length < 2) return;
    const next = (index + (dir === "left" ? 1 : -1) + ranked.length) % ranked.length;
    setSelectedId(ranked[next].spot._id);
  });

  if (loading) {
    return (
      <MainLayout>
        <ScreenSkeleton variant="now" />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <ScreenError onRetry={() => router.refresh()} />
      </MainLayout>
    );
  }

  if (!pack) {
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

  const dial = (size, ring, value) => (
    <ScoreDial score={pack.score} size={size} ring={ring} value={value} showAll />
  );

  const reportHref = `/report/${toSpotSlug(pack.spot.name)}?sport=${sport}`;
  const camList = ranked.map((p) => p.spot);
  // Same pack.station the wind chart uses — CamFrame overlays LiveStationBadge
  // top-left. Surfing has no station traces; dead sensors stay null.
  const camStation = isWindSport(sport) ? pack.station : null;

  return (
    <MainLayout>
      <ScreenHeader
        title={pack.spot.name}
        pickerOpen={pickerOpen}
        onTogglePicker={() => setPickerOpen((v) => !v)}
        sheet={
          <SpotPickerSheet
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            spots={ranked}
            value={pack.spot._id}
            onChange={setSelectedId}
            sport={sport}
          />
        }
        tools={
          isDesktop ? (
            <span className="flex items-center gap-[34px] pr-1">
              <VerdictWord verdict={verdict} size={44} />
              {dial(84, 9, 30)}
            </span>
          ) : null
        }
      />

      {isDesktop ? (
        <div className="flex flex-col gap-5 mt-5">
          {/* items-stretch, not a hard 463px: the cam's 16:9 sets the row
              height and the panel fills it, so the two stay locked at any
              window width rather than only at the one the design was drawn
              at. */}
          <div className="grid grid-cols-[1.62fr_1fr] gap-7 items-stretch">
            <CamFrame
              spot={pack.spot}
              station={camStation}
              radius={18}
              onFullscreen={() => setCamSpot(pack.spot)}
              className="border border-card"
            />
            {chart && (
              <DayChartPanel
                chart={chart}
                sport={sport}
                station={pack.station}
                tides={pack.tides}
                nowMs={now}
                variant="desktop"
                fluid
                reportHref={reportHref}
                className="h-full min-h-0 w-full"
              />
            )}
          </div>

          {others.length > 0 && (
            <div className="flex gap-3">
              {others.map((other) => (
                <SpotRow
                  key={other.spot._id}
                  spot={other.spot}
                  score={other.score}
                  slot={other.slot}
                  station={other.station}
                  sport={sport}
                  suffix={other.days?.[0]?.peak === null ? "nothing today" : undefined}
                  size="lg"
                  dialSide="trailing"
                  dim={other.score === null}
                  leading={
                    <CamThumb
                      spot={other.spot}
                      onFullscreen={() => setCamSpot(other.spot)}
                    />
                  }
                  onClick={() => setSelectedId(other.spot._id)}
                  className="flex-1 rounded-[15px] border border-card bg-surface px-[14px] py-3 hover:bg-ink-hover transition-colors duration-fast ease-smooth"
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div {...swipe}>
          {/* Full-bleed: a 16:9 frame inset by the page gutters reads as a
              thumbnail, and this is the only live evidence on the screen. */}
          <div className="-mx-5 mt-3">
            <CamFrame
              spot={pack.spot}
              station={camStation}
              onFullscreen={() => setCamSpot(pack.spot)}
            />
          </div>

          <SwipeDots
            count={ranked.length}
            index={index}
            onSelect={(i) => setSelectedId(ranked[i].spot._id)}
            labels={ranked.map((p) => p.spot.name)}
            className="pt-3"
          />

          <div className="flex items-center justify-between gap-[18px] pt-4">
            <VerdictWord verdict={verdict} size={46} />
            {dial(70, 9, 26)}
          </div>

          {chart && (
            <DayChartPanel
              chart={chart}
              sport={sport}
              station={pack.station}
              tides={pack.tides}
              nowMs={now}
              reportHref={reportHref}
              className="pt-[18px]"
            />
          )}
        </div>
      )}

      {camSpot && (
        <WebcamFullscreen
          spot={camSpot}
          score={ranked.find((p) => p.spot._id === camSpot._id)?.score ?? null}
          onClose={() => setCamSpot(null)}
          allWebcams={camList}
          onNavigate={setCamSpot}
        />
      )}
    </MainLayout>
  );
}

function VerdictWord({ verdict, size }) {
  const tone = TONE_TEXT[VERDICT_TONE[verdict]] ?? "text-dim";
  return (
    <span
      className={`font-headline font-extrabold leading-none tracking-display-tighter whitespace-nowrap ${tone}`}
      style={{ fontSize: size }}
    >
      {VERDICT_WORD[verdict] ?? verdict}
    </span>
  );
}

/**
 * Swipe between spots.
 *
 * Touch only, and only past a real threshold — a 30px drag while scrolling the
 * chart would otherwise change the spot out from under the rider. The dots do
 * the same job for everyone else, so nothing is behind the gesture alone.
 */
function useSwipe(onSwipe, threshold = 60) {
  const start = useRef(null);
  return {
    onTouchStart: (e) => {
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e) => {
      if (!start.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.current.x;
      const dy = t.clientY - start.current.y;
      start.current = null;
      if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      onSwipe(dx < 0 ? "left" : "right");
    },
  };
}
