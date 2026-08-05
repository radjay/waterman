import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Per-model wind series: writes, reads and retention.
 *
 * Two constraints shape this file:
 *
 * 1. Production and development share one Convex deployment. Anything written
 *    here is production data, and a schema push is a production push.
 * 2. The audit's highest-priority finding is that the Convex write boundary is
 *    already open and unauthenticated. This does not widen it further than the
 *    existing scrape path already is — `saveModelSlots` is called by the same
 *    scraper that already calls `saveForecastSlots`, and should be moved behind
 *    the same auth as that one when it gets fixed, not separately.
 */

/** Keep this many scrapes of model data per spot. See schema note. */
const RETAINED_SCRAPES = 3;

export const saveModelSlots = mutation({
    args: {
        spotId: v.id("spots"),
        scrapeTimestamp: v.number(),
        models: v.array(
            v.object({
                model: v.string(),
                slots: v.array(
                    v.object({
                        timestamp: v.number(),
                        speed: v.number(),
                        gust: v.number(),
                        direction: v.number(),
                    })
                ),
            })
        ),
    },
    handler: async (ctx, { spotId, scrapeTimestamp, models }) => {
        let inserted = 0;
        for (const { model, slots } of models) {
            for (const slot of slots) {
                await ctx.db.insert("forecast_model_slots", {
                    spotId,
                    model,
                    scrapeTimestamp,
                    timestamp: slot.timestamp,
                    speed: slot.speed,
                    gust: slot.gust,
                    direction: slot.direction,
                });
                inserted++;
            }
        }

        // Prune in the same mutation that writes. Introducing retention later
        // would mean first letting the table grow unbounded — five models
        // multiply forecast volume, and nothing else in this schema prunes.
        const existing = await ctx.db
            .query("forecast_model_slots")
            .withIndex("by_spot_and_scrape", (q) => q.eq("spotId", spotId))
            .collect();

        const scrapes = [...new Set(existing.map((row) => row.scrapeTimestamp))].sort(
            (a, b) => b - a
        );
        const stale = new Set(scrapes.slice(RETAINED_SCRAPES));

        let deleted = 0;
        if (stale.size > 0) {
            for (const row of existing) {
                if (stale.has(row.scrapeTimestamp)) {
                    await ctx.db.delete(row._id);
                    deleted++;
                }
            }
        }

        return { inserted, deleted, models: models.length };
    },
});

/**
 * Per-model rows for a spot from the most recent scrape that has them.
 *
 * Returns [] rather than throwing when a spot has no model data at all — the
 * UI must render that as "no model data", never as "models split".
 */
export const getModelSlotsForSpot = query({
    args: { spotId: v.id("spots"), sinceTimestamp: v.optional(v.number()) },
    handler: async (ctx, { spotId, sinceTimestamp }) => {
        const rows = await ctx.db
            .query("forecast_model_slots")
            .withIndex("by_spot_and_scrape", (q) => q.eq("spotId", spotId))
            .collect();

        if (rows.length === 0) return [];

        const latestScrape = Math.max(...rows.map((r) => r.scrapeTimestamp));
        const cutoff = sinceTimestamp ?? 0;

        return rows
            .filter((r) => r.scrapeTimestamp === latestScrape && r.timestamp >= cutoff)
            .map(({ model, timestamp, speed, gust, direction }) => ({
                model,
                timestamp,
                speed,
                gust,
                direction,
            }));
    },
});

/**
 * Which spot/sport pairs are voting on a sport-level default rather than their
 * own config.
 *
 * spotConfigs coverage is incomplete, and a missing config makes every model
 * vote for that pair meaningless. Nothing in the product UI would reveal that,
 * so this exists to make the gap visible and closeable from admin.
 */
export const getThresholdCoverage = query({
    args: {},
    handler: async (ctx) => {
        const spots = await ctx.db.query("spots").collect();
        const configs = await ctx.db.query("spotConfigs").collect();

        const configured = new Set(
            configs
                .filter((c) => (c.minSpeed ?? 0) > 0 || (c.minGust ?? 0) > 0)
                .map((c) => `${c.spotId}:${c.sport}`)
        );

        const gaps = [];
        for (const spot of spots) {
            if (spot.webcamOnly) continue;
            for (const sport of spot.sports ?? []) {
                if (!configured.has(`${spot._id}:${sport}`)) {
                    gaps.push({ spotId: spot._id, spotName: spot.name, sport });
                }
            }
        }
        return gaps;
    },
});
