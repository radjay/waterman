"use client";

import { useEffect, useState } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { agreementFor, groupByTimestamp, thresholdFor } from "../../lib/agreement";
import { deriveVerdict, pickNowSpot, verdictReason } from "../../lib/verdict";
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
import { useFlag } from "../flags/FlagProvider";

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

/** How long the current run of good slots holds for. */
function holdsUntil(slots, fromMs) {
  const windows = detectWindows(slots);
  const active = windows.find((w) => w.start <= fromMs && fromMs < w.end);
  return active ? active.end : null;
}

/**
 * Everything the Now screen needs, for one sport.
 *
 * Spot selection: the best-scoring candidate right now. The spot is free to
 * change from hour to hour as conditions move down the coast — that is the
 * intent, because Now answers "can I go", not "how is my usual spot". The cam
 * and station shown always belong to the returned spot; a verdict for one spot
 * beside another's cam would be actively misleading.
 */
export function useNowData(sport, favoriteIds = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  // Gated here, not just at the EvidenceStack card: the card and the verdict
  // are two different surfaces reading the same reading, and the flag being
  // off must mean the delta cannot move the verdict either — otherwise the
  // moment the cron starts running, a station can flip NO to MARGINAL while
  // the card that would explain why stays hidden (RAD station-evidence).
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

        // Now speaks for ONE spot, so it has to be one the rider actually goes
        // to. Ranking the whole coast would send someone an hour up the road
        // without saying so — with favourites it is their own beaches, and
        // without them the screen asks rather than guesses.
        const all = spotsWithSlots(report, sport);
        const mine = favoriteIds.length
          ? all.filter(({ spot }) => favoriteIds.includes(spot._id))
          : [];

        if (favoriteIds.length === 0) {
          setState({
            loading: false,
            error: null,
            data: { needsFavorites: true, verdict: null, spot: null },
          });
          return;
        }

        for (const { spot, slots, config } of (mine.length ? mine : all)) {
          if (slots.length === 0) continue;
          const slot = currentSlot(slots, now);
          if (!slot) continue;
          candidates.push({ spot, slot, slots, score: slot.score, config });
        }

        const chosen = pickNowSpot(candidates);
        if (!chosen) {
          setState({
            loading: false,
            error: null,
            // Favourites exist but none of them support this sport, or none
            // have slots — different from having no favourites at all.
            data: { verdict: null, spot: null, noSpotForSport: mine.length === 0 },
          });
          return;
        }

        // Model agreement for the chosen spot's current slot. A failure here
        // must read as "no model data", never as disagreement.
        let agreement = null;
        try {
          const modelRows = await client.query(api.models.getModelSlotsForSpot, {
            spotId: chosen.spot._id,
            sinceTimestamp: now - 3 * 60 * 60 * 1000,
          });
          const byTime = groupByTimestamp(modelRows);
          const threshold = thresholdFor(chosen.config, sport, chosen.slots);
          if (threshold) {
            agreement = agreementFor(byTime.get(chosen.slot.timestamp) || [], threshold);
          }
        } catch {
          agreement = null;
        }
        if (cancelled) return;

        // The live station, when the chosen spot has one. As with agreement,
        // a failure here must read as "no station", never as a reading.
        let station = null;
        const stationId = stationIdFromUrl(chosen.spot.liveReportUrl);
        if (stationId) {
          try {
            const readings = await client.query(api.stations.getStationReadings, {
              stationId,
              // Match lib/station HISTORY_MS (6h sparkline window).
              sinceAt: now - 6 * 60 * 60 * 1000,
            });
            station = buildStationCard({
              readings,
              forecastSlot: chosen.slot,
              // Full trail so the sparkline can paint the model over 6h, not
              // just the single slot used for the "+N vs forecast" delta.
              forecastSlots: chosen.slots,
              proximity: classifyProximity(stationId, chosen.spot),
              nowMs: now,
            });
          } catch {
            station = null;
          }
        }
        if (cancelled) return;

        const verdict = deriveVerdict({
          score: chosen.score,
          agreement,
          stationDelta: showStation ? (station?.delta ?? null) : null,
        });

        // Where the rider should look instead, when the answer is no.
        // Daylight only — a window starting at 04:00 is not a session anyone
        // is being offered, and it is what the chart draws from too.
        const bySpot = candidates.map((c) => ({
          spot: c.spot,
          windows: detectWindows(c.slots.filter((s) => isChartedSlot(s.timestamp))),
        }));
        const next = soonestWindow(bySpot, now);
        // The verdict card above is already describing the chosen spot's
        // running window; listing it again here showed the same session twice.
        const nextWindows = upcomingWindows(bySpot, now, 3, {
          excludeActiveAt: chosen.spot._id,
        });

        // Remaining charted slots today from NOW, capped at 4. Shape is what
        // says "and it holds" or "and it dies" once the hero wind row went away
        // and each cell carries its own reading.
        //
        // Contiguous only. The charted slots skip the night, so at 20:00 the
        // "next" ones are tomorrow 07:00 — drawing those beside NOW claims a
        // continuation that does not exist. A run that stops stops.
        const SLOT_MS = SLOT_HOURS * 60 * 60 * 1000;
        const TRAJECTORY_MAX = 4;
        const charted = chosen.slots.filter((s) => isChartedSlot(s.timestamp));
        const fromIndex = charted.findIndex((s) => s.timestamp === chosen.slot.timestamp);
        const trajectory = [];
        if (fromIndex !== -1) {
          for (const slot of charted.slice(fromIndex, fromIndex + TRAJECTORY_MAX)) {
            const previous = trajectory[trajectory.length - 1];
            if (previous && slot.timestamp - previous.timestamp > SLOT_MS) break;
            trajectory.push(slot);
          }
        }

        // "Nothing at your spots" and "nothing on the coast" are completely
        // different decisions, and the screen could not tell them apart. Only
        // meaningful when the rider actually has favourites to be scoped to.
        const scopedToFavorites = mine.length > 0;
        const dayEnd = now + 24 * 60 * 60 * 1000;
        // Narrow BEFORE the expensive part. detectWindows plus the per-slot
        // charted-hours check over every spot on the coast is a lot of work for
        // a single integer, and almost all of those slots are outside the next
        // 24 hours. Filtering on timestamp first is a plain numeric compare and
        // throws away the large majority of them.
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

        setState({
          loading: false,
          error: null,
          data: {
            verdict,
            trajectory,
            elsewhereToday,
            spot: chosen.spot,
            slot: chosen.slot,
            agreement,
            station,
            score: chosen.score,
            reasoning: chosen.slot.reasoning,
            nextWindow: next,
            nextWindows,
            reason: verdictReason({
              verdict,
              holdsUntil: holdsUntil(chosen.slots, now),
              agreement,
              stationDelta: showStation ? (station?.delta ?? null) : null,
              nextWindowStart: next?.window?.start ?? null,
            }),
          },
        });
      } catch (error) {
        if (cancelled) return;
        // Surfacing this matters: the audit flags that the report swallows
        // Convex errors and shows "No conditions", which is indistinguishable
        // from a genuinely flat day (RAD-59).
        setState({ loading: false, error, data: null });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sport, favoriteIds.join(","), showStation]);

  return state;
}
