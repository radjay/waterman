"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "../../../components/layout/MainLayout";
import { ScreenHeader } from "../../../components/layout/ScreenHeader";
import { useSport } from "../../../components/sport/SportProvider";
import { useCoastData } from "../../../components/data/useCoastData";
import { useIsDesktop } from "../../../lib/hooks/useMediaQuery";
import { useSelectedSpot } from "../../../lib/hooks/useSelectedSpot";
import { SpotPickerSheet } from "../../../components/spot/SpotPickerSheet";
import { SpotDayRow } from "../../../components/spot/SpotDayRow";
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
 * Spot forecast — one beach across the coming days.
 *
 * Deliberately not a second Now. Now is about this hour at whichever spot is
 * best; this is about one beach over a week, and the difference shows in what
 * is missing: no cam, no live station traces, no verdict word. Live data is one
 * tap away behind the LIVE button on each day, which switches to Now scoped to
 * this spot.
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

      <div className="flex flex-col gap-[5px] mt-2.5 md:gap-2 md:mt-3">
        {days.map((day) => (
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
            onLive={
              sameDay(day.dayStart, now)
                ? () => router.push(`/?spot=${toSpotSlug(pack.spot.name)}`)
                : undefined
            }
          />
        ))}
      </div>
    </MainLayout>
  );
}
