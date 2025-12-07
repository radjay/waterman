import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    spots: defineTable({
        name: v.string(),
        url: v.string(),
        country: v.optional(v.string()),
        sports: v.optional(v.array(v.string())), // e.g. ["wingfoil", "surfing"] - optional for migration
        webcamUrl: v.optional(v.string()), // URL to webcam feed
        webcamStreamSource: v.optional(v.string()), // "quanteec" | "iol" - source of the webcam stream
    }),
    spotConfigs: defineTable({
        spotId: v.id("spots"),
        sport: v.string(), // e.g. "wingfoil" or "surfing"
        // Wingfoiling criteria
        minSpeed: v.optional(v.number()),
        minGust: v.optional(v.number()),
        directionFrom: v.optional(v.number()), // Deg 0-360
        directionTo: v.optional(v.number()), // Deg 0-360
        // Surfing criteria
        minSwellHeight: v.optional(v.number()),
        maxSwellHeight: v.optional(v.number()),
        swellDirectionFrom: v.optional(v.number()),
        swellDirectionTo: v.optional(v.number()),
        minPeriod: v.optional(v.number()),
        optimalTide: v.optional(v.string()), // "high" | "low" | "both"
    }),
    userSpotConfigs: defineTable({
        userId: v.string(), // Session ID or user ID
        spotId: v.id("spots"),
        sport: v.string(),
        // Wingfoiling criteria (all optional)
        minSpeed: v.optional(v.number()),
        minGust: v.optional(v.number()),
        directionFrom: v.optional(v.number()),
        directionTo: v.optional(v.number()),
        // Surfing criteria (all optional)
        minSwellHeight: v.optional(v.number()),
        maxSwellHeight: v.optional(v.number()),
        swellDirectionFrom: v.optional(v.number()),
        swellDirectionTo: v.optional(v.number()),
        minPeriod: v.optional(v.number()),
        optimalTide: v.optional(v.string()),
    }).index("by_user_spot_sport", ["userId", "spotId", "sport"]),
    forecast_slots: defineTable({
        spotId: v.id("spots"),
        timestamp: v.number(), // Epoch ms
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
    }).index("by_spot", ["spotId"]),
});
