"use client";

import { useEffect, useState } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { agreementFor, groupByTimestamp, thresholdFor } from "../../lib/agreement";
import { deriveVerdict, VERDICT } from "../../lib/verdict";
import {
  SLOT_HOURS,
  detectWindows,
  isChartedSlot,
  soonestWindow,
  upcomingWindows,
} from "../../lib/windows";
import { spotsWithSlots } from "../../lib/reportData";
import { classifyProximity, stationIdFromUrl } from "../../lib/stations";
import { buildStationCard } from "../../lib/station";
import { formatTideTime } from "../../lib/utils";
import { dtf } from "../../lib/datetime";
import { useFlag } from "../flags/FlagProvider";

const WAVE_TZ = "Europe/Lisbon";

/** YYYY-MM-DD in the spot timezone — used to keep the wave chart on "today". */
function localDateKey(ms, timeZone = WAVE_TZ) {
  return dtf("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/**
 * Swell series + tides for the Waves · Tide half of the Now hero.
 *
 * History is today's forecast slots only (every 3h from the scrape), not a
 * multi-day trail — the card answers "how is the water right now", not the week.
 */
function buildWavesTide({ slot, slots = [], tides, nowMs }) {
  const hasWave =
    slot?.waveHeight !== null &&
    slot?.waveHeight !== undefined &&
    slot.waveHeight > 0;

  const todayKey = localDateKey(nowMs);

  const history = (slots || [])
    .filter(
      (s) =>
        s.waveHeight !== null &&
        s.waveHeight !== undefined &&
        Number.isFinite(Number(s.waveHeight)) &&
        localDateKey(s.timestamp) === todayKey
    )
    .map((s) => ({
      time: s.timestamp,
      height: Number(s.waveHeight),
      period:
        s.wavePeriod !== null && s.wavePeriod !== undefined
          ? Number(s.wavePeriod)
          : null,
    }))
    .sort((a, b) => a.time - b.time);

  const domainMin = history.length > 0 ? history[0].time : nowMs;
  const domainMax =
    history.length > 0 ? history[history.length - 1].time : nowMs;

  const chartTides = (tides || [])
    .filter(
      (t) =>
        (t.type === "high" || t.type === "low") &&
        localDateKey(t.time) === todayKey
    )
    .sort((a, b) => a.time - b.time)
    .map((t) => ({
      type: t.type,
      time: t.time,
      height: t.height,
      timeStr: t.timeStr || formatTideTime(t.time),
    }));

  // Headline list still shows the next two from now, not every mark on the axis.
  const upcoming = chartTides
    .filter((t) => t.time >= nowMs - 30 * 60 * 1000)
    .slice(0, 2);

  if (!hasWave && history.length === 0 && chartTides.length === 0) return null;

  // Prefer the slot covering now for the headline; fall back to the nearest
  // history point so a missing current wave field still shows a number.
  const nearest =
    history.find((p) => p.time === slot?.timestamp) ||
    history.reduce((best, p) => {
      if (!best) return p;
      return Math.abs(p.time - nowMs) < Math.abs(best.time - nowMs) ? p : best;
    }, null);

  return {
    waveHeight: hasWave ? slot.waveHeight : nearest?.height ?? null,
    wavePeriod: slot?.wavePeriod ?? nearest?.period ?? null,
    waveDirection: slot?.waveDirection ?? null,
    history,
    tides: upcoming,
    chartTides,
  };
}

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

/** The slot covering `now`, or the next one today if we are between slots. */
function currentSlot(slots, nowMs) {
  const threeHours = 3 * 60 * 60 * 1000;
  return (
    slots.find((s) => s.timestamp <= nowMs && nowMs < s.timestamp + threeHours) ||
    slots.find((s) => s.timestamp > nowMs) ||
    null
  );
}

/** Remaining charted slots today from NOW, contiguous, capped. */
function buildTrajectory(slots, fromSlot) {
  const SLOT_MS = SLOT_HOURS * 60 * 60 * 1000;
  const TRAJECTORY_MAX = 4;
  const charted = slots.filter((s) => isChartedSlot(s.timestamp));
  const fromIndex = charted.findIndex((s) => s.timestamp === fromSlot.timestamp);
  const trajectory = [];
  if (fromIndex === -1) return trajectory;
  for (const slot of charted.slice(fromIndex, fromIndex + TRAJECTORY_MAX)) {
    const previous = trajectory[trajectory.length - 1];
    if (previous && slot.timestamp - previous.timestamp > SLOT_MS) break;
    trajectory.push(slot);
  }
  return trajectory;
}

/**
 * One Now card's worth of data for a candidate spot.
 * Cam / station / waves always belong to this spot — never mixed.
 */
async function buildVerdictPack(candidate, report, now, showStation, sport) {
  let agreement = null;
  try {
    const modelRows = await client.query(api.models.getModelSlotsForSpot, {
      spotId: candidate.spot._id,
      sinceTimestamp: now - 3 * 60 * 60 * 1000,
    });
    const byTime = groupByTimestamp(modelRows);
    const threshold = thresholdFor(candidate.config, sport, candidate.slots);
    if (threshold) {
      agreement = agreementFor(byTime.get(candidate.slot.timestamp) || [], threshold);
    }
  } catch {
    agreement = null;
  }

  let station = null;
  const stationId = stationIdFromUrl(candidate.spot.liveReportUrl);
  if (stationId) {
    try {
      const readings = await client.query(api.stations.getStationReadings, {
        stationId,
        sinceAt: now - 6 * 60 * 60 * 1000,
      });
      station = buildStationCard({
        readings,
        forecastSlot: candidate.slot,
        forecastSlots: candidate.slots,
        proximity: classifyProximity(stationId, candidate.spot),
        nowMs: now,
      });
    } catch {
      station = null;
    }
  }

  const waves = buildWavesTide({
    slot: candidate.slot,
    slots: candidate.slots,
    tides: report?.data?.[candidate.spot._id]?.tides ?? [],
    nowMs: now,
  });

  const stationDelta = showStation ? (station?.delta ?? null) : null;
  const verdict = deriveVerdict({
    score: candidate.score,
    agreement,
    stationDelta,
  });

  return {
    verdict,
    spot: candidate.spot,
    slot: candidate.slot,
    score: candidate.score,
    agreement,
    station,
    waves,
    trajectory: buildTrajectory(candidate.slots, candidate.slot),
  };
}

/**
 * Everything the Now screen needs, for one sport.
 *
 * Up to two cards: the best-scoring favourite right now, plus a second spot
 * when it is also eligible (GO / MAYBE). NO spots never take the second slot —
 * the primary card still shows when the coast is flat.
 */
export function useNowData(sport, favoriteIds = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  // Gated here: the card and the verdict both read the station, and the flag
  // being off must mean the delta cannot move the verdict either.
  const showStation = useFlag("stationEvidence");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const report = await client.query(api.spots.getReportData, { sports: [sport] });
        if (cancelled) return;

        const now = Date.now();
        const candidates = [];

        const all = spotsWithSlots(report, sport);
        const mine = favoriteIds.length
          ? all.filter(({ spot }) => favoriteIds.includes(spot._id))
          : [];

        if (favoriteIds.length === 0) {
          setState({
            loading: false,
            error: null,
            data: { needsFavorites: true, verdicts: [], spot: null },
          });
          return;
        }

        for (const { spot, slots, config } of (mine.length ? mine : all)) {
          if (slots.length === 0) continue;
          const slot = currentSlot(slots, now);
          if (!slot) continue;
          candidates.push({ spot, slot, slots, score: slot.score, config });
        }

        // Best score first so the primary card is always the top answer.
        candidates.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

        if (candidates.length === 0) {
          setState({
            loading: false,
            error: null,
            data: {
              verdicts: [],
              spot: null,
              noSpotForSport: mine.length === 0,
            },
          });
          return;
        }

        const packs = [];
        for (const candidate of candidates) {
          if (packs.length >= 2) break;
          const pack = await buildVerdictPack(
            candidate,
            report,
            now,
            showStation,
            sport
          );
          if (cancelled) return;

          // First card always ships (even on a flat day). Second only if eligible.
          if (packs.length === 0) {
            packs.push(pack);
            continue;
          }
          if (pack.verdict !== VERDICT.NO) {
            packs.push(pack);
          }
        }

        const bySpot = candidates.map((c) => ({
          spot: c.spot,
          windows: detectWindows(c.slots.filter((s) => isChartedSlot(s.timestamp))),
        }));
        const next = soonestWindow(bySpot, now);
        // Drop windows that belong to a card already on screen.
        const shownIds = new Set(packs.map((p) => p.spot._id));
        const nextWindows = upcomingWindows(bySpot, now, 3, {
          excludeActiveAt: packs[0]?.spot?._id,
        }).filter(({ spot }) => !shownIds.has(spot._id));

        const scopedToFavorites = mine.length > 0;
        const dayEnd = now + 24 * 60 * 60 * 1000;
        const elsewhereToday = scopedToFavorites
          ? all
              .filter(({ spot }) => !favoriteIds.includes(spot._id))
              .flatMap(({ slots }) =>
                detectWindows(
                  slots.filter(
                    (s) =>
                      s.timestamp < dayEnd &&
                      s.timestamp + SLOT_HOURS * 60 * 60 * 1000 > now &&
                      isChartedSlot(s.timestamp)
                  )
                )
              )
              .filter((w) => w.end > now && w.start < dayEnd).length
          : 0;

        const primary = packs[0] || null;

        setState({
          loading: false,
          error: null,
          data: {
            verdicts: packs,
            // Back-compat aliases used by a few call sites / mental model.
            verdict: primary?.verdict ?? null,
            trajectory: primary?.trajectory ?? [],
            elsewhereToday,
            spot: primary?.spot ?? null,
            slot: primary?.slot ?? null,
            agreement: primary?.agreement ?? null,
            station: primary?.station ?? null,
            waves: primary?.waves ?? null,
            score: primary?.score ?? null,
            nextWindow: next,
            nextWindows,
          },
        });
      } catch (error) {
        if (cancelled) return;
        setState({ loading: false, error, data: null });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sport, favoriteIds.join(","), showStation]);

  return state;
}
