"use client";

import { useEffect, useState } from "react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { agreementFor, groupByTimestamp, thresholdFor } from "../../lib/agreement";
import { deriveVerdict, pickNowSpot, verdictReason } from "../../lib/verdict";
import {
  detectWindows,
  isChartedSlot,
  soonestWindow,
  upcomingWindows,
} from "../../lib/windows";
import { spotsWithSlots } from "../../lib/reportData";

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

        const verdict = deriveVerdict({
          score: chosen.score,
          agreement,
          stationDelta: null,
        });

        // Where the rider should look instead, when the answer is no.
        // Daylight only — a window starting at 04:00 is not a session anyone
        // is being offered, and it is what the chart draws from too.
        const bySpot = candidates.map((c) => ({
          spot: c.spot,
          windows: detectWindows(c.slots.filter((s) => isChartedSlot(s.timestamp))),
        }));
        const next = soonestWindow(bySpot, now);
        const nextWindows = upcomingWindows(bySpot, now, 3);

        setState({
          loading: false,
          error: null,
          data: {
            verdict,
            spot: chosen.spot,
            slot: chosen.slot,
            agreement,
            score: chosen.score,
            reasoning: chosen.slot.reasoning,
            nextWindow: next,
            nextWindows,
            reason: verdictReason({
              verdict,
              holdsUntil: holdsUntil(chosen.slots, now),
              agreement,
              stationDelta: null,
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
  }, [sport, favoriteIds.join(",")]);

  return state;
}
