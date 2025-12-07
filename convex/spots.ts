import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
    args: {
        sports: v.optional(v.array(v.string())), // Filter by sports
    },
    handler: async (ctx, args) => {
        const allSpots = await ctx.db.query("spots").collect();
        
        // If sports filter provided, only return spots that have at least one matching sport
        if (args.sports && args.sports.length > 0) {
            return allSpots.filter(spot => {
                const spotSports = spot.sports || [];
                return spotSports.length > 0 && spotSports.some(sport => args.sports!.includes(sport));
            });
        }
        
        return allSpots;
    },
});

export const getSpotConfig = query({
    args: { 
        spotId: v.id("spots"),
        sport: v.string(), // Get config for specific sport
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("spotConfigs")
            .filter((q) => 
                q.and(
                    q.eq(q.field("spotId"), args.spotId),
                    q.eq(q.field("sport"), args.sport)
                )
            )
            .first();
    }
});

export const getUserSpotConfig = query({
    args: {
        userId: v.string(),
        spotId: v.id("spots"),
        sport: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("userSpotConfigs")
            .withIndex("by_user_spot_sport", (q) =>
                q.eq("userId", args.userId)
                 .eq("spotId", args.spotId)
                 .eq("sport", args.sport)
            )
            .first();
    }
});

export const saveUserSpotConfig = mutation({
    args: {
        userId: v.string(),
        spotId: v.id("spots"),
        sport: v.string(),
        minSpeed: v.optional(v.number()),
        minGust: v.optional(v.number()),
        directionFrom: v.optional(v.number()),
        directionTo: v.optional(v.number()),
        minSwellHeight: v.optional(v.number()),
        maxSwellHeight: v.optional(v.number()),
        swellDirectionFrom: v.optional(v.number()),
        swellDirectionTo: v.optional(v.number()),
        minPeriod: v.optional(v.number()),
        optimalTide: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("userSpotConfigs")
            .withIndex("by_user_spot_sport", (q) =>
                q.eq("userId", args.userId)
                 .eq("spotId", args.spotId)
                 .eq("sport", args.sport)
            )
            .first();

        const config = {
            userId: args.userId,
            spotId: args.spotId,
            sport: args.sport,
            minSpeed: args.minSpeed,
            minGust: args.minGust,
            directionFrom: args.directionFrom,
            directionTo: args.directionTo,
            minSwellHeight: args.minSwellHeight,
            maxSwellHeight: args.maxSwellHeight,
            swellDirectionFrom: args.swellDirectionFrom,
            swellDirectionTo: args.swellDirectionTo,
            minPeriod: args.minPeriod,
            optimalTide: args.optimalTide,
        };

        if (existing) {
            await ctx.db.patch(existing._id, config);
            return existing._id;
        } else {
            return await ctx.db.insert("userSpotConfigs", config);
        }
    }
});

export const deleteUserSpotConfig = mutation({
    args: {
        userId: v.string(),
        spotId: v.id("spots"),
        sport: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("userSpotConfigs")
            .withIndex("by_user_spot_sport", (q) =>
                q.eq("userId", args.userId)
                 .eq("spotId", args.spotId)
                 .eq("sport", args.sport)
            )
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
        }
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
            tideHeight: v.optional(v.number()),
            tideType: v.optional(v.string()),
            tideTime: v.optional(v.number()),
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
        country: v.optional(v.string()),
        sports: v.array(v.string()),
        configs: v.array(v.object({
            sport: v.string(),
            // Wingfoiling
            minSpeed: v.optional(v.number()),
            minGust: v.optional(v.number()),
            directionFrom: v.optional(v.number()),
            directionTo: v.optional(v.number()),
            // Surfing
            minSwellHeight: v.optional(v.number()),
            maxSwellHeight: v.optional(v.number()),
            swellDirectionFrom: v.optional(v.number()),
            swellDirectionTo: v.optional(v.number()),
            minPeriod: v.optional(v.number()),
            optimalTide: v.optional(v.string()),
        }))
    },
    handler: async (ctx, args) => {
        const spotId = await ctx.db.insert("spots", {
            name: args.name,
            url: args.url,
            country: args.country,
            sports: args.sports,
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
