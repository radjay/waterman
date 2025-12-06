import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    spots: defineTable({
        name: v.string(),
        url: v.string(),
        country: v.optional(v.string()),
    }),
    spotConfigs: defineTable({
        spotId: v.id("spots"),
        sport: v.string(), // e.g. "Wingfoil"
        minSpeed: v.number(),
        minGust: v.number(),
        directionFrom: v.number(), // Deg 0-360
        directionTo: v.number(), // Deg 0-360
    }),
    forecast_slots: defineTable({
        spotId: v.id("spots"),
        timestamp: v.number(), // Epoch ms
        speed: v.number(),
        gust: v.number(),
        direction: v.number(),
        waveHeight: v.optional(v.number()),
        wavePeriod: v.optional(v.number()),
        waveDirection: v.optional(v.number()),
    }).index("by_spot", ["spotId"]),
});
