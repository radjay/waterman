import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { extractSpotId, getForecast, getModelForecasts } from "../lib/scraper.js";
import { isForecastLive, scrapeableSpots, scrapeOneSpot, SPOT_STAGGER_MS } from "../lib/ingest/scrapePlan.js";

function spotStore(ctx: any) {
  return {
    getForecast,
    getModelForecasts,
    extractSpotId,
    saveForecastSlots: (args: any) => ctx.runMutation(api.spots.saveForecastSlots, args),
    saveTides: (args: any) => ctx.runMutation(api.spots.saveTides, args),
    saveModelSlots: (args: any) => ctx.runMutation(api.models.saveModelSlots, args),
    updateWindySpotId: (args: any) => ctx.runMutation(api.spots.updateWindySpotId, args),
  };
}

/**
 * Cron entry: schedule one scrape action per forecast spot.
 * Webcam-only spots are skipped. Failures stay on that spot.
 */
export const scrapeAllSpots = internalAction({
  args: {},
  handler: async (ctx) => {
    const spots = await ctx.runQuery(api.spots.list, {});
    const planned = scrapeableSpots(spots);
    for (let i = 0; i < planned.length; i++) {
      await ctx.scheduler.runAfter(i * SPOT_STAGGER_MS, internal.ingest.scrapeSpot, {
        spotId: planned[i]._id,
      });
    }
    console.log(`ingest scrape: scheduled ${planned.length} spots`);
    return { scheduled: planned.length };
  },
});

export const scrapeSpot = internalAction({
  args: { spotId: v.id("spots") },
  handler: async (ctx, args) => {
    const spot = await ctx.runQuery(api.spots.getSpotById, { spotId: args.spotId });
    if (!spot) {
      console.error(`ingest scrape: missing spot ${args.spotId}`);
      return { ok: false, error: "Spot not found" };
    }
    if (!isForecastLive(spot)) {
      return { ok: true, skipped: true, reason: "notLive" };
    }
    const result = await scrapeOneSpot({
      spot,
      ...spotStore(ctx),
    });
    if (!result.ok) {
      console.error(`ingest scrape failed for ${result.spotName}: ${result.error}`);
    } else {
      console.log(
        `ingest scrape ${result.spotName}: ${result.slotsCount} slots, ${result.tidesCount} tides, ${result.modelsSaved} model slots`
      );
    }
    return result;
  },
});
