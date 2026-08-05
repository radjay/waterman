/**
 * Shape adapter for `api.spots.getReportData`.
 *
 * The response nests everything per spot:
 *
 *   {
 *     spots: [...],
 *     mostRecentScrapeTimestamp: number,
 *     data: {
 *       [spotId]: {
 *         slots:     [...],                      // raw forecast rows
 *         scoresMap: { "<timestamp>_<sport>": scoreDoc },   // PER SPOT
 *         configs:   { [sport]: spotConfig },
 *         tides:     [...],
 *       }
 *     }
 *   }
 *
 * The scoresMap being per-spot rather than global is the easy thing to get
 * wrong: a top-level lookup silently returns undefined for every slot, which
 * renders as "nothing on" — indistinguishable from a genuinely flat day, and
 * exactly the RAD-59 failure mode the new screens exist to avoid.
 *
 * Defined once here so the three screens cannot drift from it.
 */

/** Raw slots for a spot, ascending by timestamp, with the sport's score attached. */
export function slotsForSpot(report, spotId, sport) {
  const entry = report?.data?.[spotId];
  if (!entry?.slots) return [];

  return entry.slots
    .map((slot) => {
      const scoreDoc = entry.scoresMap?.[`${slot.timestamp}_${sport}`];
      return {
        ...slot,
        score: scoreDoc?.score ?? null,
        // The scorer's own 1-2 sentence explanation. Already stored, never
        // surfaced — it is the most honest evidence available on a spot with
        // no cam, no station and no per-model data.
        reasoning: scoreDoc?.reasoning ?? null,
        // Per-dimension breakdown (wind/wave/tide quality). Present on every
        // score row and likewise never shown until now.
        factors: scoreDoc?.factors ?? null,
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

/** The spot's config for a sport, or null. */
export function configForSpot(report, spotId, sport) {
  return report?.data?.[spotId]?.configs?.[sport] ?? null;
}

/** Every spot paired with its scored slots and config. */
export function spotsWithSlots(report, sport) {
  return (report?.spots ?? []).map((spot) => ({
    spot,
    slots: slotsForSpot(report, spot._id, sport),
    config: configForSpot(report, spot._id, sport),
  }));
}
