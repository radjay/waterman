import { v } from "convex/values";
import { internalAction, internalMutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { stationTargetsFromSpots } from "../lib/stations";
import { fetchStationReading } from "../lib/windguru";
import { dedupeReadingsByTime } from "../lib/convex/stationReadings";

const READING_FIELDS = {
  time: v.number(),
  speed: v.number(),
  gust: v.optional(v.number()),
  direction: v.optional(v.number()),
  tempC: v.optional(v.number()),
};

/** Tolerance for clock skew between us and the station. */
const FUTURE_TOLERANCE_MS = 60 * 1000;
/** Well above any real reading, low enough to catch garbage like wind_avg: 9999. */
const MAX_PLAUSIBLE_SPEED_KNOTS = 150;

/**
 * Guards that must hold for every write, on every path.
 *
 * `parseCurrentReading` (lib/windguru.js) already applies guards like this,
 * but it sits on only one of the write paths — the cron. The backfill script
 * bypasses it entirely, and this mutation is public, so any direct caller
 * bypasses it too. Validating argument *types* is not validating the
 * *values*: `saveStationReadings({ time: Date.now(), speed: 9999 })` has
 * always been a legal call by the schema alone. This is the one place every
 * write to station_readings passes through, so it is the one place these
 * checks can actually hold.
 *
 * Deliberately no lower bound on time: the backfill legitimately writes
 * readings back to 2020.
 */
function isPlausibleReading(reading: { time: number; speed: number }, nowMs: number) {
  if (!Number.isFinite(reading.time) || reading.time <= 0) return false;
  if (reading.time > nowMs + FUTURE_TOLERANCE_MS) return false;
  if (!Number.isFinite(reading.speed) || reading.speed < 0) return false;
  if (reading.speed > MAX_PLAUSIBLE_SPEED_KNOTS) return false;
  return true;
}

/**
 * Readings for one station, newest first.
 *
 * The Now card asks for the trailing 90 minutes. The default limit is sized
 * for that at a 5-minute cadence, with headroom for a station reporting more
 * often than we poll.
 */
export const getStationReadings = query({
  args: {
    stationId: v.string(),
    sinceAt: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("station_readings")
      .withIndex("by_station_time", (q) =>
        q.eq("stationId", args.stationId).gte("time", args.sinceAt)
      )
      .order("desc")
      .take(args.limit ?? 200);

    return rows;
  },
});

/**
 * Insert readings that are not already stored.
 *
 * Internal. The only writer is pollStations, above.
 *
 * This was public while the one-off backfill drove it over HTTP. That is done,
 * and public was never the right resting state: NEXT_PUBLIC_CONVEX_URL ships in
 * the client bundle, and this table feeds deriveVerdict — so an unauthenticated
 * caller could post a plausible reading and change the advice the app gives,
 * permanently, since nothing prunes this table. The plausibility guards below
 * bound the absurdity; they cannot tell a believable lie from a measurement.
 *
 * To backfill again, make this a `mutation` for the duration of the run.
 */
export const saveStationReadings = internalMutation({
  args: {
    stationId: v.string(),
    readings: v.array(v.object(READING_FIELDS)),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let skipped = 0;
    const nowMs = Date.now();

    for (const reading of dedupeReadingsByTime(args.readings)) {
      if (!isPlausibleReading(reading, nowMs)) {
        skipped += 1;
        continue;
      }

      const existing = await ctx.db
        .query("station_readings")
        .withIndex("by_station_time", (q) =>
          q.eq("stationId", args.stationId).eq("time", reading.time)
        )
        .first();

      if (existing) {
        skipped += 1;
        continue;
      }

      await ctx.db.insert("station_readings", {
        stationId: args.stationId,
        time: reading.time,
        speed: reading.speed,
        gust: reading.gust,
        direction: reading.direction,
        tempC: reading.tempC,
      });
      inserted += 1;
    }

    return { inserted, skipped };
  },
});

/** Spots carrying a live report url, for target derivation. */
export const listStationSpots = query({
  args: {},
  handler: async (ctx) => {
    const spots = await ctx.db.query("spots").collect();
    return spots
      .filter((spot) => Boolean(spot.liveReportUrl) && spot.enabled !== false)
      .map((spot) => ({ _id: spot._id, liveReportUrl: spot.liveReportUrl }));
  },
});

/**
 * Poll every distinct station behind a spot's liveReportUrl.
 *
 * Each station is isolated: a dead or erroring feed must never stop the
 * others, following the model-ingest precedent in 5311534. A station that
 * returns nothing usable — 15435 is dead and sends no unixtime — simply
 * contributes no rows.
 */
export const pollStations = internalAction({
  args: {},
  handler: async (ctx) => {
    const spots = await ctx.runQuery(api.stations.listStationSpots, {});
    const targets = stationTargetsFromSpots(spots);

    let inserted = 0;
    for (const target of targets) {
      try {
        const reading = await fetchStationReading(target.stationId);
        if (!reading) continue;

        const result = await ctx.runMutation(internal.stations.saveStationReadings, {
          stationId: target.stationId,
          readings: [reading],
        });
        inserted += result.inserted;
      } catch (error) {
        console.error(`station ${target.stationId} poll failed`, error);
      }
    }

    // Log on every run, not just failures. The worker this cron replaced
    // died silently for eight weeks; a run that inserts zero rows every time
    // (a Windguru schema change, say) must not be equally silent.
    console.log(`stations poll: ${targets.length} stations, ${inserted} inserted`);

    return { stations: targets.length, inserted };
  },
});
