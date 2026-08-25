import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  scoreRetentionBounds,
  shouldDeleteExpiredSystemScore,
} from "../lib/convex/scoreRetention";

const SLICE = 100;

export const listSpotSportTargets = internalQuery({
  args: {},
  handler: async (ctx) => {
    const spots = await ctx.db.query("spots").collect();
    const targets: { spotId: Id<"spots">; sport: string }[] = [];
    for (const spot of spots) {
      const sports =
        spot.sports && spot.sports.length > 0 ? spot.sports : ["wingfoil"];
      for (const sport of sports) {
        targets.push({ spotId: spot._id, sport });
      }
    }
    return targets;
  },
});

export const deleteExpiredSystemScoreSlice = internalMutation({
  args: {
    spotId: v.id("spots"),
    sport: v.string(),
    side: v.union(v.literal("past"), v.literal("future")),
    now: v.number(),
    afterTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const bounds = scoreRetentionBounds(args.now);
    let query = ctx.db
      .query("condition_scores")
      .withIndex("by_spot_sport_timestamp", (q) => {
        if (args.side === "past") {
          const upper = args.afterTimestamp ?? bounds.cutoffLow;
          return q
            .eq("spotId", args.spotId)
            .eq("sport", args.sport)
            .lt("timestamp", upper);
        }
        const lower = args.afterTimestamp ?? bounds.cutoffHigh;
        return q
          .eq("spotId", args.spotId)
          .eq("sport", args.sport)
          .gt("timestamp", lower);
      });

    if (args.side === "past") {
      query = query.order("desc");
    }

    const rows = await query.take(SLICE);
    let deleted = 0;
    for (const row of rows) {
      if (shouldDeleteExpiredSystemScore(row, bounds)) {
        await ctx.db.delete(row._id);
        deleted += 1;
      }
    }

    const last = rows[rows.length - 1];
    return {
      scanned: rows.length,
      deleted,
      more: rows.length === SLICE,
      cursor: last?.timestamp,
    };
  },
});

/**
 * Delete system condition_scores outside the 2-back / 7-forward read window.
 * Personalized rows are never deleted. Paginates per spot/sport/time slice.
 */
export const retainConditionScores = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const targets = await ctx.runQuery(internal.scoreRetention.listSpotSportTargets, {});
    let deleted = 0;
    let scanned = 0;

    for (const target of targets) {
      for (const side of ["past", "future"] as const) {
        let afterTimestamp: number | undefined;
        for (let i = 0; i < 50; i += 1) {
          const slice = await ctx.runMutation(
            internal.scoreRetention.deleteExpiredSystemScoreSlice,
            {
              spotId: target.spotId,
              sport: target.sport,
              side,
              now,
              afterTimestamp,
            }
          );
          deleted += slice.deleted;
          scanned += slice.scanned;
          if (!slice.more) break;
          afterTimestamp = slice.cursor;
          if (afterTimestamp === undefined) break;
        }
      }
    }

    console.log("condition_scores retention", { scanned, deleted, targets: targets.length });
    return { scanned, deleted };
  },
});
