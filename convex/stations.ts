import { v } from "convex/values";
import { internalAction, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
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
 * Public rather than internal because the backfill script drives it over HTTP,
 * matching the existing saveForecastSlots and saveObservations mutations.
 */
export const saveStationReadings = mutation({
  args: {
    stationId: v.string(),
    readings: v.array(v.object(READING_FIELDS)),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let skipped = 0;

    for (const reading of dedupeReadingsByTime(args.readings)) {
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
      .filter((spot) => Boolean(spot.liveReportUrl))
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

        const result = await ctx.runMutation(api.stations.saveStationReadings, {
          stationId: target.stationId,
          readings: [reading],
        });
        inserted += result.inserted;
      } catch (error) {
        console.error(`station ${target.stationId} poll failed`, error);
      }
    }

    return { stations: targets.length, inserted };
  },
});
