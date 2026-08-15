"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "../../components/layout/MainLayout";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { useSport } from "../../components/sport/SportProvider";
import { useCoastData } from "../../components/data/useCoastData";
import { useIsDesktop } from "../../lib/hooks/useMediaQuery";
import { useSelectedSpot } from "../../lib/hooks/useSelectedSpot";
import { ALL_SPOTS, SpotPickerSheet } from "../../components/spot/SpotPickerSheet";
import { WindowCard } from "../../components/next/WindowCard";
import { WeekStrip } from "../../components/next/WeekStrip";
import { ScreenError, ScreenEmpty, ScreenSkeleton } from "../../components/common/ScreenState";
import { MicroLabel } from "../../components/ui/MicroLabel";
import { buildDayChart, DAY_MS, sameDay } from "../../lib/dayChart";
import { detectWindows } from "../../lib/windows";
import { dtf } from "../../lib/datetime";
import { toSpotSlug } from "../../lib/spotSlug";

const TZ = "Europe/Lisbon";
const fmt = (ms, options) => dtf("en-GB", { timeZone: TZ, ...options }).format(new Date(ms));

/**
 * Next — if not now, when and where.
 *
 * Two answers on one screen, in the order a rider wants them: the three
 * soonest windows as cards ("keep Saturday afternoon free"), then the whole
 * week as one clock ("and here is everything else").
 *
 * Scores here are the PEAK of a window; Now and Live show the score right now.
 * That divergence is deliberate and the screen says so, because a window's peak
 * is what you plan around and the current number is what you act on. The two
 * must still agree about the same figure: a spot's best-this-week number is the
 * same value in a card and in its week row, because both come from the same
 * per-day peak.
 *
 * There is no "models split" concept here. It was removed on purpose.
 */
export function NextContent({ spotSlug = null }) {
  const router = useRouter();
  const { sport } = useSport();
  const isDesktop = useIsDesktop();
  const { loading, error, mySpots, now, today } = useCoastData(sport);
  const [, setSelectedSpot] = useSelectedSpot();
  const [openDay, setOpenDay] = useState(today);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Scoped to one spot when the path names one, otherwise across my spots.
  const scoped = useMemo(() => {
    if (!spotSlug) return mySpots;
    const match = mySpots.find((p) => toSpotSlug(p.spot.name) === spotSlug);
    return match ? [match] : mySpots;
  }, [mySpots, spotSlug]);

  const view = useMemo(() => {
    if (!scoped.length) return null;

    const dayCount = scoped[0].days.length;

    const days = Array.from({ length: dayCount }, (_, i) => {
      const dayStart = today + i * DAY_MS;

      // One reading per timestamp — the best spot at that hour, named. Drawing
      // every spot's band on top of each other left seams at every boundary
      // that read as dividers rather than as two beaches overlapping.
      const byTime = new Map();
      for (const pack of scoped) {
        for (const slot of pack.days[i]?.scored ?? []) {
          const existing = byTime.get(slot.timestamp);
          if (!existing || (slot.score ?? -1) > (existing.score ?? -1)) {
            byTime.set(slot.timestamp, { ...slot, spotName: pack.spot.name, pack });
          }
        }
      }

      const slots = [...byTime.values()].sort((a, b) => a.timestamp - b.timestamp);
      const windows = detectWindows(slots);
      const peak = slots.reduce(
        (best, s) => (best === null || s.score > best ? s.score : best),
        null
      );
      const best = [...slots]
        .filter((s) => s.score !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .sort((a, b) => a.timestamp - b.timestamp);

      return {
        dayStart,
        label: fmt(dayStart, { weekday: "short" }).toUpperCase(),
        long: sameDay(dayStart, now) ? "TODAY" : fmt(dayStart, { weekday: "long" }).toUpperCase(),
        isToday: sameDay(dayStart, now),
        slots,
        windows,
        peak,
        best,
        hasWindow: windows.length > 0,
      };
    });

    // The three cards: the best window on each of the next days that has one.
    // One per day rather than three windows overall, because three slices of
    // the same afternoon at the same beach is one answer written out three
    // times.
    const cards = [];
    for (const day of days) {
      if (cards.length === 3) break;
      let best = null;
      for (const pack of scoped) {
        const dayIndex = days.indexOf(day);
        for (const win of pack.days[dayIndex]?.windows ?? []) {
          if (win.end <= now) continue;
          if (!best || (win.score ?? -1) > (best.window.score ?? -1)) {
            best = { spot: pack.spot, window: win, pack };
          }
        }
      }
      if (best) cards.push({ ...best, day });
    }

    return { days, cards };
  }, [scoped, today, now]);

  // The shared clock. Derived from today's slots so the axis follows the
  // forecast grid through a DST change rather than being labelled an hour off
  // for half the year.
  const chart = useMemo(
    () => buildDayChart({ slots: scoped[0]?.charted ?? [], dayStart: today, nowMs: now }),
    [scoped, today, now]
  );

  const openSpot = (spot) => {
    setSelectedSpot(spot._id);
    router.push(`/report/${toSpotSlug(spot.name)}`);
  };

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
        <ScreenError body="This is a connection problem, not an empty week." />
      </MainLayout>
    );
  }
  if (!view) {
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

  const scopedToSpot = Boolean(spotSlug) && scoped.length === 1;
  const title = scopedToSpot ? scoped[0].spot.name : "My spots";

  return (
    <MainLayout>
      <ScreenHeader
        title={title}
        pickerOpen={pickerOpen}
        onTogglePicker={() => setPickerOpen((v) => !v)}
        sheet={
          <SpotPickerSheet
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            spots={mySpots}
            value={scopedToSpot ? scoped[0].spot._id : ALL_SPOTS}
            allOption
            onChange={(id) => {
              if (id === ALL_SPOTS) {
                router.push("/next");
                return;
              }
              const next = mySpots.find((p) => p.spot._id === id);
              if (next) router.push(`/next/${toSpotSlug(next.spot.name)}`);
            }}
            sport={sport}
          />
        }
      />

      {view.cards.length > 0 ? (
        <div
          className={
            isDesktop ? "grid grid-cols-3 gap-3.5 mt-6" : "flex flex-col gap-[9px] mt-4"
          }
        >
          {view.cards.map((card, i) => (
            <WindowCard
              key={`${card.spot._id}-${card.window.start}`}
              spot={card.spot}
              window={card.window}
              sport={sport}
              dayLabel={card.day.long}
              isToday={card.day.isToday}
              highlight={i === 0}
              withStill={isDesktop}
              onClick={() => openSpot(card.spot)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-card-lg border border-card bg-surface p-5 text-center mt-4">
          <p className="font-headline font-extrabold text-[25px] tracking-display-tight text-ink leading-[1.1]">
            Nothing on this week
          </p>
          <p className="text-[14px] text-faded-ink mt-2.5">
            Nothing at your spots clears 60 in the next six days. The week below still
            shows how close it gets.
          </p>
        </div>
      )}

      <WeekStrip
        days={view.days}
        selectedDay={openDay}
        onSelectDay={setOpenDay}
        onSelectSlot={(_day, slot) => openSpot(slot.pack.spot)}
        chart={chart}
        nowMs={now}
        desktop={isDesktop}
        className="pt-[18px] md:pt-6"
      />

      {/* Said out loud because Now and Live show the CURRENT score for the same
          beach, and two different numbers with no explanation reads as a bug. */}
      <MicroLabel className="pt-4">Scores here are each window&rsquo;s peak</MicroLabel>
    </MainLayout>
  );
}
