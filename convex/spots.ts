import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("spots").collect();
    },
});

export const getSpotConfig = query({
    args: { spotId: v.id("spots") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("spotConfigs")
            .filter((q) => q.eq(q.field("spotId"), args.spotId))
            .first();
    }
});

// New Granular Storage
export const saveForecastSlots = mutation({
    args: {
        spotId: v.id("spots"),
        slots: v.array(v.object({
            timestamp: v.number(),
            speed: v.number(),
            gust: v.number(),
            direction: v.number(),
            waveHeight: v.optional(v.number()),
            wavePeriod: v.optional(v.number()),
            waveDirection: v.optional(v.number()),
        }))
    },
    handler: async (ctx, args) => {
        // 1. Delete existing future slots for this spot to avoid duplicates
        // (For simplicity, we delete all and rewrite. Efficient enough for <100 slots)
        const existing = await ctx.db
            .query("forecast_slots")
            .withIndex("by_spot", q => q.eq("spotId", args.spotId))
            .collect();

        for (const slot of existing) {
            await ctx.db.delete(slot._id);
        }

        // 2. Insert new slots
        for (const slot of args.slots) {
            await ctx.db.insert("forecast_slots", {
                spotId: args.spotId,
                ...slot
            });
        }
    }
});

export const getForecastSlots = query({
    args: { spotId: v.id("spots") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("forecast_slots")
            .withIndex("by_spot", q => q.eq("spotId", args.spotId))
            .collect();
    }
});

export const addSpot = mutation({
    args: {
        name: v.string(),
        url: v.string(),
        configs: v.array(v.object({
            sport: v.string(),
            minSpeed: v.number(),
            minGust: v.number(),
            directionFrom: v.number(),
            directionTo: v.number(),
        }))
    },
    handler: async (ctx, args) => {
        const spotId = await ctx.db.insert("spots", {
            name: args.name,
            url: args.url
        });

        for (const config of args.configs) {
            await ctx.db.insert("spotConfigs", {
                spotId,
                ...config
            });
        }
        return spotId;
    }
});
