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
        liveReportUrl: v.optional(v.string()),
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
        // Tide data
        tideHeight: v.optional(v.number()),
        tideType: v.optional(v.string()), // "high" | "low"
        tideTime: v.optional(v.number()), // timestamp
    }).index("by_spot", ["spotId"])
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
});
