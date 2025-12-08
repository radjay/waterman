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

// Helper function to validate if a scrape is successful
// A successful scrape should have several days worth of forecast data
function validateScrape(slots: Array<{ timestamp: number; speed: number; gust: number; direction: number }>): { isValid: boolean; errorMessage?: string } {
    if (slots.length === 0) {
        return { isValid: false, errorMessage: "No slots collected" };
    }

    // Filter out tide-only entries (they have speed/gust/direction = 0)
    const forecastSlots = slots.filter(slot => 
        slot.speed > 0 || slot.gust > 0 || slot.direction > 0
    );

    if (forecastSlots.length === 0) {
        return { isValid: false, errorMessage: "No forecast slots with valid wind data" };
    }

    // Check that we have data for future timestamps (not all in the past)
    const now = Date.now();
    const futureSlots = forecastSlots.filter(slot => slot.timestamp > now);
    
    if (futureSlots.length === 0) {
        return { isValid: false, errorMessage: "No future forecast data" };
    }

    // Check that we have data spanning several days
    // Calculate the time span covered by the forecast
    const timestamps = forecastSlots.map(s => s.timestamp).sort((a, b) => a - b);
    const timeSpan = timestamps[timestamps.length - 1] - timestamps[0];
    const daysSpan = timeSpan / (1000 * 60 * 60 * 24); // Convert ms to days

    // Require at least 2 days of forecast data
    if (daysSpan < 2) {
        return { isValid: false, errorMessage: `Only ${daysSpan.toFixed(1)} days of data, need at least 2 days` };
    }

    // Require minimum number of slots (at least 20 slots for 2+ days)
    if (forecastSlots.length < 20) {
        return { isValid: false, errorMessage: `Only ${forecastSlots.length} forecast slots, need at least 20` };
    }

    return { isValid: true };
}

// New Granular Storage with Historical Tracking
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
        })),
        scrapeTimestamp: v.number(), // When this scrape ran
    },
    returns: v.object({
        scrapeId: v.id("scrapes"),
        isSuccessful: v.boolean(),
    }),
    handler: async (ctx, args) => {
        // Validate the scrape
        const validation = validateScrape(args.slots);
        const isSuccessful = validation.isValid;

        // Record the scrape in the scrapes table
        const scrapeId = await ctx.db.insert("scrapes", {
            spotId: args.spotId,
            scrapeTimestamp: args.scrapeTimestamp,
            isSuccessful,
            slotsCount: args.slots.length,
            errorMessage: validation.errorMessage,
        });

        // Only write slots if we have data (even if unsuccessful, we write partial data)
        if (args.slots.length > 0) {
            // Append new slots with scrapeTimestamp (never delete existing)
            for (const slot of args.slots) {
                await ctx.db.insert("forecast_slots", {
                    spotId: args.spotId,
                    scrapeTimestamp: args.scrapeTimestamp,
                    ...slot
                });
            }
        }

        return {
            scrapeId,
            isSuccessful,
        };
    }
});

export const getForecastSlots = query({
    args: { spotId: v.id("spots") },
    returns: v.array(v.object({
        _id: v.id("forecast_slots"),
        _creationTime: v.number(),
        spotId: v.id("spots"),
        timestamp: v.number(),
        scrapeTimestamp: v.optional(v.number()),
        speed: v.number(),
        gust: v.number(),
        direction: v.number(),
        waveHeight: v.optional(v.number()),
        wavePeriod: v.optional(v.number()),
        waveDirection: v.optional(v.number()),
        tideHeight: v.optional(v.number()),
        tideType: v.optional(v.string()),
        tideTime: v.optional(v.number()),
    })),
    handler: async (ctx, args) => {
        // Find all scrapes for this spot, ordered by timestamp descending
        const allScrapes = await ctx.db
            .query("scrapes")
            .withIndex("by_spot_and_timestamp", q => q.eq("spotId", args.spotId))
            .order("desc")
            .collect();

        // Find the most recent successful scrape
        const lastSuccessfulScrape = allScrapes.find(scrape => scrape.isSuccessful);

        if (!lastSuccessfulScrape) {
            // No successful scrapes yet, return empty array
            return [];
        }

        // Return only slots from this successful scrape
        const slots = await ctx.db
            .query("forecast_slots")
            .withIndex("by_spot_and_scrape_timestamp", q => 
                q.eq("spotId", args.spotId)
                 .eq("scrapeTimestamp", lastSuccessfulScrape.scrapeTimestamp)
            )
            .collect();
        
        // Filter out any slots without scrapeTimestamp (shouldn't happen for new scrapes, but safety check)
        return slots.filter(slot => slot.scrapeTimestamp !== undefined);
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
