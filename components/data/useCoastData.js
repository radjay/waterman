"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { useUser } from "../auth/AuthProvider";
import { spotsWithSlots } from "../../lib/reportData";
import { buildStationCard } from "../../lib/station";
import { classifyProximity, stationIdFromUrl } from "../../lib/stations";
import { detectWindows } from "../../lib/windows";
import {
  CHART_FIRST_HOUR,
  CHART_LAST_HOUR,
  DAY_MS,
  SLOT_MS,
  dayStartOf,
  hourOf,
} from "../../lib/dayChart";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

/** How many days the week strip and the spot forecast cover. */
export const DAYS_AHEAD = 6;

/**
 * Every screen's data, fetched once, shaped once.
 *
 * Now, Next, Live and Spot forecast all answer the same question at different
 * ranges, and they have to agree: a spot's score on Live must be the score on
 * Now, and its best-this-week figure must match its row in the week strip.
 * Four fetch paths guaranteed they would not — Now was reading the current slot
 * while Cams read "the best slot in the current window", so two screens open at
 * once showed two different numbers for the same beach.
 *
 * So there is one hook. It returns per-spot packs; screens choose what to draw.
 */
export function useCoastData(sport) {
  const user = useUser();
  const favoriteIds = user?.favoriteSpots ?? [];
  const favKey = favoriteIds.join(",");

  // `?at=` moves the clock. Every screen here is "what is happening now", which
  // makes them impossible to review at 3am and impossible to screenshot the
  // interesting states of. Development only — in production the clock is the
  // clock.
  const search = useSearchParams();
  const at = process.env.NODE_ENV === "production" ? null : search?.get("at");
  const clockOffset = useMemo(() => {
    if (!at) return 0;
    const t = Date.parse(at);
    return Number.isFinite(t) ? t - Date.now() : 0;
  }, [at]);

  const [state, setState] = useState({ loading: true, error: null, raw: null, now: Date.now() });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const report = await client.query(api.spots.getReportData, { sports: [sport] });
        if (cancelled) return;

        const now = Date.now() + clockOffset;
        const today = dayStartOf(now);

        const withSlots = spotsWithSlots(report, sport)
          // A spot that does not do this sport has no answer for it. Showing it
          // with an empty dial would read as "flat here" rather than "not here".
          .filter(({ spot }) => (spot.sports ?? []).includes(sport));

        // Stations are fetched per distinct sensor, not per spot: two spots
        // share 2329 and two share 3294, so per-spot would poll each twice.
        const stationIds = [
          ...new Set(
            withSlots.map(({ spot }) => stationIdFromUrl(spot.liveReportUrl)).filter(Boolean)
          ),
        ];
        const readingsById = new Map();
        await Promise.all(
          stationIds.map(async (id) => {
            try {
              const readings = await client.query(api.stations.getStationReadings, {
                stationId: id,
                sinceAt: today,
              });
              readingsById.set(id, readings ?? []);
            } catch {
              // A dead sensor is not a dead screen. The spot keeps its forecast.
              readingsById.set(id, []);
            }
          })
        );
        if (cancelled) return;

        setState({
          loading: false,
          error: null,
          now,
          raw: { report, withSlots, readingsById, today },
        });
      } catch (error) {
        if (cancelled) return;
        setState({ loading: false, error, raw: null, now: Date.now() });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sport, clockOffset]);

  const packs = useMemo(() => {
    if (!state.raw) return [];
    const { report, withSlots, readingsById, today } = state.raw;
    const now = state.now;

    return withSlots.map(({ spot, slots, config }) => {
      const tides = report?.data?.[spot._id]?.tides ?? [];
      const charted = slots.filter((s) => {
        const h = hourOf(s.timestamp);
        return h >= CHART_FIRST_HOUR && h <= CHART_LAST_HOUR;
      });

      const stationId = stationIdFromUrl(spot.liveReportUrl);
      const readings = stationId ? readingsById.get(stationId) : null;
      const slot = currentSlot(slots, now);

      const station =
        readings && readings.length
          ? buildStationCard({
              readings,
              forecastSlot: slot,
              forecastSlots: charted,
              proximity: classifyProximity(stationId, spot),
              nowMs: now,
              historyMs: now - today,
            })
          : null;

      const days = Array.from({ length: DAYS_AHEAD }, (_, i) => {
        const dayStart = today + i * DAY_MS;
        const daySlots = charted.filter(
          (s) => s.timestamp >= dayStart && s.timestamp < dayStart + DAY_MS
        );
        const scored = daySlots.filter((s) => s.score !== null && s.score !== undefined);
        const windows = detectWindows(scored);
        const peak = scored.reduce(
          (best, s) => (best === null || s.score > best ? s.score : best),
          null
        );
        return { dayStart, slots: daySlots, scored, windows, peak };
      });

      return {
        spot,
        config,
        slots,
        charted,
        tides,
        slot,
        // The score right now, never today's peak. Now and Live both say
        // "right now" and a peak here would quietly promise the afternoon.
        score: slot?.score ?? null,
        station,
        // A station URL that yields nothing is different from no station at all:
        // one is broken, the other was never claimed. Screens say so.
        hasStationUrl: Boolean(stationId),
        days,
        // Best across the whole range, which is what Next ranks on.
        peakScore: days.reduce(
          (best, d) => (d.peak !== null && (best === null || d.peak > best) ? d.peak : best),
          null
        ),
      };
    });
  }, [state.raw, state.now]);

  const mine = useMemo(() => {
    const favourites = packs.filter((p) => favoriteIds.includes(p.spot._id));
    // Falling back to the whole coast beats an empty screen for a signed-out
    // rider — and "these are all the spots" is at least true.
    return favourites.length ? favourites : packs;
  }, [packs, favKey]);

  return {
    loading: state.loading,
    error: state.error,
    now: state.now,
    today: state.raw?.today ?? dayStartOf(state.now),
    spots: packs,
    mySpots: mine,
    hasFavorites: favoriteIds.length > 0,
    usingFavorites: packs.some((p) => favoriteIds.includes(p.spot._id)),
  };
}

/** The slot covering now, or the next one if we are between slots. */
function currentSlot(slots, nowMs) {
  return (
    slots.find((s) => s.timestamp <= nowMs && nowMs < s.timestamp + SLOT_MS) ||
    slots.find((s) => s.timestamp > nowMs) ||
    null
  );
}
