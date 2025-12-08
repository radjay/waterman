import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Validate that a scrape contains sufficient data
function validateScrape(slots) {
    const MIN_SLOTS = 10; // Minimum number of slots for a successful scrape
    const now = Date.now();
    const FUTURE_THRESHOLD = now + (24 * 60 * 60 * 1000); // At least 24 hours of future data

    if (slots.length < MIN_SLOTS) {
        return {
            isValid: false,
            errorMessage: `Insufficient slots: ${slots.length} < ${MIN_SLOTS}`
        };
    }

    // Check that we have future data
    const futureSlots = slots.filter(s => s.timestamp > now);
    if (futureSlots.length === 0) {
        return {
            isValid: false,
            errorMessage: "No future forecast data found"
        };
    }

    // Check that we have at least 24 hours of future data
    const maxTimestamp = Math.max(...slots.map(s => s.timestamp));
    if (maxTimestamp < FUTURE_THRESHOLD) {
        return {
            isValid: false,
            errorMessage: "Insufficient future forecast coverage"
        };
    }

    return { isValid: true, errorMessage: undefined };
}

export const list = query({
    args: { sports: v.optional(v.array(v.string())) },
    handler: async (ctx, args) => {
        const allSpots = await ctx.db.query("spots").collect();
        
        // If sports filter is provided, filter spots that have any of those sports
        if (args.sports && args.sports.length > 0) {
            return allSpots.filter(spot => {
                const spotSports = spot.sports || [];
                return args.sports.some(sport => spotSports.includes(sport));
            });
        }
        
        return allSpots;
    },
});

export const getSpotConfig = query({
    args: { 
        spotId: v.id("spots"),
        sport: v.string(),
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

// New Granular Storage
export const saveForecastSlots = mutation({
    args: {
        spotId: v.id("spots"),
        scrapeTimestamp: v.number(),
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
    returns: v.object({
        scrapeId: v.id("scrapes"),
        isSuccessful: v.boolean(),
    }),
    handler: async (ctx, args) => {
        // Validate the scrape
        const validation = validateScrape(args.slots);
        const isSuccessful = validation.isValid;

        // Record the scrape
        const scrapeId = await ctx.db.insert("scrapes", {
            spotId: args.spotId,
            scrapeTimestamp: args.scrapeTimestamp,
            isSuccessful,
            slotsCount: args.slots.length,
            errorMessage: validation.errorMessage,
        });

        // Insert new slots with scrapeTimestamp (keep historical data)
        if (args.slots.length > 0) {
            for (const slot of args.slots) {
                await ctx.db.insert("forecast_slots", {
                    spotId: args.spotId,
                    scrapeTimestamp: args.scrapeTimestamp,
                    ...slot
                });
            }
        }

        return { scrapeId, isSuccessful };
    }
});

export const getForecastSlots = query({
    args: { spotId: v.id("spots") },
    handler: async (ctx, args) => {
        // Get all slots for this spot to find available scrape timestamps
        const allSlots = await ctx.db
            .query("forecast_slots")
            .withIndex("by_spot", q => q.eq("spotId", args.spotId))
            .collect();
        
        if (allSlots.length === 0) {
            return [];
        }

        // Find all unique scrape timestamps from slots
        const slotScrapeTimestamps = [...new Set(
            allSlots.map(s => s.scrapeTimestamp).filter(ts => ts !== undefined && ts !== null)
        )];

        if (slotScrapeTimestamps.length === 0) {
            // No scrapeTimestamp on any slots - return all slots (legacy data)
            return allSlots;
        }

        // Find all successful scrapes for this spot
        const successfulScrapes = await ctx.db
            .query("scrapes")
            .withIndex("by_spot_and_timestamp", q => q.eq("spotId", args.spotId))
            .filter(q => q.eq(q.field("isSuccessful"), true))
            .collect();

        let targetScrapeTimestamp = null;

        if (successfulScrapes.length > 0) {
            // Find the most recent successful scrape timestamp
            const lastSuccessfulTimestamp = Math.max(
                ...successfulScrapes.map(s => s.scrapeTimestamp)
            );
            
            // Use the most recent timestamp from either successful scrapes OR slots
            // (in case a scrape ran but the scrape record wasn't created/marked successful)
            targetScrapeTimestamp = Math.max(
                lastSuccessfulTimestamp,
                ...slotScrapeTimestamps
            );
        } else {
            // No successful scrapes - use the most recent slot timestamp
            targetScrapeTimestamp = Math.max(...slotScrapeTimestamps);
        }

        // Get all slots from the target scrape
        if (targetScrapeTimestamp === null) {
            return [];
        }
        
        // Use filter instead of index to handle optional field better
        return allSlots.filter(s => s.scrapeTimestamp === targetScrapeTimestamp);
    }
});

export const getMostRecentScrapeTimestamp = query({
    args: {},
    handler: async (ctx) => {
        // Get all successful scrapes
        const allScrapes = await ctx.db.query("scrapes").collect();
        const successfulScrapes = allScrapes.filter(s => s.isSuccessful);
        
        if (successfulScrapes.length === 0) {
            return null;
        }
        
        // Find the most recent successful scrape timestamp
        const mostRecentTimestamp = Math.max(
            ...successfulScrapes.map(s => s.scrapeTimestamp)
        );
        
        return mostRecentTimestamp;
    }
});

export const updateWindySpotId = mutation({
    args: {
        spotId: v.id("spots"),
        windySpotId: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.spotId, {
            windySpotId: args.windySpotId,
        });
    },
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

export const removeTodayScrapes = mutation({
    args: {},
    handler: async (ctx) => {
        // Calculate start of today (midnight UTC)
        const now = new Date();
        const startOfToday = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            0, 0, 0, 0
        ));
        const startOfTodayTimestamp = startOfToday.getTime();

        // Find all scrapes from today
        const allScrapes = await ctx.db.query("scrapes").collect();
        const todayScrapes = allScrapes.filter(
            scrape => scrape.scrapeTimestamp >= startOfTodayTimestamp
        );

        // Collect all scrape timestamps from today
        const todayScrapeTimestamps = new Set(
            todayScrapes.map(s => s.scrapeTimestamp)
        );

        // Delete all scrapes from today
        let deletedScrapesCount = 0;
        for (const scrape of todayScrapes) {
            await ctx.db.delete(scrape._id);
            deletedScrapesCount++;
        }

        // Delete all forecast_slots from today
        const allSlots = await ctx.db.query("forecast_slots").collect();
        const todaySlots = allSlots.filter(
            slot => slot.scrapeTimestamp && todayScrapeTimestamps.has(slot.scrapeTimestamp)
        );

        let deletedSlotsCount = 0;
        for (const slot of todaySlots) {
            await ctx.db.delete(slot._id);
            deletedSlotsCount++;
        }

        return {
            deletedScrapesCount,
            deletedSlotsCount,
            message: `Removed ${deletedScrapesCount} scrapes and ${deletedSlotsCount} forecast slots from today`
        };
    }
});
