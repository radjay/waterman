import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { historyCutoff, scoringLogCutoff } from "../lib/convex/historyRetention.js";
import { stationIdFromUrl } from "../lib/stations.js";

const SLICE = 80;
const LOG_SLICE = 8;
const MAX_LOOPS = 15;

export const listRetentionTargets = internalQuery({
  args: {},
  handler: async (ctx) => {
    const spots = await ctx.db.query("spots").collect();
    const spotIds = spots.map((s) => s._id);
    const sports = new Set<string>();
    const stationIds = new Set<string>();
    for (const spot of spots) {
      for (const sport of spot.sports && spot.sports.length > 0 ? spot.sports : ["wingfoil"]) {
        sports.add(sport);
      }
      const stationId = stationIdFromUrl(spot.liveReportUrl ?? "");
      if (stationId) stationIds.add(stationId);
    }
    const fxLocations = await ctx.db.query("fx_locations").collect();
    const fxWorkerNames = [
      ...new Set(
        (await ctx.db.query("fx_worker_runs").take(200)).map((row) => row.workerName)
      ),
    ];
    return {
      spotIds,
      sports: [...sports],
      stationIds: [...stationIds],
      locationSlugs: fxLocations.map((row) => row.slug),
      fxWorkerNames,
    };
  },
});

async function deleteByPrefixTime(
  ctx: { db: any },
  table: string,
  index: string,
  eqField: string,
  eqValue: string | boolean,
  timeField: string,
  cutoff: number,
  slice: number
) {
  const rows = await ctx.db
    .query(table)
    .withIndex(index, (q: any) => q.eq(eqField, eqValue).lt(timeField, cutoff))
    .take(slice);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return {
    deleted: rows.length,
    more: rows.length === slice,
  };
}

export const deleteStationReadingSlice = internalMutation({
  args: { stationId: v.string(), cutoff: v.number() },
  handler: async (ctx, args) =>
    deleteByPrefixTime(
      ctx,
      "station_readings",
      "by_station_time",
      "stationId",
      args.stationId,
      "time",
      args.cutoff,
      SLICE
    ),
});

export const deleteScoringLogSlice = internalMutation({
  args: { spotId: v.id("spots"), cutoff: v.number() },
  handler: async (ctx, args) =>
    deleteByPrefixTime(
      ctx,
      "scoring_logs",
      "by_spot_timestamp_sport",
      "spotId",
      args.spotId,
      "timestamp",
      args.cutoff,
      LOG_SLICE
    ),
});

export const deleteScoreHistorySlice = internalMutation({
  args: { spotId: v.id("spots"), cutoff: v.number() },
  handler: async (ctx, args) =>
    deleteByPrefixTime(
      ctx,
      "score_history",
      "by_spot_timestamp",
      "spotId",
      args.spotId,
      "timestamp",
      args.cutoff,
      SLICE
    ),
});

export const deleteForecastArchiveSlice = internalMutation({
  args: { spotId: v.id("spots"), cutoff: v.number() },
  handler: async (ctx, args) =>
    deleteByPrefixTime(
      ctx,
      "forecast_slots_archive",
      "by_spot_and_scrape_timestamp",
      "spotId",
      args.spotId,
      "scrapeTimestamp",
      args.cutoff,
      SLICE
    ),
});

export const deleteFxObservationSlice = internalMutation({
  args: { locationSlug: v.string(), cutoff: v.number() },
  handler: async (ctx, args) =>
    deleteByPrefixTime(
      ctx,
      "fx_observations",
      "by_location_observed",
      "locationSlug",
      args.locationSlug,
      "observedAt",
      args.cutoff,
      SLICE
    ),
});

export const deleteFxForecastPointSlice = internalMutation({
  args: { locationSlug: v.string(), cutoff: v.number() },
  handler: async (ctx, args) =>
    deleteByPrefixTime(
      ctx,
      "fx_forecast_points",
      "by_location_valid",
      "locationSlug",
      args.locationSlug,
      "validTime",
      args.cutoff,
      SLICE
    ),
});

export const deleteFxForecastRunSlice = internalMutation({
  args: { cutoff: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("fx_forecast_runs")
      .withIndex("by_run_started", (q) => q.lt("runStartedAt", args.cutoff))
      .take(SLICE);
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    return { deleted: rows.length, more: rows.length === SLICE };
  },
});

export const deleteFxWorkerRunSlice = internalMutation({
  args: { workerName: v.string(), cutoff: v.number() },
  handler: async (ctx, args) =>
    deleteByPrefixTime(
      ctx,
      "fx_worker_runs",
      "by_worker_started",
      "workerName",
      args.workerName,
      "startedAt",
      args.cutoff,
      SLICE
    ),
});

export const deleteScrapeSlice = internalMutation({
  args: { isSuccessful: v.boolean(), cutoff: v.number() },
  handler: async (ctx, args) =>
    deleteByPrefixTime(
      ctx,
      "scrapes",
      "by_success_timestamp",
      "isSuccessful",
      args.isSuccessful,
      "scrapeTimestamp",
      args.cutoff,
      SLICE
    ),
});

async function drain(
  ctx: { runMutation: Function },
  fn: any,
  args: Record<string, unknown>
) {
  let deleted = 0;
  let more = false;
  for (let i = 0; i < MAX_LOOPS; i += 1) {
    try {
      const slice = await ctx.runMutation(fn, args);
      deleted += slice.deleted;
      more = Boolean(slice.more);
      if (!slice.more) break;
    } catch (error) {
      console.error("history retention slice failed", error);
      more = true;
      break;
    }
  }
  return { deleted, more };
}

/**
 * Drop Convex history older than 30 days (scoring logs: 7 days).
 * Full history lives in archive/ and R2 waterman-archive.
 */
export const retainHistory = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = historyCutoff(now);
    const logCutoff = scoringLogCutoff(now);
    const targets = await ctx.runQuery(internal.historyRetention.listRetentionTargets, {});
    const deleted: Record<string, number> = {};
    let more = false;

    deleted.station_readings = 0;
    for (const stationId of targets.stationIds) {
      const slice = await drain(ctx, internal.historyRetention.deleteStationReadingSlice, {
        stationId,
        cutoff,
      });
      deleted.station_readings += slice.deleted;
      more = more || slice.more;
    }

    deleted.scoring_logs = 0;
    deleted.score_history = 0;
    deleted.forecast_slots_archive = 0;
    for (const spotId of targets.spotIds as Id<"spots">[]) {
      const logs = await drain(ctx, internal.historyRetention.deleteScoringLogSlice, {
        spotId,
        cutoff: logCutoff,
      });
      deleted.scoring_logs += logs.deleted;
      more = more || logs.more;
      const history = await drain(ctx, internal.historyRetention.deleteScoreHistorySlice, {
        spotId,
        cutoff,
      });
      deleted.score_history += history.deleted;
      more = more || history.more;
      const archive = await drain(
        ctx,
        internal.historyRetention.deleteForecastArchiveSlice,
        { spotId, cutoff }
      );
      deleted.forecast_slots_archive += archive.deleted;
      more = more || archive.more;
    }

    deleted.fx_observations = 0;
    deleted.fx_forecast_points = 0;
    for (const locationSlug of targets.locationSlugs) {
      const obs = await drain(ctx, internal.historyRetention.deleteFxObservationSlice, {
        locationSlug,
        cutoff,
      });
      deleted.fx_observations += obs.deleted;
      more = more || obs.more;
      const points = await drain(
        ctx,
        internal.historyRetention.deleteFxForecastPointSlice,
        { locationSlug, cutoff }
      );
      deleted.fx_forecast_points += points.deleted;
      more = more || points.more;
    }

    const runs = await drain(ctx, internal.historyRetention.deleteFxForecastRunSlice, {
      cutoff,
    });
    deleted.fx_forecast_runs = runs.deleted;
    more = more || runs.more;

    deleted.fx_worker_runs = 0;
    for (const workerName of targets.fxWorkerNames) {
      const workers = await drain(ctx, internal.historyRetention.deleteFxWorkerRunSlice, {
        workerName,
        cutoff,
      });
      deleted.fx_worker_runs += workers.deleted;
      more = more || workers.more;
    }

    deleted.scrapes = 0;
    for (const isSuccessful of [true, false]) {
      const scrapes = await drain(ctx, internal.historyRetention.deleteScrapeSlice, {
        isSuccessful,
        cutoff,
      });
      deleted.scrapes += scrapes.deleted;
      more = more || scrapes.more;
    }

    if (more) {
      await ctx.scheduler.runAfter(0, internal.historyRetention.retainHistory, {});
    }

    console.log("history retention", { ...deleted, more });
    return { ...deleted, more };
  },
});

