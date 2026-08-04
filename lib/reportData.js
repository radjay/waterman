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
    .map((slot) => ({
      ...slot,
      score: entry.scoresMap?.[`${slot.timestamp}_${sport}`]?.score ?? null,
    }))
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
