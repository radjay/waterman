import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Database schema for Waterman application.
 * 
 * Tables:
 * - spots: Water sports locations (beaches, spots)
 * - spotConfigs: Sport-specific condition criteria for each spot
 * - forecast_slots: Time-series forecast data for each spot
 * - scrapes: Tracking metadata for forecast data collection runs
 */
export default defineSchema({
    /**
     * Water sports spots/locations.
     * Each spot can support multiple sports (e.g., wingfoiling, surfing).
     */
    spots: defineTable({
        name: v.string(),
        url: v.string(),
        country: v.optional(v.string()),
        windySpotId: v.optional(v.string()), // Windy.app spot ID (e.g., "8512151")
        // Additional optional fields
        sports: v.optional(v.array(v.string())),
        webcamUrl: v.optional(v.string()),
        webcamStreamSource: v.optional(v.string()),
        webcamStreamId: v.optional(v.string()), // Stream ID for webcam (quanteec ID or IOL URL)
        liveReportUrl: v.optional(v.string()),
        // Webcam-specific fields
        webcamOnly: v.optional(v.boolean()), // If true, this spot is webcam-only (not scraped/scored)
        town: v.optional(v.string()), // Town name for webcam spots
        region: v.optional(v.string()), // Region name for webcam spots
        latitude: v.optional(v.number()), // Latitude for webcam spots
        longitude: v.optional(v.number()), // Longitude for webcam spots
    }),
    /**
     * Sport-specific condition criteria for spots.
     * Each spot can have multiple configs (one per sport).
     * Defines minimum/optimal conditions for a sport at a specific spot.
     */
    spotConfigs: defineTable({
        spotId: v.id("spots"),
        sport: v.string(), // e.g. "Wingfoil" or "surfing"
        // Wingfoiling fields (optional)
        minSpeed: v.optional(v.number()),
        minGust: v.optional(v.number()),
        directionFrom: v.optional(v.number()), // Deg 0-360
        directionTo: v.optional(v.number()), // Deg 0-360
        // Surfing fields (optional)
        minSwellHeight: v.optional(v.number()),
        maxSwellHeight: v.optional(v.number()),
        swellDirectionFrom: v.optional(v.number()),
        swellDirectionTo: v.optional(v.number()),
        minPeriod: v.optional(v.number()),
        optimalTide: v.optional(v.string()), // "high" | "low" | "both"
    }),
    /**
     * Forecast data slots - time-series weather/condition data.
     * Each slot represents conditions at a specific timestamp for a spot.
     * Indexed by spotId and scrapeTimestamp for efficient querying.
     */
    forecast_slots: defineTable({
        spotId: v.id("spots"),
        timestamp: v.number(), // Epoch ms
        scrapeTimestamp: v.optional(v.number()), // When this data was scraped (epoch ms)
        speed: v.number(),
        gust: v.number(),
        direction: v.number(),
        waveHeight: v.optional(v.number()),
        wavePeriod: v.optional(v.number()),
        waveDirection: v.optional(v.number()),
        // Temporary: allow old tide fields during migration (will be removed after migration completes)
        tideHeight: v.optional(v.number()),
        tideType: v.optional(v.string()),
        tideTime: v.optional(v.number()),
    }).index("by_spot", ["spotId"])
      .index("by_spot_and_scrape_timestamp", ["spotId", "scrapeTimestamp"]),
    /**
     * Tide events - high and low tides for each spot.
     * Stored separately from forecast slots since tides rarely occur at exact slot times.
     * Each tide event has its own timestamp.
     */
    tides: defineTable({
        spotId: v.id("spots"),
        time: v.number(), // Tide event timestamp (epoch ms)
        type: v.string(), // "high" | "low"
        height: v.number(), // Tide height in meters
        scrapeTimestamp: v.optional(v.number()), // When this data was scraped (epoch ms)
    })
        .index("by_spot", ["spotId"])
        .index("by_spot_time", ["spotId", "time"])
        .index("by_spot_and_scrape_timestamp", ["spotId", "scrapeTimestamp"]),
    /**
     * Scrape execution tracking.
     * Records metadata about each forecast data collection run.
     * Used for monitoring scrape success/failure and data freshness.
     */
    scrapes: defineTable({
        spotId: v.id("spots"),
        scrapeTimestamp: v.number(), // When the scrape ran (epoch ms)
        isSuccessful: v.boolean(), // Whether this scrape was successful
        slotsCount: v.number(), // Number of slots collected
        errorMessage: v.optional(v.string()), // Error message if scrape failed
    }).index("by_spot_and_timestamp", ["spotId", "scrapeTimestamp"]),
    /**
     * Condition scores from LLM evaluation.
     * Stores scores for each slot-sport combination.
     * Supports both system scores (userId: null) and user-specific scores (userId set).
     */
    condition_scores: defineTable({
        slotId: v.id("forecast_slots"), // Reference to forecast slot
        spotId: v.id("spots"), // Denormalized for efficient queries
        timestamp: v.number(), // Denormalized from slot (epoch ms)
        sport: v.string(), // Sport name (e.g., "wingfoil", "surfing")
        userId: v.union(v.string(), v.null()), // null = system/default score, user ID = personalized score
        score: v.number(), // 0-100
        reasoning: v.string(), // Brief explanation (1-2 sentences)
        factors: v.optional(v.object({
            windQuality: v.optional(v.number()),
            waveQuality: v.optional(v.number()),
            tideQuality: v.optional(v.number()),
            overallConditions: v.optional(v.number()),
        })),
        scoredAt: v.number(), // Timestamp when scored (epoch ms)
        model: v.optional(v.string()), // LLM model used (e.g., "openai/gpt-oss-120b")
        scrapeTimestamp: v.optional(v.number()), // Denormalized for query efficiency
    })
        .index("by_slot_sport", ["slotId", "sport"])
        .index("by_spot_timestamp_sport", ["spotId", "timestamp", "sport"])
        .index("by_user_spot_sport", ["userId", "spotId", "sport"]),
    /**
     * System prompts for sport evaluation (shared across all spots).
     * These define general evaluation guidelines for each sport.
     */
    system_sport_prompts: defineTable({
        sport: v.string(), // e.g., "wingfoil", "surfing"
        prompt: v.string(), // Sport evaluation guidelines
        isActive: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_sport", ["sport"]),
    /**
     * Scoring prompts for LLM evaluation.
     * Stores spot-specific prompts (userId: null) and user-specific prompts (userId set).
     * System prompts are stored separately in system_sport_prompts table.
     * Each spot-sport combination has its own prompt entry.
     */
    scoring_prompts: defineTable({
        spotId: v.id("spots"),
        sport: v.string(), // e.g., "wingfoil", "surfing"
        userId: v.union(v.string(), v.null()), // null = default/system prompt, user ID = personalized prompt
        spotPrompt: v.string(), // Spot-specific characteristics
        temporalPrompt: v.string(), // Temporal context instructions
        isActive: v.boolean(), // Enable/disable this prompt
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_spot_sport", ["spotId", "sport"])
        .index("by_user_spot_sport", ["userId", "spotId", "sport"]),
});
