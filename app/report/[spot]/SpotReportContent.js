"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "../../../components/layout/MainLayout";
import { ScreenHeader } from "../../../components/layout/ScreenHeader";
import { useSport, isWindSport } from "../../../components/sport/SportProvider";
import { useCoastData } from "../../../components/data/useCoastData";
import { useIsDesktop } from "../../../lib/hooks/useMediaQuery";
import { useSelectedSpot } from "../../../lib/hooks/useSelectedSpot";
import { SpotPickerSheet } from "../../../components/spot/SpotPickerSheet";
import { SpotDayRow } from "../../../components/spot/SpotDayRow";
import { WebcamFullscreen } from "../../../components/webcam/WebcamFullscreen";
import {
  ScreenError,
  ScreenEmpty,
  ScreenSkeleton,
} from "../../../components/common/ScreenState";
import { buildDayChart, sameDay } from "../../../lib/dayChart";
import { dtf } from "../../../lib/datetime";
import { toSpotSlug } from "../../../lib/spotSlug";

const TZ = "Europe/Lisbon";
const weekday = (ms) => dtf("en-GB", { weekday: "long", timeZone: TZ }).format(new Date(ms));

/**
 * Spot forecast — one beach across the coming days (reached from Next).
 *
 * Deliberately not a second Now. Now is about this hour at whichever spot is
 * best; this is about one beach over a week. Future days stay forecast-only.
 * Today reuses Now's live station wind on the WIND band, hover/tap tips, and
 * (on mobile) the spot cam above the charts. Desktop drops the cam so day rows
 * stay a capped-width list. The LIVE button still jumps to Now for the full
 * live reading.
 *
 * Today is expanded by default because that is the day someone landing here is
 * usually asking about, and one row open at a time keeps the list scannable —
 * the expanded chart is three bands tall, and two of them push the week off the
 * screen.
 */
export default function SpotReportContent({ slug }) {
  const router = useRouter();
  const { sport } = useSport();
  const isDesktop = useIsDesktop();
  const { loading, error, spots, now, today } = useCoastData(sport);
  const [, setSelectedSpot] = useSelectedSpot();
  const [openDay, setOpenDay] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  /** Spot whose cam is open in WebcamFullscreen (null = closed). */
  const [camSpot, setCamSpot] = useState(null);

  const pack = useMemo(
    () => spots.find((p) => toSpotSlug(p.spot.name) === slug) ?? null,
    [spots, slug]
  );

  // Landing here IS choosing this spot — LIVE, Now and the picker all agree
  // afterwards without the rider having to select it twice.
  useEffect(() => {
    if (pack) setSelectedSpot(pack.spot._id);
  }, [pack?.spot?._id]);

  useEffect(() => {
    setOpenDay(today);
  }, [today]);

  const days = useMemo(() => {
    if (!pack) return [];
    return pack.days.map((day) => ({
      ...day,
      label: sameDay(day.dayStart, now) ? "Today" : weekday(day.dayStart),
      chart: buildDayChart({ slots: pack.charted, dayStart: day.dayStart, nowMs: now }),
    }));
  }, [pack, now]);

  if (loading) {
    return (
      <MainLayout>
        <ScreenSkeleton variant="cards" />
      </MainLayout>
    );
  }
  if (error) {
    return (
      <MainLayout>
        <ScreenError body="This is a connection problem, not an empty forecast." />
      </MainLayout>
    );
  }
  if (!pack) {
    return (
      <MainLayout>
        <ScreenEmpty
          title="No forecast for this spot"
          body={`This spot does not do ${sport === "surfing" ? "surfing" : "this sport"}, or it is not on the list any more.`}
          actionLabel="SEE THE WEEK"
          onAction={() => router.push("/next")}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <ScreenHeader
        title={pack.spot.name}
        size={22}
        onBack={() => router.push("/next")}
        pickerOpen={pickerOpen}
        onTogglePicker={() => setPickerOpen((v) => !v)}
        sheet={
          <SpotPickerSheet
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            spots={spots}
            value={pack.spot._id}
            onChange={(id) => {
              const next = spots.find((p) => p.spot._id === id);
              if (next) router.push(`/report/${toSpotSlug(next.spot.name)}`);
            }}
            sport={sport}
          />
        }
      />

      <div className="flex flex-col gap-[5px] mt-2.5 md:gap-2 md:mt-3 md:max-w-[720px]">
        {days.map((day) => {
          const todayRow = sameDay(day.dayStart, now);
          return (
            <SpotDayRow
              key={day.dayStart}
              day={day}
              sport={sport}
              chart={day.chart}
              tides={pack.tides}
              nowMs={now}
              desktop={isDesktop}
              open={openDay === day.dayStart}
              onToggle={() => setOpenDay(openDay === day.dayStart ? null : day.dayStart)}
              reportHref={`/report/${toSpotSlug(pack.spot.name)}?sport=${sport}`}
              isToday={todayRow}
              spot={todayRow ? pack.spot : null}
              station={todayRow ? pack.station : null}
              onOpenCam={todayRow ? setCamSpot : null}
              onLive={
                todayRow
                  ? () => router.push(`/?spot=${toSpotSlug(pack.spot.name)}`)
                  : undefined
              }
            />
          );
        })}
      </div>

      {camSpot && (
        <WebcamFullscreen
          spot={camSpot}
          score={pack.score ?? pack.days?.[0]?.peak ?? null}
          station={isWindSport(sport) ? pack.station : null}
          onClose={() => setCamSpot(null)}
          allWebcams={[pack.spot]}
          onNavigate={setCamSpot}
        />
      )}
    </MainLayout>
  );
}
