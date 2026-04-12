import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { asyncMap } from "convex-helpers";
import Groq from "groq-sdk";
import { buildPrompt, buildBatchPrompt, SYSTEM_SPORT_PROMPTS, DEFAULT_TEMPORAL_PROMPT } from "./prompts";
import SunCalc from "suncalc";
import { Id } from "./_generated/dataModel";

/**
 * Validates that a scrape contains sufficient forecast data.
 * 
 * Requirements:
 * - At least 10 forecast slots
 * - Contains future forecast data
 * - At least 24 hours of future coverage
 * 
 * @param {Array} slots - Array of forecast slot objects
 * @returns {{isValid: boolean, errorMessage?: string}} Validation result
 */
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

/**
 * Query to list all spots, optionally filtered by sports.
 * Excludes webcam-only spots unless explicitly requested.
 * 
 * @param {Array<string>} [sports] - Optional array of sport IDs to filter by
 * @param {boolean} [includeWebcams] - If true, include webcam-only spots (default: false)
 * @returns {Array} Array of spot objects that support at least one of the specified sports
 */
export const list = query({
    args: { 
        sports: v.optional(v.array(v.string())),
        includeWebcams: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const allSpots = await ctx.db.query("spots").collect();
        
        // Filter out webcam-only spots unless explicitly requested
        let filteredSpots = allSpots;
        if (!args.includeWebcams) {
            filteredSpots = allSpots.filter(spot => !spot.webcamOnly);
        }
        
        // If sports filter is provided, filter spots that have any of those sports
        if (args.sports && args.sports.length > 0) {
            return filteredSpots.filter(spot => {
                const spotSports = spot.sports || [];
                return args.sports.some(sport => spotSports.includes(sport));
            });
        }
        
        return filteredSpots;
    },
});

/**
 * Query to list all webcam spots.
 *
 * @param {Array<string>} sports - Optional array of sport names to filter by (e.g., ["wingfoil", "surfing"])
 * @returns {Array} Array of webcam spot objects
 */
export const listWebcams = query({
    args: {
        sports: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const allSpots = await ctx.db.query("spots").collect();
        // Return spots that have usable webcam data:
        // 1. webcamOnly spots with webcamStreamId (new format)
        // 2. Spots with webcamUrl (old format - full URL)
        // 3. Spots with webcamStreamId (new format without webcamOnly flag)
        let webcamSpots = allSpots.filter(spot => {
            // New format: has webcamStreamId
            if (spot.webcamStreamId !== undefined) return true;
            // Old format: has webcamUrl (full URL)
            if (spot.webcamUrl !== undefined && spot.webcamUrl.trim() !== "") return true;
            return false;
        });

        // Filter by sports if provided
        if (args.sports && args.sports.length > 0) {
            webcamSpots = webcamSpots.filter(spot => {
                // Check if spot supports any of the requested sports
                const spotSports = spot.sports || [];
                return args.sports.some(sport => spotSports.includes(sport));
            });
        }

        return webcamSpots;
    },
});

/**
 * Query to get the configuration for a specific spot and sport.
 * 
 * @param {Id<"spots">} spotId - The spot ID
 * @param {string} sport - The sport name (e.g., "wingfoil", "surfing")
 * @returns {Object|null} Spot configuration object or null if not found
 */
export const getSpotConfig = query({
    args: { 
        spotId: v.id("spots"),
        sport: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("spotConfigs")
            .withIndex("by_spot_sport", (q) =>
                q.eq("spotId", args.spotId).eq("sport", args.sport)
            )
            .first();
    }
});

/**
 * Mutation to save forecast slots from a scrape.
 * 
 * Validates the scrape data, records the scrape execution, and stores forecast slots.
 * Keeps historical data by associating slots with scrapeTimestamp.
 * 
 * @param {Id<"spots">} spotId - The spot ID
 * @param {number} scrapeTimestamp - Timestamp when the scrape ran (epoch ms)
 * @param {Array} slots - Array of forecast slot objects
 * @returns {{scrapeId: Id<"scrapes">, isSuccessful: boolean}} Scrape record ID and success status
 */
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
        const slotIds = [];
        if (args.slots.length > 0) {
            for (const slot of args.slots) {
                const slotId = await ctx.db.insert("forecast_slots", {
                    spotId: args.spotId,
                    scrapeTimestamp: args.scrapeTimestamp,
                    ...slot
                });
                slotIds.push(slotId);
            }
        }

        // Archive old forecast slots (>7 days) to history table.
        // Process in small batches to avoid hitting Convex document read limits.
        const archiveCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const oldSlots = await ctx.db
            .query("forecast_slots")
            .withIndex("by_spot_and_scrape_timestamp", (q: any) =>
                q.eq("spotId", args.spotId).lt("scrapeTimestamp", archiveCutoff)
            )
            .take(200);

        if (oldSlots.length > 0) {
            const archivedAt = Date.now();
            for (const slot of oldSlots) {
                const { _id, _creationTime, ...fields } = slot;
                await ctx.db.insert("forecast_slots_archive", { ...fields, archivedAt });
                await ctx.db.delete(slot._id);
            }
        }

        // Trigger scoring actions (fire-and-forget, non-blocking)
        if (isSuccessful && slotIds.length > 0) {
            // Get the spot to know which sports it supports
            const spot = await ctx.db.get(args.spotId);
            const spotSports = spot?.sports || ["wingfoil"]; // Default to wingfoil if no sports defined

            // Schedule system scoring to run immediately (non-blocking)
            ctx.scheduler.runAfter(0, api.spots.scoreForecastSlots, {
                spotId: args.spotId,
                scrapeTimestamp: args.scrapeTimestamp,
                slotIds: slotIds as any[],
            });

            // Schedule personalized scoring to run after system scoring has time to finish
            // System scoring takes ~2s per slot, so delay proportionally
            const estimatedSystemScoringMs = slotIds.length * spotSports.length * 2500;
            const personalizedDelay = Math.max(estimatedSystemScoringMs, 30000); // At least 30s
            ctx.scheduler.runAfter(personalizedDelay, api.personalization.scorePersonalizedSlotsAfterScrape, {
                spotId: args.spotId,
                scrapeTimestamp: args.scrapeTimestamp,
                slotIds: slotIds as any[],
                spotSports,
            });
        }

        return { scrapeId, isSuccessful };
    }
});

/**
 * Mutation to save tide events from a scrape.
 * 
 * Stores all tide events separately from forecast slots since tides rarely occur at exact slot times.
 * 
 * @param {Id<"spots">} spotId - The spot ID
 * @param {number} scrapeTimestamp - Timestamp when the scrape ran (epoch ms)
 * @param {Array} tides - Array of tide event objects
 * @returns {number} Number of tide events saved
 */
export const saveTides = mutation({
    args: {
        spotId: v.id("spots"),
        scrapeTimestamp: v.number(),
        tides: v.array(v.object({
            time: v.number(), // Tide event timestamp (epoch ms)
            type: v.string(), // "high" | "low"
            height: v.number(), // Tide height in meters
        }))
    },
    returns: v.number(),
    handler: async (ctx, args) => {
        // Delete ALL old tides for this spot before saving new ones
        // This prevents accumulation of duplicate/outdated tide data
        // We only need current and future tides for display
        const now = Date.now();
        const allTides = await ctx.db
            .query("tides")
            .withIndex("by_spot_time", q => q.eq("spotId", args.spotId))
            .collect();
        
        // Delete all existing tides for this spot
        for (const tide of allTides) {
            await ctx.db.delete(tide._id);
        }

        // Insert new tides
        let savedCount = 0;
        if (args.tides.length > 0) {
            for (const tide of args.tides) {
                await ctx.db.insert("tides", {
                    spotId: args.spotId,
                    scrapeTimestamp: args.scrapeTimestamp,
                    time: tide.time,
                    type: tide.type,
                    height: tide.height,
                });
                savedCount++;
            }
        }

        return savedCount;
    }
});

/**
 * Query to get tide events for a spot.
 * 
 * Returns all tide events for a spot, optionally filtered by time range.
 * 
 * @param {Id<"spots">} spotId - The spot ID
 * @param {number} startTime - Optional start time filter (epoch ms)
 * @param {number} endTime - Optional end time filter (epoch ms)
 * @returns {Array} Array of tide event objects
 */
export const getTides = query({
    args: {
        spotId: v.id("spots"),
        startTime: v.optional(v.number()),
        endTime: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let tides;

        if (args.startTime !== undefined) {
            // Use the by_spot_time index to push the lower-bound filter to the
            // database, avoiding a full collect of all tides for this spot.
            const q = ctx.db
                .query("tides")
                .withIndex("by_spot_time", (q) =>
                    q.eq("spotId", args.spotId).gte("time", args.startTime!)
                );

            // Apply optional upper-bound as a post-index filter (tides per
            // window are few, so this is negligible).
            tides = args.endTime !== undefined
                ? await q.filter((q) => q.lte(q.field("time"), args.endTime!)).collect()
                : await q.collect();
        } else {
            // No time range — collect all tides for the spot and apply any
            // endTime filter in JS (rare call pattern).
            const allTides = await ctx.db
                .query("tides")
                .withIndex("by_spot", (q) => q.eq("spotId", args.spotId))
                .collect();

            tides = args.endTime !== undefined
                ? allTides.filter(t => t.time <= args.endTime!)
                : allTides;
        }

        // Results from by_spot_time are already ordered by time ascending.
        // The by_spot fallback path needs an explicit sort.
        if (args.startTime === undefined) {
            tides = tides.sort((a, b) => a.time - b.time);
        }

        return tides;
    }
});

/**
 * Query to get forecast slots for a spot.
 * 
 * Returns slots from the most recent successful scrape. If no successful scrapes exist,
 * returns slots from the most recent scrape timestamp found in the slots themselves.
 * 
 * @param {Id<"spots">} spotId - The spot ID
 * @returns {Array} Array of forecast slot objects from the most recent scrape
 */
export const getForecastSlots = query({
    args: { spotId: v.id("spots") },
    handler: async (ctx, args) => {
        // Delegate to the shared helper which uses the 48-hour indexed cutoff
        // to avoid full-table scans across all historical forecast_slots.
        return _getForecastSlotsForSpot(ctx, args.spotId);
    }
});

/**
 * Query to get the most recent successful scrape timestamp across all spots.
 * 
 * @returns {number|null} Most recent successful scrape timestamp (epoch ms) or null if none exist
 */
export const getMostRecentScrapeTimestamp = query({
    args: {},
    handler: async (ctx) => {
        // Use the by_success_timestamp index to find the most recent successful
        // scrape in a single indexed lookup instead of a full table scan.
        const mostRecent = await ctx.db
            .query("scrapes")
            .withIndex("by_success_timestamp", (q) => q.eq("isSuccessful", true))
            .order("desc")
            .first();

        return mostRecent?.scrapeTimestamp ?? null;
    }
});

/**
 * Mutation to update a spot's Windy.app spot ID.
 * 
 * @param {Id<"spots">} spotId - The spot ID
 * @param {string} windySpotId - The Windy.app spot ID (e.g., "8512151")
 */
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

/**
 * Mutation to update spot coordinates.
 * 
 * @param {Id<"spots">} spotId - The spot ID
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 */
export const updateSpotCoordinates = mutation({
    args: {
        spotId: v.id("spots"),
        latitude: v.number(),
        longitude: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.spotId, {
            latitude: args.latitude,
            longitude: args.longitude,
        });
    },
});

/**
 * Mutation to add a new spot with its configurations.
 * 
 * @param {string} name - Spot name
 * @param {string} url - Windy.app URL for the spot
 * @param {Array} configs - Array of spot configuration objects (one per sport)
 * @returns {Id<"spots">} The created spot ID
 */
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

/**
 * Mutation to add a webcam-only spot (not scraped/scored).
 * 
 * @param {string} name - Spot name
 * @param {string} url - Placeholder URL (webcam spots don't need Windy.app URLs)
 * @param {Array<string>} sports - Array of sports supported at this spot
 * @param {string} webcamStreamId - Stream ID or URL for the webcam
 * @param {string} webcamStreamSource - Stream source ("quanteec" or "iol")
 * @param {string} town - Town name
 * @param {string} region - Region name
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Id<"spots">} The created spot ID
 */
export const addWebcamSpot = mutation({
    args: {
        name: v.string(),
        url: v.string(),
        sports: v.array(v.string()),
        webcamStreamId: v.string(),
        webcamStreamSource: v.string(),
        town: v.string(),
        region: v.string(),
        latitude: v.number(),
        longitude: v.number(),
    },
    handler: async (ctx, args) => {
        const spotId = await ctx.db.insert("spots", {
            name: args.name,
            url: args.url,
            sports: args.sports,
            webcamStreamId: args.webcamStreamId,
            webcamStreamSource: args.webcamStreamSource,
            webcamOnly: true,
            town: args.town,
            region: args.region,
            latitude: args.latitude,
            longitude: args.longitude,
        });
        return spotId;
    }
});

/**
 * Mutation to remove all scrapes and forecast slots from today.
 * 
 * Useful for debugging or forcing a fresh scrape. Removes all scrapes and associated
 * forecast slots that were created today (UTC).
 * 
 * @returns {{deletedScrapesCount: number, deletedSlotsCount: number, message: string}}
 */
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

/**
 * Query to get time series context for scoring (72h before, 12h after).
 * 
 * @param {Id<"spots">} spotId - The spot ID
 * @param {number} timestamp - The timestamp to get context around (epoch ms)
 * @param {number} [scrapeTimestamp] - Optional scrape timestamp to prefer
 * @returns {Array} Array of forecast slots within the time window
 */
export const getTimeSeriesContext = query({
    args: {
        spotId: v.id("spots"),
        timestamp: v.number(),
        scrapeTimestamp: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const HOURS_24_MS = 24 * 60 * 60 * 1000;

        const startTime = args.timestamp - HOURS_24_MS;
        const endTime = args.timestamp + HOURS_24_MS;

        // Use timestamp-range index instead of loading all slots
        const contextSlots = await ctx.db
            .query("forecast_slots")
            .withIndex("by_spot_timestamp", q =>
                q.eq("spotId", args.spotId)
                 .gte("timestamp", startTime)
                 .lte("timestamp", endTime)
            )
            .collect();

        // If scrapeTimestamp provided, prefer slots from that scrape
        if (args.scrapeTimestamp) {
            const scrapeSlots = contextSlots.filter(s =>
                s.scrapeTimestamp === args.scrapeTimestamp
            );
            if (scrapeSlots.length > 0) {
                return scrapeSlots.sort((a, b) => a.timestamp - b.timestamp);
            }
        }

        // Otherwise, use most recent scrape's slots
        const latestScrapeTimestamp = Math.max(
            ...contextSlots
                .map(s => s.scrapeTimestamp || 0)
                .filter(ts => ts > 0)
        );

        if (latestScrapeTimestamp > 0) {
            const latestSlots = contextSlots.filter(s =>
                s.scrapeTimestamp === latestScrapeTimestamp
            );
            return latestSlots.sort((a, b) => a.timestamp - b.timestamp);
        }

        // Fallback: return all context slots sorted
        return contextSlots.sort((a, b) => a.timestamp - b.timestamp);
    }
});

/**
 * Query to get time series context for a range (used by batch scoring).
 * Returns slots between startTime and endTime for the given spot/scrape.
 */
export const getTimeSeriesContextRange = query({
    args: {
        spotId: v.id("spots"),
        startTime: v.number(),
        endTime: v.number(),
        scrapeTimestamp: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const contextSlots = await ctx.db
            .query("forecast_slots")
            .withIndex("by_spot_timestamp", q =>
                q.eq("spotId", args.spotId)
                 .gte("timestamp", args.startTime)
                 .lte("timestamp", args.endTime)
            )
            .collect();

        if (args.scrapeTimestamp) {
            const scrapeSlots = contextSlots.filter(s =>
                s.scrapeTimestamp === args.scrapeTimestamp
            );
            if (scrapeSlots.length > 0) {
                return scrapeSlots.sort((a, b) => a.timestamp - b.timestamp);
            }
        }

        const latestScrapeTimestamp = Math.max(
            ...contextSlots
                .map(s => s.scrapeTimestamp || 0)
                .filter(ts => ts > 0)
        );

        if (latestScrapeTimestamp > 0) {
            const latestSlots = contextSlots.filter(s =>
                s.scrapeTimestamp === latestScrapeTimestamp
            );
            return latestSlots.sort((a, b) => a.timestamp - b.timestamp);
        }

        return contextSlots.sort((a, b) => a.timestamp - b.timestamp);
    }
});

/**
 * Query to get system sport prompt (shared across all spots).
 *
 * @param {string} sport - The sport name
 * @returns {Object|null} System prompt object or null if not found
 */
export const getSystemSportPrompt = query({
    args: {
        sport: v.string(),
    },
    handler: async (ctx, args) => {
        const systemPrompt = await ctx.db
            .query("system_sport_prompts")
            .withIndex("by_sport", q => q.eq("sport", args.sport))
            .filter(q => q.eq(q.field("isActive"), true))
            .first();

        return systemPrompt;
    }
});

/**
 * Query to get scoring prompt for a spot-sport combination.
 * Returns spot-specific prompt (system prompt is fetched separately).
 * 
 * @param {Id<"spots">} spotId - The spot ID
 * @param {string} sport - The sport name
 * @param {string} [userId] - Optional user ID (null for system prompt)
 * @returns {Object|null} Prompt object or null if not found
 */
export const getScoringPrompt = query({
    args: {
        spotId: v.id("spots"),
        sport: v.string(),
        userId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // If userId provided, check for user-specific prompt first
        if (args.userId) {
            const userPrompt = await ctx.db
                .query("scoring_prompts")
                .withIndex("by_user_spot_sport", q => 
                    q.eq("userId", args.userId)
                     .eq("spotId", args.spotId)
                     .eq("sport", args.sport)
                )
                .filter(q => q.eq(q.field("isActive"), true))
                .first();
            
            if (userPrompt) {
                return userPrompt;
            }
        }

        // Fall back to system prompt (userId: null)
        const systemPrompt = await ctx.db
            .query("scoring_prompts")
            .withIndex("by_spot_sport", q => 
                q.eq("spotId", args.spotId)
                 .eq("sport", args.sport)
            )
            .filter(q => 
                q.and(
                    q.eq(q.field("userId"), null),
                    q.eq(q.field("isActive"), true)
                )
            )
            .first();

        return systemPrompt;
    }
});

/**
 * Mutation to save a condition score to the database.
 * 
 * @param {Id<"forecast_slots">} slotId - The slot ID
 * @param {Id<"spots">} spotId - The spot ID
 * @param {number} timestamp - The slot timestamp
 * @param {string} sport - The sport name
 * @param {string} [userId] - Optional user ID (null for system score)
 * @param {number} score - The score (0-100)
 * @param {string} reasoning - Brief explanation
 * @param {Object} [factors] - Optional factor breakdown
 * @param {string} [model] - LLM model used
 * @param {number} [scrapeTimestamp] - Scrape timestamp
 */
export const saveConditionScore = mutation({
    args: {
        slotId: v.id("forecast_slots"),
        spotId: v.id("spots"),
        timestamp: v.number(),
        sport: v.string(),
        userId: v.union(v.string(), v.null()),
        score: v.number(),
        reasoning: v.string(),
        factors: v.optional(v.object({
            windQuality: v.optional(v.number()),
            waveQuality: v.optional(v.number()),
            tideQuality: v.optional(v.number()),
            overallConditions: v.optional(v.number()),
        })),
        model: v.optional(v.string()),
        scrapeTimestamp: v.optional(v.number()),
        // Prompt tracking fields
        systemPromptId: v.optional(v.id("system_sport_prompts")),
        spotPromptId: v.optional(v.id("scoring_prompts")),
        systemPromptText: v.optional(v.string()),
        spotPromptText: v.optional(v.string()),
        temporalPromptText: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const scoredAt = Date.now();

        // For system scores (userId: null), check if one already exists and replace it
        if (!args.userId) {
            const existingScore = await ctx.db
                .query("condition_scores")
                .withIndex("by_slot_sport", q => 
                    q.eq("slotId", args.slotId)
                     .eq("sport", args.sport)
                )
                .filter(q => q.eq(q.field("userId"), null))
                .first();

            if (existingScore) {
                // Archive the old score to history BEFORE updating
                // Note: For old scores, we don't have the prompt info that was used originally,
                // so these fields will be undefined. New scores going forward will capture this.
                await ctx.db.insert("score_history", {
                    slotId: existingScore.slotId,
                    spotId: existingScore.spotId,
                    timestamp: existingScore.timestamp,
                    sport: existingScore.sport,
                    userId: existingScore.userId,
                    score: existingScore.score,
                    reasoning: existingScore.reasoning,
                    factors: existingScore.factors,
                    scoredAt: existingScore.scoredAt,
                    model: existingScore.model,
                    scrapeTimestamp: existingScore.scrapeTimestamp,
                    // Prompt info used for the NEW score (the one replacing this)
                    // For old scores archived, we don't know what prompts were originally used
                    systemPromptId: args.systemPromptId,
                    spotPromptId: args.spotPromptId,
                    systemPromptText: args.systemPromptText,
                    spotPromptText: args.spotPromptText,
                    temporalPromptText: args.temporalPromptText,
                    replacedAt: scoredAt,
                    replacedByScoreId: existingScore._id, // Will point to the same score after update
                });

                // Update existing system score
                await ctx.db.patch(existingScore._id, {
                    score: args.score,
                    reasoning: args.reasoning,
                    factors: args.factors,
                    scoredAt,
                    model: args.model,
                });

                return existingScore._id;
            }
        }

        // Insert new score (for user scores or new system scores)
        // Note: We don't store prompt IDs in condition_scores to keep it lean
        // Prompt information is captured in score_history when scores are replaced
        const scoreId = await ctx.db.insert("condition_scores", {
            slotId: args.slotId,
            spotId: args.spotId,
            timestamp: args.timestamp,
            sport: args.sport,
            userId: args.userId ?? null, // Explicitly set to null if undefined (for system scores)
            score: args.score,
            reasoning: args.reasoning,
            factors: args.factors,
            scoredAt,
            model: args.model,
            scrapeTimestamp: args.scrapeTimestamp,
        });

        return scoreId;
    }
});

/**
 * Action to score a single slot-sport combination using Groq LLM.
 * 
 * @param {Id<"forecast_slots">} slotId - The slot ID to score
 * @param {string} sport - The sport name
 * @param {Id<"spots">} spotId - The spot ID
 * @param {string} [userId] - Optional user ID (null for system score)
 * @returns {Object|null} Score object or null if scoring failed
 */
export const scoreSingleSlot = action({
    args: {
        slotId: v.id("forecast_slots"),
        sport: v.string(),
        spotId: v.id("spots"),
        userId: v.optional(v.string()),
        isContextual: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const groq = new Groq({
            apiKey: process.env.GROQ_API_KEY,
        });

        if (!groq.apiKey) {
            console.error("GROQ_API_KEY not set");
            return null;
        }

        // Get slot data
        const slot = await ctx.runQuery(api.spots.getSlotById, { slotId: args.slotId });
        if (!slot) {
            console.error(`Slot ${args.slotId} not found`);
            return null;
        }

        // Get spot data
        const spot = await ctx.runQuery(api.spots.getSpotById, { spotId: args.spotId });
        if (!spot) {
            console.error(`Spot ${args.spotId} not found`);
            return null;
        }

        // Get time series context (72h before, 12h after)
        const timeSeriesContext = await ctx.runQuery(api.spots.getTimeSeriesContext, {
            spotId: args.spotId,
            timestamp: slot.timestamp,
            scrapeTimestamp: slot.scrapeTimestamp,
        });

        // Get system sport prompt (shared across all spots)
        const systemPromptData = await ctx.runQuery(api.spots.getSystemSportPrompt, {
            sport: args.sport,
        });

        // Get spot-specific prompt
        const spotPromptData = await ctx.runQuery(api.spots.getScoringPrompt, {
            spotId: args.spotId,
            sport: args.sport,
            userId: args.userId,
        });

        // Use prompts from DB or fallback to defaults
        const systemPrompt = systemPromptData?.prompt || SYSTEM_SPORT_PROMPTS[args.sport as keyof typeof SYSTEM_SPORT_PROMPTS] || "";
        const spotPrompt = spotPromptData?.spotPrompt || `This is ${spot.name}. Evaluate conditions for ${args.sport}.`;
        const temporalPrompt = spotPromptData?.temporalPrompt || DEFAULT_TEMPORAL_PROMPT;

        // Validate prompts exist
        if (!systemPrompt || systemPrompt.trim().length === 0) {
            console.error(`No system prompt found for sport: ${args.sport}. Please seed prompts.`);
            return null;
        }

        // Get sun times for contextual slots
        let sunTimes: { sunrise: Date; sunset: Date } | undefined;
        if (args.isContextual && spot.latitude && spot.longitude) {
            const times = SunCalc.getTimes(new Date(slot.timestamp), spot.latitude, spot.longitude);
            sunTimes = {
                sunrise: times.sunrise,
                sunset: times.sunset,
            };
        }

        // Build full prompt
        const { system, user } = buildPrompt(
            systemPrompt,
            spotPrompt,
            temporalPrompt,
            slot,
            timeSeriesContext,
            spot.name,
            sunTimes,
            args.isContextual
        );

        // Retry configuration
        const retryDelays = [30000, 60000, 300000]; // 30s, 1 min, 5 min
        let lastError: any = null;
        
        // LLM parameters for provenance tracking
        const MODEL = "openai/gpt-oss-120b";
        const TEMPERATURE = 0.3;
        const MAX_TOKENS = 4000;


        for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
            try {
                // Track timing for provenance
                const startTime = Date.now();
                
                // Call Groq API with structured output
                const completion = await groq.chat.completions.create({
                    model: MODEL,
                    messages: [
                        { role: "system", content: system },
                        { role: "user", content: user },
                    ],
                    temperature: TEMPERATURE,
                    max_tokens: MAX_TOKENS,
                    response_format: {
                        type: "json_object",
                    },
                });

                const durationMs = Date.now() - startTime;

                const content = completion.choices[0]?.message?.content;
                if (!content) {
                    throw new Error("No content in response");
                }

                const response = JSON.parse(content);

                // Validate response
                if (typeof response.score !== "number" || response.score < 0 || response.score > 100) {
                    throw new Error(`Invalid score: ${response.score}`);
                }
                if (typeof response.reasoning !== "string" || response.reasoning.trim().length === 0) {
                    throw new Error("Missing or empty reasoning");
                }

                // Round score to integer
                const score = Math.round(response.score);

                // Get prompt IDs and text for history tracking
                const systemPromptId = systemPromptData?._id;
                const spotPromptId = spotPromptData?._id;
                
                const scoredAt = Date.now();

                // Save score to database with prompt tracking
                const scoreId: Id<"condition_scores"> = await ctx.runMutation(api.spots.saveConditionScore, {
                    slotId: args.slotId,
                    spotId: args.spotId,
                    timestamp: slot.timestamp,
                    sport: args.sport,
                    userId: args.userId || null, // Explicitly set to null for system scores
                    score,
                    reasoning: response.reasoning.trim(),
                    factors: response.factors || undefined,
                    model: MODEL,
                    scrapeTimestamp: slot.scrapeTimestamp,
                    systemPromptId,
                    spotPromptId,
                    systemPromptText: systemPrompt,
                    spotPromptText: spotPrompt,
                    temporalPromptText: temporalPrompt,
                });
                
                // Save scoring log for provenance tracking
                await ctx.runMutation(internal.admin.saveScoringLog, {
                    scoreId,
                    slotId: args.slotId,
                    spotId: args.spotId,
                    sport: args.sport,
                    userId: args.userId || null,
                    timestamp: slot.timestamp,
                    systemPrompt: system,
                    userPrompt: user,
                    model: MODEL,
                    temperature: TEMPERATURE,
                    maxTokens: MAX_TOKENS,
                    rawResponse: content, // Store the raw JSON string
                    scoredAt,
                    durationMs,
                    attempt: attempt + 1, // 1-based attempt number
                });

                return {
                    score,
                    reasoning: response.reasoning,
                    factors: response.factors,
                };
            } catch (error: any) {
                lastError = error;
                console.error(`Scoring attempt ${attempt + 1} failed:`, error.message);

                // Check if this is a rate limit error
                const isRateLimit = error.status === 429 || 
                    (error.message && error.message.includes("rate limit")) ||
                    (error.message && error.message.includes("Rate limit"));

                // If not the last attempt, wait before retrying
                if (attempt < retryDelays.length) {
                    let delay = retryDelays[attempt];
                    
                    // For rate limit errors, try to extract retry-after from error message
                    if (isRateLimit && error.message) {
                        const retryAfterMatch = error.message.match(/try again in ([\d.]+)s/i);
                        if (retryAfterMatch) {
                            const retryAfterSeconds = parseFloat(retryAfterMatch[1]);
                            // Use the retry-after time, but add a small buffer and cap at our max delay
                            delay = Math.min(Math.max(retryAfterSeconds * 1000 + 1000, delay), retryDelays[retryDelays.length - 1]);
                        }
                    }
                    
                    console.log(`Retrying in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // All retries failed
        console.error(`Failed to score slot ${args.slotId} for sport ${args.sport} after ${retryDelays.length + 1} attempts:`, lastError);
        return null;
    },
});

/**
 * Helper: Check if a slot overlaps with daylight hours.
 * A slot is daylight if any part of its 3-hour window has sunlight.
 * Only filters out slots entirely before sunrise or entirely after sunset.
 */
function isDaylightSlot(timestamp: number, spot: { latitude?: number; longitude?: number }, slotDurationHours: number = 3): boolean {
    if (!spot.latitude || !spot.longitude) {
        const hour = new Date(timestamp).getHours();
        return hour >= 6 && hour < 20;
    }

    const times = SunCalc.getTimes(new Date(timestamp), spot.latitude, spot.longitude);
    const slotStart = timestamp;
    const slotEnd = slotStart + (slotDurationHours * 60 * 60 * 1000);
    return slotEnd > times.sunrise.getTime() && slotStart < times.sunset.getTime();
}

/**
 * Helper: Check if a slot is a contextual slot (one before sunrise for surfing, one after sunset for windsports)
 */
function isContextualSlotForScoring(
    slotTimestamp: number,
    spot: { latitude?: number; longitude?: number },
    sport: string,
    allSlots: Array<{ timestamp: number }>
): boolean {
    if (!spot.latitude || !spot.longitude) {
        return false; // No contextual slots if no coordinates
    }
    
    const times = SunCalc.getTimes(new Date(slotTimestamp), spot.latitude, spot.longitude);
    const isSurfing = sport === "surfing";
    
    if (isSurfing) {
        // For surfing: show the closest slot before sunrise
        const slotsBeforeSunrise = allSlots.filter(s => s.timestamp < times.sunrise.getTime());
        if (slotsBeforeSunrise.length === 0) return false;
        
        const closestBeforeSunrise = slotsBeforeSunrise.reduce((closest, current) => {
            return current.timestamp > closest.timestamp ? current : closest;
        });
        
        return closestBeforeSunrise.timestamp === slotTimestamp;
    } else {
        // For windsports: show the closest slot after sunset
        const slotsAfterSunset = allSlots.filter(s => s.timestamp > times.sunset.getTime());
        if (slotsAfterSunset.length === 0) return false;
        
        const closestAfterSunset = slotsAfterSunset.reduce((closest, current) => {
            return current.timestamp < closest.timestamp ? current : closest;
        });
        
        return closestAfterSunset.timestamp === slotTimestamp;
    }
}

/**
 * Action to score all slots from a scrape.
 * Only scores daylight slots and contextual slots.
 * 
 * @param {Id<"spots">} spotId - The spot ID
 * @param {number} scrapeTimestamp - The scrape timestamp
 * @param {Array<Id<"forecast_slots">>} slotIds - Array of slot IDs to score
 * @returns {Object} Summary of scoring results
 */
export const scoreForecastSlots = action({
    args: {
        spotId: v.id("spots"),
        scrapeTimestamp: v.number(),
        slotIds: v.array(v.id("forecast_slots")),
    },
    handler: async (ctx, args) => {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        if (!groq.apiKey) {
            console.error("GROQ_API_KEY not set");
            return { successCount: 0, failureCount: 0, total: 0 };
        }

        // Get spot to determine which sports it supports and check coordinates
        const spot = await ctx.runQuery(api.spots.getSpotById, { spotId: args.spotId });
        if (!spot) {
            console.error(`Spot ${args.spotId} not found`);
            return { successCount: 0, failureCount: 0, total: 0 };
        }

        // Resolve all slot data upfront
        const allSlots = (await Promise.all(
            args.slotIds.map(slotId => ctx.runQuery(api.spots.getSlotById, { slotId }))
        )).filter(s => s !== null) as any[];

        const sports = spot.sports && spot.sports.length > 0 ? spot.sports : ["wingfoil"];
        const allSlotTimestamps = allSlots.map(s => ({ timestamp: s.timestamp }));

        // Build per-sport lists of slots to score, grouped by calendar day
        let successCount = 0;
        let failureCount = 0;

        for (const sport of sports) {
            // Determine which slots are daylight or contextual for this sport
            const scorableSlots: Array<{ slot: any; isContextual: boolean }> = [];
            for (const slot of allSlots) {
                const isDaylight = isDaylightSlot(slot.timestamp, spot);
                const isContextual = isContextualSlotForScoring(
                    slot.timestamp, spot, sport, allSlotTimestamps
                );
                if (isDaylight || isContextual) {
                    scorableSlots.push({ slot, isContextual });
                }
            }

            if (scorableSlots.length === 0) continue;

            // Group by calendar day (UTC)
            const dayGroups = new Map<string, Array<{ slot: any; isContextual: boolean }>>();
            for (const entry of scorableSlots) {
                const dayKey = new Date(entry.slot.timestamp).toISOString().substring(0, 10);
                if (!dayGroups.has(dayKey)) dayGroups.set(dayKey, []);
                dayGroups.get(dayKey)!.push(entry);
            }

            // Fetch prompts once per sport (shared across all days)
            const systemPromptData = await ctx.runQuery(api.spots.getSystemSportPrompt, { sport });
            const spotPromptData = await ctx.runQuery(api.spots.getScoringPrompt, {
                spotId: args.spotId, sport,
            });
            const systemPrompt = systemPromptData?.prompt || SYSTEM_SPORT_PROMPTS[sport as keyof typeof SYSTEM_SPORT_PROMPTS] || "";
            const spotPrompt = spotPromptData?.spotPrompt || `This is ${spot.name}. Evaluate conditions for ${sport}.`;
            const temporalPrompt = spotPromptData?.temporalPrompt || DEFAULT_TEMPORAL_PROMPT;

            if (!systemPrompt || systemPrompt.trim().length === 0) {
                console.error(`No system prompt found for sport: ${sport}. Please seed prompts.`);
                continue;
            }

            // Score each day as a batch
            for (const [dayKey, dayEntries] of dayGroups) {
                // Sort by timestamp
                dayEntries.sort((a, b) => a.slot.timestamp - b.slot.timestamp);
                const daySlots = dayEntries.map(e => e.slot);
                const contextualTimestamps = new Set(
                    dayEntries.filter(e => e.isContextual).map(e => e.slot.timestamp)
                );

                // Get time series context: 24h before first slot through 24h after last slot
                const firstTs = daySlots[0].timestamp;
                const lastTs = daySlots[daySlots.length - 1].timestamp;
                const HOURS_24_MS = 24 * 60 * 60 * 1000;

                const timeSeriesContext = await ctx.runQuery(api.spots.getTimeSeriesContextRange, {
                    spotId: args.spotId,
                    startTime: firstTs - HOURS_24_MS,
                    endTime: lastTs + HOURS_24_MS,
                    scrapeTimestamp: args.scrapeTimestamp,
                });
                // Filter to only before/after the day's slots (context, not the scored slots themselves)
                const contextSlots = timeSeriesContext.filter(
                    (s: any) => s.timestamp < firstTs || s.timestamp > lastTs
                );

                // Get sun times for the day
                let sunTimes: { sunrise: Date; sunset: Date } | undefined;
                if (spot.latitude && spot.longitude) {
                    const midDate = new Date(Math.round((firstTs + lastTs) / 2));
                    const times = SunCalc.getTimes(midDate, spot.latitude, spot.longitude);
                    sunTimes = { sunrise: times.sunrise, sunset: times.sunset };
                }

                // Build batch prompt
                const { system, user } = buildBatchPrompt(
                    systemPrompt, spotPrompt, temporalPrompt,
                    daySlots, contextSlots, spot.name,
                    contextualTimestamps, sunTimes,
                );

                // LLM parameters
                const MODEL = "openai/gpt-oss-120b";
                const TEMPERATURE = 0.3;
                // Scale max tokens with batch size: ~250 tokens per slot for response (longer reasoning)
                const MAX_TOKENS = Math.min(daySlots.length * 600 + 500, 16000);

                // Call Groq API with retry logic
                const retryDelays = [30000, 60000, 300000];
                let lastError: any = null;
                let batchSuccess = false;

                for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
                    try {
                        const startTime = Date.now();

                        const completion = await groq.chat.completions.create({
                            model: MODEL,
                            messages: [
                                { role: "system", content: system },
                                { role: "user", content: user },
                            ],
                            temperature: TEMPERATURE,
                            max_tokens: MAX_TOKENS,
                            response_format: { type: "json_object" },
                        });

                        const durationMs = Date.now() - startTime;
                        const content = completion.choices[0]?.message?.content;
                        if (!content) throw new Error("No content in response");

                        const response = JSON.parse(content);
                        const scores = response.scores;

                        if (!Array.isArray(scores) || scores.length !== daySlots.length) {
                            throw new Error(
                                `Expected ${daySlots.length} scores, got ${Array.isArray(scores) ? scores.length : 'non-array'}`
                            );
                        }

                        // Validate and save each score
                        const scoredAt = Date.now();
                        for (let i = 0; i < daySlots.length; i++) {
                            const slot = daySlots[i];
                            const scoreData = scores[i];

                            if (typeof scoreData.score !== "number" || scoreData.score < 0 || scoreData.score > 100) {
                                console.error(`Invalid score for slot ${i}: ${scoreData.score}`);
                                failureCount++;
                                continue;
                            }
                            if (typeof scoreData.reasoning !== "string" || scoreData.reasoning.trim().length === 0) {
                                console.error(`Missing reasoning for slot ${i}`);
                                failureCount++;
                                continue;
                            }

                            const score = Math.round(scoreData.score);
                            const systemPromptId = systemPromptData?._id;
                            const spotPromptId = spotPromptData?._id;

                            const scoreId: Id<"condition_scores"> = await ctx.runMutation(api.spots.saveConditionScore, {
                                slotId: slot._id,
                                spotId: args.spotId,
                                timestamp: slot.timestamp,
                                sport,
                                userId: null,
                                score,
                                reasoning: scoreData.reasoning.trim().substring(0, 500),
                                factors: scoreData.factors || undefined,
                                model: MODEL,
                                scrapeTimestamp: slot.scrapeTimestamp,
                                systemPromptId,
                                spotPromptId,
                                systemPromptText: systemPrompt,
                                spotPromptText: spotPrompt,
                                temporalPromptText: temporalPrompt,
                            });

                            // Save scoring log (one per batch, referencing first score)
                            await ctx.runMutation(internal.admin.saveScoringLog, {
                                scoreId,
                                slotId: slot._id,
                                spotId: args.spotId,
                                sport,
                                userId: null,
                                timestamp: slot.timestamp,
                                systemPrompt: system,
                                userPrompt: user,
                                model: MODEL,
                                temperature: TEMPERATURE,
                                maxTokens: MAX_TOKENS,
                                rawResponse: content,
                                scoredAt,
                                durationMs,
                                attempt: attempt + 1,
                            });

                            successCount++;
                        }

                        batchSuccess = true;
                        break; // Success, exit retry loop
                    } catch (error: any) {
                        lastError = error;
                        console.error(`Batch scoring attempt ${attempt + 1} failed for ${dayKey}/${sport}:`, error.message);

                        if (attempt < retryDelays.length) {
                            let delay = retryDelays[attempt];
                            const isRateLimit = error.status === 429 ||
                                (error.message && error.message.includes("rate limit"));
                            if (isRateLimit && error.message) {
                                const retryAfterMatch = error.message.match(/try again in ([\d.]+)s/i);
                                if (retryAfterMatch) {
                                    const retryAfterSeconds = parseFloat(retryAfterMatch[1]);
                                    delay = Math.min(Math.max(retryAfterSeconds * 1000 + 1000, delay), retryDelays[retryDelays.length - 1]);
                                }
                            }
                            console.log(`Retrying batch in ${delay / 1000}s...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                    }
                }

                if (!batchSuccess) {
                    console.error(`All retries failed for batch ${dayKey}/${sport}:`, lastError);
                    failureCount += dayEntries.length;
                }

                // Small delay between day batches
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        const total = successCount + failureCount;
        console.log(`Batch scoring complete: ${successCount}/${total} successful, ${failureCount}/${total} failed (${args.slotIds.length} slots x ${sports.length} sports)`);

        return {
            successCount,
            failureCount,
            total,
        };
    },
});

// Helper queries for actions
export const getSlotById = query({
    args: { slotId: v.id("forecast_slots") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.slotId);
    },
});

export const getSpotById = query({
    args: { spotId: v.id("spots") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.spotId);
    },
});

/**
 * Query to get condition scores for a spot.
 * 
 * @param {Id<"spots">} spotId - The spot ID
 * @param {string} [sport] - Optional sport to filter by
 * @param {string} [userId] - Optional user ID (null for system scores)
 * @returns {Array} Array of condition score objects
 */
export const getConditionScores = query({
    args: {
        spotId: v.id("spots"),
        sport: v.optional(v.string()),
        userId: v.optional(v.string()),
        cutoffTimestamp: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Default to 7-day cutoff to prevent unbounded query growth.
        // Callers can pass a custom cutoffTimestamp (or 0 to disable).
        const cutoff = args.cutoffTimestamp ?? (Date.now() - 7 * 24 * 60 * 60 * 1000);

        let filtered;
        if (args.sport) {
            // Full index pushdown: spotId + sport + timestamp range
            filtered = await ctx.db
                .query("condition_scores")
                .withIndex("by_spot_sport_timestamp", (q) =>
                    q.eq("spotId", args.spotId).eq("sport", args.sport!).gte("timestamp", cutoff)
                )
                .collect();
        } else {
            // No sport filter — use spotId prefix only and apply cutoff as post-index filter
            const scores = await ctx.db
                .query("condition_scores")
                .withIndex("by_spot_sport_timestamp", (q) =>
                    q.eq("spotId", args.spotId)
                )
                .collect();
            filtered = scores.filter((s) => s.timestamp >= cutoff);
        }

        // When userId is provided, return personalized scores with system fallback
        if (args.userId !== undefined) {
            // Get personalized scores for this user
            const personalizedScores = filtered.filter(s => s.userId === args.userId);
            // Get system scores (userId: null)
            const systemScores = filtered.filter(s => s.userId === null);
            
            // Create a map of timestamp -> score, preferring personalized
            // Using timestamp as key because slot IDs change with each scrape
            // but we want to match scores to slots by their time
            const scoresByTimestamp = new Map<number, typeof filtered[0]>();
            
            // First add system scores (take the most recent one per timestamp)
            for (const score of systemScores) {
                const existing = scoresByTimestamp.get(score.timestamp);
                // Keep the score with the latest _creationTime (most recent scrape)
                if (!existing || (score._creationTime > existing._creationTime)) {
                    scoresByTimestamp.set(score.timestamp, score);
                }
            }
            
            // Then override with personalized scores (they always take priority)
            for (const score of personalizedScores) {
                scoresByTimestamp.set(score.timestamp, score);
            }
            
            // Convert back to array and sort
            return Array.from(scoresByTimestamp.values()).sort((a, b) => a.timestamp - b.timestamp);
        } else {
            // Default to system scores (userId: null), deduplicated by timestamp
            const systemScores = filtered.filter(s => s.userId === null);
            const scoresByTimestamp = new Map<number, typeof filtered[0]>();
            for (const score of systemScores) {
                const existing = scoresByTimestamp.get(score.timestamp);
                if (!existing || (score._creationTime > existing._creationTime)) {
                    scoresByTimestamp.set(score.timestamp, score);
                }
            }
            return Array.from(scoresByTimestamp.values()).sort((a, b) => a.timestamp - b.timestamp);
        }
    },
});

/**
 * Query to get a condition score for a specific slot-sport combination.
 * 
 * @param {Id<"forecast_slots">} slotId - The slot ID
 * @param {string} sport - The sport name
 * @param {string} [userId] - Optional user ID (null for system scores)
 * @returns {Object|null} Condition score object or null if not found
 */
export const getConditionScoreBySlot = query({
    args: {
        slotId: v.id("forecast_slots"),
        sport: v.string(),
        userId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const score = await ctx.db
            .query("condition_scores")
            .withIndex("by_slot_sport", q => 
                q.eq("slotId", args.slotId)
                 .eq("sport", args.sport)
            )
            .filter(q => {
                if (args.userId !== undefined) {
                    return q.eq(q.field("userId"), args.userId);
                } else {
                    // Default to system scores (userId: null)
                    return q.eq(q.field("userId"), null);
                }
            })
            .first();

        return score;
    },
});

/**
 * Query to list all scoring prompts (for management/debugging).
 * 
 * @param {Id<"spots">} [spotId] - Optional spot ID to filter by
 * @param {string} [sport] - Optional sport to filter by
 * @returns {Array} Array of scoring prompt objects
 */
export const listScoringPrompts = query({
    args: {
        spotId: v.optional(v.id("spots")),
        sport: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let query = ctx.db.query("scoring_prompts");

        if (args.spotId && args.sport) {
            query = query.withIndex("by_spot_sport", q => 
                q.eq("spotId", args.spotId)
                 .eq("sport", args.sport)
            );
        } else if (args.spotId) {
            const allPrompts = await ctx.db.query("scoring_prompts").collect();
            return allPrompts.filter(p => p.spotId === args.spotId);
        } else {
            query = query;
        }

        const prompts = await query.collect();

        if (args.sport && !args.spotId) {
            return prompts.filter(p => p.sport === args.sport);
        }

        return prompts;
    },
});

/**
 * Mutation to update a scoring prompt.
 * 
 * @param {Id<"scoring_prompts">} promptId - The prompt ID to update
 * @param {string} [systemPrompt] - Optional new system prompt
 * @param {string} [spotPrompt] - Optional new spot prompt
 * @param {string} [temporalPrompt] - Optional new temporal prompt
 * @param {boolean} [isActive] - Optional active status
 * @returns {Object} Success status
 */
/**
 * Mutation to update a system sport prompt.
 * 
 * @param {Id<"system_sport_prompts">} promptId - The prompt ID to update
 * @param {string} [prompt] - Optional new prompt text
 * @param {boolean} [isActive] - Optional active status
 * @returns {Object} Success status
 */
export const updateSystemSportPrompt = mutation({
    args: {
        promptId: v.id("system_sport_prompts"),
        prompt: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const updates: any = {
            updatedAt: Date.now(),
        };
        
        if (args.prompt !== undefined) {
            updates.prompt = args.prompt;
        }
        if (args.isActive !== undefined) {
            updates.isActive = args.isActive;
        }
        
        await ctx.db.patch(args.promptId, updates);
        return { success: true, promptId: args.promptId };
    },
});

/**
 * Mutation to update a scoring prompt (spot-specific).
 * 
 * @param {Id<"scoring_prompts">} promptId - The prompt ID to update
 * @param {string} [spotPrompt] - Optional new spot prompt
 * @param {string} [temporalPrompt] - Optional new temporal prompt
 * @param {boolean} [isActive] - Optional active status
 * @returns {Object} Success status
 */
export const updateScoringPrompt = mutation({
    args: {
        promptId: v.id("scoring_prompts"),
        spotPrompt: v.optional(v.string()),
        temporalPrompt: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const updates: any = {
            updatedAt: Date.now(),
        };
        
        if (args.spotPrompt !== undefined) {
            updates.spotPrompt = args.spotPrompt;
        }
        if (args.temporalPrompt !== undefined) {
            updates.temporalPrompt = args.temporalPrompt;
        }
        if (args.isActive !== undefined) {
            updates.isActive = args.isActive;
        }
        
        await ctx.db.patch(args.promptId, updates);
        return { success: true, promptId: args.promptId };
    },
});

/**
 * Migration: Remove systemPrompt field from existing scoring_prompts records.
 * This field has been moved to the separate system_sport_prompts table.
 */
/**
 * @deprecated One-time migration - already completed.
 * This mutation was used to migrate scoring_prompts by removing the systemPrompt field.
 * Kept for reference only - do not use.
 */
export const removeSystemPromptField = mutation({
    args: {},
    handler: async (ctx) => {
        // Get all scoring_prompts that might have the old systemPrompt field
        const allPrompts = await ctx.db.query("scoring_prompts").collect();
        
        let updated = 0;
        for (const prompt of allPrompts) {
            // Check if it has the old systemPrompt field
            const promptAny = prompt as any;
            if (promptAny.systemPrompt !== undefined) {
                // Delete and recreate without the systemPrompt field
                const newPrompt = {
                    spotId: prompt.spotId,
                    sport: prompt.sport,
                    userId: prompt.userId,
                    spotPrompt: prompt.spotPrompt,
                    temporalPrompt: prompt.temporalPrompt,
                    isActive: prompt.isActive,
                    createdAt: prompt.createdAt,
                    updatedAt: Date.now(),
                };
                
                await ctx.db.delete(prompt._id);
                await ctx.db.insert("scoring_prompts", newPrompt);
                updated++;
            }
        }

        return {
            message: `Migrated ${updated} prompts (removed systemPrompt field)`,
            updated,
        };
    },
});

/**
 * @deprecated One-time migration - already completed.
 * Migration: Remove tide fields from forecast_slots table.
 * 
 * This migration removes tideHeight, tideType, and tideTime fields from all
 * forecast_slots documents since tides are now stored in a separate table.
 * 
 * Uses replace() to recreate documents without the tide fields, preserving
 * all other data and the document ID (important for references like condition_scores).
 * 
 * Processes by spot to avoid read limits.
 * 
 * @param {string} [spotId] - Optional spotId to process (for batching)
 * @param {number} [processed] - Number of documents already processed
 * @returns {Object} Migration result with count of updated documents
 */
export const removeTideFieldsFromSlots = mutation({
    args: {
        spotId: v.optional(v.id("spots")),
        processed: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let updated = args.processed || 0;
        
        if (args.spotId) {
            // Process slots for a specific spot
            const slots = await ctx.db
                .query("forecast_slots")
                .withIndex("by_spot", q => q.eq("spotId", args.spotId))
                .collect();
            
            for (const slot of slots) {
                const hasTideFields = 
                    slot.tideHeight !== undefined || 
                    slot.tideType !== undefined || 
                    slot.tideTime !== undefined;
                
                if (hasTideFields) {
                    const { tideHeight, tideType, tideTime, ...slotWithoutTides } = slot;
                    await ctx.db.replace(slot._id, slotWithoutTides as any);
                    updated++;
                }
            }
            
            return {
                message: `Processed spot ${args.spotId} (${updated} total updated)`,
                updated,
            };
        } else {
            // Get all spots and process them one by one
            const spots = await ctx.db.query("spots").collect();
            
            if (spots.length === 0) {
                return {
                    message: `Migrated ${updated} slots (removed tide fields)`,
                    updated,
                };
            }
            
            // Process first spot
            const firstSpot = spots[0];
            const slots = await ctx.db
                .query("forecast_slots")
                .withIndex("by_spot", q => q.eq("spotId", firstSpot._id))
                .collect();
            
            for (const slot of slots) {
                const hasTideFields = 
                    slot.tideHeight !== undefined || 
                    slot.tideType !== undefined || 
                    slot.tideTime !== undefined;
                
                if (hasTideFields) {
                    const { tideHeight, tideType, tideTime, ...slotWithoutTides } = slot;
                    await ctx.db.replace(slot._id, slotWithoutTides as any);
                    updated++;
                }
            }
            
            // Schedule next spot if there are more
            if (spots.length > 1) {
                await ctx.scheduler.runAfter(0, api.spots.removeTideFieldsFromSlots, {
                    spotId: spots[1]._id,
                    processed: updated,
                });
                return {
                    message: `Processing spots... (${updated} updated so far)`,
                    updated,
                    continuing: true,
                };
            }
            
            return {
                message: `Migrated ${updated} slots (removed tide fields)`,
                updated,
            };
        }
    },
});

/**
 * One-off mutation to add coordinates to the 4 forecast spots missing them.
 * 
 * Coordinates from PRD 06:
 * - Marina de Cascais: 38.6919, -9.4203
 * - Lagoa da Albufeira: 38.5058, -9.1728
 * - Carcavelos: 38.6775, -9.3383
 * - Praia do Guincho: 38.7333, -9.4733
 */
export const addSpotCoordinates = mutation({
    args: {},
    handler: async (ctx) => {
        const spots = await ctx.db.query("spots").collect();
        
        const updates = [
            { name: "Marina de Cascais", latitude: 38.6919, longitude: -9.4203 },
            { name: "Lagoa da Albufeira", latitude: 38.5058, longitude: -9.1728 },
            { name: "Carcavelos", latitude: 38.6775, longitude: -9.3383 },
            { name: "Praia do Guincho", latitude: 38.7333, longitude: -9.4733 },
        ];

        let updated = 0;
        for (const update of updates) {
            const spot = spots.find(s => s.name === update.name);
            if (spot) {
                await ctx.db.patch(spot._id, {
                    latitude: update.latitude,
                    longitude: update.longitude,
                });
                updated++;
                console.log(`Updated ${update.name} with coordinates: ${update.latitude}, ${update.longitude}`);
            } else {
                console.log(`Spot ${update.name} not found`);
            }
        }

        return `Updated ${updated} spots with coordinates`;
    },
});

// ─── Internal helpers for batched queries ───────────────────────────────────

/**
 * Get forecast slots for a single spot (extracted from getForecastSlots handler).
 * Optimized: only reads slots from scrapes in the last 48 hours.
 */
async function _getForecastSlotsForSpot(ctx: any, spotId: Id<"spots">) {
    // Read scrape data from last 7 days to limit document reads while ensuring
    // data remains visible even when scraper is down for a few days.
    const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const allSlots = await ctx.db
        .query("forecast_slots")
        .withIndex("by_spot_and_scrape_timestamp", (q: any) =>
            q.eq("spotId", spotId).gte("scrapeTimestamp", recentCutoff)
        )
        .collect();

    if (allSlots.length === 0) return [];

    const slotScrapeTimestamps = [...new Set(
        allSlots.map((s: any) => s.scrapeTimestamp).filter((ts: any) => ts !== undefined && ts !== null)
    )] as number[];

    if (slotScrapeTimestamps.length === 0) return allSlots;

    // Find the target scrape timestamp efficiently using point lookups
    // instead of collecting ALL scrapes for this spot.
    // Check scrape timestamps from slots in descending order until we find a successful one.
    const sortedScrapeTimestamps = [...slotScrapeTimestamps].sort((a, b) => b - a);
    let targetScrapeTimestamp: number | null = null;

    for (const ts of sortedScrapeTimestamps) {
        const scrape = await ctx.db
            .query("scrapes")
            .withIndex("by_spot_and_timestamp", (q: any) =>
                q.eq("spotId", spotId).eq("scrapeTimestamp", ts)
            )
            .first();
        if (scrape && scrape.isSuccessful) {
            targetScrapeTimestamp = ts;
            break;
        }
    }

    // Fall back to max slot timestamp if no successful scrape found
    if (targetScrapeTimestamp === null) {
        targetScrapeTimestamp = sortedScrapeTimestamps[0] ?? null;
    }

    if (targetScrapeTimestamp === null) return [];

    const latestSlots = allSlots.filter((s: any) => s.scrapeTimestamp === targetScrapeTimestamp);

    // Preserve today's past slots
    const now = Date.now();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const latestTimestamps = new Set(latestSlots.map((s: any) => s.timestamp));
    const candidatePastSlots = allSlots.filter((s: any) => {
        if (s.timestamp < todayStart.getTime() || s.timestamp >= todayEnd.getTime()) return false;
        if (latestTimestamps.has(s.timestamp)) return false;
        if (s.scrapeTimestamp === targetScrapeTimestamp) return false;
        return true;
    });

    const slotsByTimestamp = new Map();
    for (const slot of candidatePastSlots) {
        const existing = slotsByTimestamp.get(slot.timestamp);
        if (!existing || (slot.scrapeTimestamp && slot.scrapeTimestamp > (existing.scrapeTimestamp || 0))) {
            slotsByTimestamp.set(slot.timestamp, slot);
        }
    }

    return [...latestSlots, ...Array.from(slotsByTimestamp.values())];
}

/**
 * Get condition scores for a single spot and sport.
 * Optimized to limit document reads by filtering on timestamp range.
 * Reads scores within a configurable window (default 7 days, 2 days for dashboard/cams).
 */
async function _getConditionScoresForSpot(
    ctx: any,
    spotId: Id<"spots">,
    sport: string,
    userId?: string,
    cutoffDays: number = 7
) {
    const cutoff = Date.now() - cutoffDays * 24 * 60 * 60 * 1000;

    // Use compound index for full pushdown: spotId + sport + timestamp range
    const filtered = await ctx.db
        .query("condition_scores")
        .withIndex("by_spot_sport_timestamp", (q: any) =>
            q.eq("spotId", spotId).eq("sport", sport).gte("timestamp", cutoff)
        )
        .collect();

    if (userId !== undefined) {
        const personalizedScores = filtered.filter((s: any) => s.userId === userId);
        const systemScores = filtered.filter((s: any) => s.userId === null);

        const scoresByTimestamp = new Map<number, any>();
        for (const score of systemScores) {
            const existing = scoresByTimestamp.get(score.timestamp);
            if (!existing || (score._creationTime > existing._creationTime)) {
                scoresByTimestamp.set(score.timestamp, score);
            }
        }
        for (const score of personalizedScores) {
            scoresByTimestamp.set(score.timestamp, score);
        }

        return Array.from(scoresByTimestamp.values()).sort((a: any, b: any) => a.timestamp - b.timestamp);
    } else {
        const systemScores = filtered.filter((s: any) => s.userId === null);
        const scoresByTimestamp = new Map<number, any>();
        for (const score of systemScores) {
            const existing = scoresByTimestamp.get(score.timestamp);
            if (!existing || (score._creationTime > existing._creationTime)) {
                scoresByTimestamp.set(score.timestamp, score);
            }
        }
        return Array.from(scoresByTimestamp.values()).sort((a: any, b: any) => a.timestamp - b.timestamp);
    }
}

// ─── Batched queries ────────────────────────────────────────────────────────

/**
 * Shared helper: fetch slots, configs, and scores for a single spot.
 * Used by getDashboardData and getCamsData to avoid duplication.
 */
async function _buildSpotData(
    ctx: any,
    spot: any,
    sports: string[],
    userId?: string
) {
    const spotSports = spot.sports && spot.sports.length > 0 ? spot.sports : ["wingfoil"];
    const relevantSports = spotSports.filter((s: string) => sports.includes(s));

    const [slots, configValues, scoreArrays] = await Promise.all([
        _getForecastSlotsForSpot(ctx, spot._id),
        asyncMap(relevantSports, (sport: string) =>
            ctx.db
                .query("spotConfigs")
                .withIndex("by_spot_sport", (q: any) =>
                    q.eq("spotId", spot._id).eq("sport", sport)
                )
                .first()
        ),
        asyncMap(relevantSports, (sport: string) =>
            _getConditionScoresForSpot(ctx, spot._id, sport, userId, 2)
        ),
    ]);

    const configs: Record<string, any> = {};
    const scoresMap: Record<string, any> = {};
    for (let i = 0; i < relevantSports.length; i++) {
        const sport = relevantSports[i];
        configs[sport] = configValues[i];
        for (const score of scoreArrays[i]) {
            scoresMap[`${score.timestamp}_${sport}`] = score;
        }
    }

    return { slots, configs, scoresMap };
}

/**
 * Batched query for the Dashboard page.
 * Accepts either explicit spotIds or a userId (server resolves favorites).
 * Falls back to the top 10 non-webcam-only spots when neither is provided.
 *
 * @returns { spots, data: Record<spotId, { slots, configs, scoresMap }>, scrapeTimestamp }
 */
export const getDashboardData = query({
    args: {
        spotIds: v.optional(v.array(v.id("spots"))),
        sports: v.array(v.string()),
        userId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Resolve which spots to fetch
        let targetSpots: any[];

        if (args.spotIds && args.spotIds.length > 0) {
            // Explicit spotIds from client (anonymous users with saved favorites)
            const results = await asyncMap(args.spotIds, (id: any) => ctx.db.get(id));
            targetSpots = results.filter(Boolean);
        } else if (args.userId) {
            // Logged-in user — look up their favorite spots server-side
            const user = await ctx.db.get(args.userId as any);
            const favs: any[] = (user as any)?.favoriteSpots ?? [];
            if (favs.length > 0) {
                const results = await asyncMap(favs, (id: any) => ctx.db.get(id));
                targetSpots = results.filter(Boolean);
            } else {
                // User has no favorites yet — show top 10
                const all = await ctx.db.query("spots").collect();
                targetSpots = all.filter((s: any) => !s.webcamOnly).slice(0, 10);
            }
        } else {
            // Anonymous with no saved preferences — show top 10
            const all = await ctx.db.query("spots").collect();
            targetSpots = all.filter((s: any) => !s.webcamOnly).slice(0, 10);
        }

        const [entries, mostRecentScrape] = await Promise.all([
            asyncMap(targetSpots, async (spot: any) => {
                const spotData = await _buildSpotData(ctx, spot, args.sports, args.userId);
                return [spot._id, spotData] as const;
            }),
            ctx.db
                .query("scrapes")
                .withIndex("by_success_timestamp", (q: any) => q.eq("isSuccessful", true))
                .order("desc")
                .first(),
        ]);

        return {
            spots: targetSpots,
            data: Object.fromEntries(entries),
            scrapeTimestamp: mostRecentScrape?.scrapeTimestamp ?? null,
        };
    },
});

/**
 * Batched query for the Cams page.
 * Filters to webcam-eligible spots server-side and returns spot data in one call,
 * eliminating the listWebcams → getDashboardData two-round-trip pattern.
 *
 * @returns { spots, data: Record<spotId, { slots, configs, scoresMap }> }
 */
export const getCamsData = query({
    args: {
        sports: v.optional(v.array(v.string())),
        userId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const allSpots = await ctx.db.query("spots").collect();

        // Webcam-eligible: has webcamStreamId (new format) or non-empty webcamUrl (old format)
        let webcamSpots = allSpots.filter((spot: any) => {
            if (spot.webcamStreamId !== undefined) return true;
            if (spot.webcamUrl !== undefined && spot.webcamUrl.trim() !== "") return true;
            return false;
        });

        // Filter by sports if provided
        if (args.sports && args.sports.length > 0) {
            webcamSpots = webcamSpots.filter((spot: any) => {
                const spotSports = spot.sports || [];
                return args.sports!.some((s: string) => spotSports.includes(s));
            });
        }

        const sports = args.sports && args.sports.length > 0 ? args.sports : ["wingfoil"];

        const entries = await asyncMap(webcamSpots, async (spot: any) => {
            const spotData = await _buildSpotData(ctx, spot, sports, args.userId);
            return [spot._id, spotData] as const;
        });

        return {
            spots: webcamSpots,
            data: Object.fromEntries(entries),
        };
    },
});

/**
 * Batched query for the Report page.
 * Fetches spots, slots, configs, scores, and tides for all spots matching given sports.
 *
 * @returns { spots, data: Record<spotId, { slots, configs, scoresMap, tides }> }
 */
export const getReportData = query({
    args: {
        sports: v.array(v.string()),
        userId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Get spots filtered by sports
        const allSpots = await ctx.db.query("spots").collect();
        const filteredSpots = allSpots.filter((spot: any) => {
            if (spot.webcamOnly) return false;
            const spotSports = spot.sports || [];
            return args.sports.some((sport: string) => spotSports.includes(sport));
        });

        // Fetch per-spot data and most recent scrape timestamp in parallel
        const [spotEntries, mostRecentScrape] = await Promise.all([
            asyncMap(filteredSpots, async (spot: any) => {
                const spotSports = spot.sports && spot.sports.length > 0 ? spot.sports : ["wingfoil"];
                const relevantSports = spotSports.filter((s: string) => args.sports.includes(s));

                // Slots and tides in parallel
                const [slots, tides] = await Promise.all([
                    _getForecastSlotsForSpot(ctx, spot._id),
                    ctx.db
                        .query("tides")
                        .withIndex("by_spot_time", (q: any) =>
                            q.eq("spotId", spot._id)
                                .gte("time", Date.now() - 24 * 60 * 60 * 1000)
                                .lte("time", Date.now() + 10 * 24 * 60 * 60 * 1000)
                        )
                        .collect(),
                ]);

                // Configs and scores for all relevant sports in parallel
                const [configValues, scoreArrays] = await Promise.all([
                    asyncMap(relevantSports, (sport: string) =>
                        ctx.db
                            .query("spotConfigs")
                            .withIndex("by_spot_sport", (q: any) =>
                                q.eq("spotId", spot._id).eq("sport", sport)
                            )
                            .first()
                    ),
                    asyncMap(relevantSports, (sport: string) =>
                        _getConditionScoresForSpot(ctx, spot._id, sport, args.userId)
                    ),
                ]);

                const configs: Record<string, any> = {};
                const scoresMap: Record<string, any> = {};
                for (let i = 0; i < relevantSports.length; i++) {
                    const sport = relevantSports[i];
                    configs[sport] = configValues[i];
                    for (const score of scoreArrays[i]) {
                        scoresMap[`${score.timestamp}_${sport}`] = score;
                    }
                }

                return [spot._id, { slots, configs, scoresMap, tides: tides.sort((a: any, b: any) => a.time - b.time) }] as const;
            }),
            // Use index to find most recent successful scrape — avoids full table scan
            ctx.db
                .query("scrapes")
                .withIndex("by_success_timestamp", (q: any) => q.eq("isSuccessful", true))
                .order("desc")
                .first(),
        ]);

        const data = Object.fromEntries(spotEntries);
        const mostRecentScrapeTimestamp = mostRecentScrape?.scrapeTimestamp ?? null;

        return { spots: filteredSpots, data, mostRecentScrapeTimestamp };
    },
});
