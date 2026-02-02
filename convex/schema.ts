import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Database schema for Waterman application.
 * 
 * Tables:
 * - users: User accounts for personalization
 * - magic_links: Temporary links for passwordless authentication
 * - sessions: Active user sessions
 * - spots: Water sports locations (beaches, spots)
 * - spotConfigs: Sport-specific condition criteria for each spot
 * - forecast_slots: Time-series forecast data for each spot
 * - scrapes: Tracking metadata for forecast data collection runs
 * - user_sport_profiles: User skill level and context per sport for personalized scoring
 * - user_spot_context: User notes about specific spots for personalized scoring
 * - personalization_logs: Abuse monitoring for personalization features
 */
export default defineSchema({
    /**
     * User accounts for personalization.
     * Users can sign up with email (passwordless) to save preferences.
     */
    users: defineTable({
        email: v.string(),
        name: v.optional(v.string()),
        emailVerified: v.boolean(), // True after first magic link use
        onboardingCompleted: v.boolean(), // True after completing onboarding flow
        favoriteSpots: v.optional(v.array(v.id("spots"))),
        favoriteSports: v.optional(v.array(v.string())), // e.g., ["wingfoil", "surfing"]
        showPersonalizedScores: v.optional(v.boolean()), // Default: true. When false, show system scores.
        createdAt: v.number(),
        lastLoginAt: v.optional(v.number()),
    })
        .index("by_email", ["email"]),
    /**
     * Magic links for passwordless authentication.
     * Each link is single-use and expires after 15 minutes.
     */
    magic_links: defineTable({
        userId: v.id("users"),
        email: v.string(),
        token: v.string(), // Secure random token (32 bytes, URL-safe)
        code: v.optional(v.string()), // 6-digit verification code for easy manual entry (optional for backwards compatibility)
        expiresAt: v.number(), // Timestamp (epoch ms)
        used: v.boolean(),
        usedAt: v.optional(v.number()),
        createdAt: v.number(),
    })
        .index("by_token", ["token"])
        .index("by_email", ["email"])
        .index("by_user", ["userId"]),
    /**
     * Active user sessions.
     * Sessions expire after 30 days of inactivity.
     */
    sessions: defineTable({
        userId: v.id("users"),
        token: v.string(), // Secure random session token
        expiresAt: v.number(), // Timestamp (epoch ms)
        lastActivityAt: v.number(),
        createdAt: v.number(),
    })
        .index("by_token", ["token"])
        .index("by_user", ["userId"]),
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
    /**
     * Historical record of condition scores.
     * Archives previous scores when they are replaced by new scores.
     * Used to evaluate scoring accuracy against observed conditions.
     */
    score_history: defineTable({
        // Original score data (from condition_scores)
        slotId: v.id("forecast_slots"),
        spotId: v.id("spots"),
        timestamp: v.number(), // Slot timestamp (epoch ms)
        sport: v.string(),
        userId: v.union(v.string(), v.null()),
        score: v.number(), // 0-100
        reasoning: v.string(),
        factors: v.optional(v.object({
            windQuality: v.optional(v.number()),
            waveQuality: v.optional(v.number()),
            tideQuality: v.optional(v.number()),
            overallConditions: v.optional(v.number()),
        })),
        scoredAt: v.number(), // When this score was originally created (epoch ms)
        model: v.optional(v.string()),
        scrapeTimestamp: v.optional(v.number()),
        // Prompt information used for this score
        systemPromptId: v.optional(v.id("system_sport_prompts")), // ID of system prompt used
        spotPromptId: v.optional(v.id("scoring_prompts")), // ID of spot prompt used
        systemPromptText: v.optional(v.string()), // Snapshot of system prompt text
        spotPromptText: v.optional(v.string()), // Snapshot of spot prompt text
        temporalPromptText: v.optional(v.string()), // Snapshot of temporal prompt text
        // Archive metadata
        replacedAt: v.number(), // When this score was replaced (epoch ms)
        replacedByScoreId: v.id("condition_scores"), // ID of the score that replaced this one
    })
        .index("by_slot_sport", ["slotId", "sport"])
        .index("by_spot_timestamp", ["spotId", "timestamp"])
        .index("by_replaced_by", ["replacedByScoreId"]),
    /**
     * Historical record of scoring prompts (spot-specific).
     * Archives previous prompt versions when they are updated.
     * Used to track which prompts were used for historical scores.
     */
    prompt_history: defineTable({
        // Original prompt data (from scoring_prompts)
        spotId: v.id("spots"),
        sport: v.string(),
        userId: v.union(v.string(), v.null()),
        spotPrompt: v.string(),
        temporalPrompt: v.string(),
        isActive: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
        // Archive metadata
        replacedAt: v.number(), // When this prompt was replaced (epoch ms)
        replacedByPromptId: v.id("scoring_prompts"), // ID of the prompt that replaced this one
    })
        .index("by_spot_sport", ["spotId", "sport"])
        .index("by_replaced_by", ["replacedByPromptId"]),
    /**
     * Historical record of system sport prompts.
     * Archives previous prompt versions when they are updated.
     * Used to track which prompts were used for historical scores.
     */
    system_prompt_history: defineTable({
        // Original prompt data (from system_sport_prompts)
        sport: v.string(),
        prompt: v.string(),
        isActive: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
        // Archive metadata
        replacedAt: v.number(), // When this prompt was replaced (epoch ms)
        replacedByPromptId: v.id("system_sport_prompts"), // ID of the prompt that replaced this one
    })
        .index("by_sport", ["sport"])
        .index("by_replaced_by", ["replacedByPromptId"]),
    /**
     * Calendar subscriptions for users.
     * Each user can create one subscription per sport (wingfoil, surfing).
     * Tokens allow personalized feeds (filtered to user's favorite spots).
     */
    calendar_subscriptions: defineTable({
        userId: v.id("users"),
        sport: v.string(), // "wingfoil" or "surfing"
        token: v.string(), // Unique subscription token (32 bytes, URL-safe)
        isActive: v.boolean(), // Enable/disable subscription
        createdAt: v.number(),
        lastAccessedAt: v.optional(v.number()), // Track feed usage
        accessCount: v.optional(v.number()), // Track popularity
    })
        .index("by_user", ["userId"])
        .index("by_user_sport", ["userId", "sport"])
        .index("by_token", ["token"]),
    /**
     * User sport profiles for personalized scoring.
     * Stores skill level and free-form context for each sport.
     * One profile per user per sport.
     */
    user_sport_profiles: defineTable({
        userId: v.id("users"),
        sport: v.string(), // "wingfoil" or "surfing"
        skillLevel: v.string(), // "beginner" | "intermediate" | "advanced" | "expert"
        context: v.optional(v.string()), // Free-form text about their level, preferences, equipment, etc.
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_user_sport", ["userId", "sport"]),
    /**
     * User spot context for personalized scoring.
     * Free-form notes about what works/doesn't work for the user at a specific spot.
     * One context per user per spot per sport.
     */
    user_spot_context: defineTable({
        userId: v.id("users"),
        spotId: v.id("spots"),
        sport: v.string(), // "wingfoil" or "surfing"
        context: v.string(), // Free-form text about their experience with this spot
        isExpertInput: v.optional(v.boolean()), // If true, can be used to improve default prompts
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_user_spot", ["userId", "spotId"])
        .index("by_user_spot_sport", ["userId", "spotId", "sport"])
        .index("by_spot_sport_expert", ["spotId", "sport", "isExpertInput"]),
    /**
     * Personalization event logs for abuse monitoring.
     * Tracks context updates and scoring runs per user.
     */
    personalization_logs: defineTable({
        userId: v.id("users"),
        eventType: v.string(), // "sport_profile_update" | "spot_context_update" | "manual_rescore"
        sport: v.optional(v.string()),
        spotId: v.optional(v.id("spots")),
        slotsScored: v.optional(v.number()), // How many slots were scored
        timestamp: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_user_timestamp", ["userId", "timestamp"]),
    /**
     * Scoring logs for LLM provenance tracking.
     * Stores complete prompt/response pairs for debugging scoring issues.
     */
    scoring_logs: defineTable({
        // Link to the score
        scoreId: v.id("condition_scores"),
        
        // Context identifiers
        slotId: v.id("forecast_slots"),
        spotId: v.id("spots"),
        sport: v.string(),
        userId: v.union(v.string(), v.null()), // null = system score
        timestamp: v.number(), // Slot timestamp for easy querying
        
        // Request data
        systemPrompt: v.string(), // Full constructed system prompt
        userPrompt: v.string(),   // Full constructed user prompt
        model: v.string(),        // e.g., "openai/gpt-oss-120b"
        temperature: v.number(),  // e.g., 0.3
        maxTokens: v.number(),    // e.g., 800
        
        // Response data
        rawResponse: v.string(),  // Raw JSON string from LLM
        
        // Metadata
        scoredAt: v.number(),     // When scoring occurred
        durationMs: v.optional(v.number()), // How long the API call took
        attempt: v.optional(v.number()),    // Which retry attempt succeeded (1-based)
    })
        .index("by_score", ["scoreId"])
        .index("by_slot_sport", ["slotId", "sport"])
        .index("by_spot_timestamp_sport", ["spotId", "timestamp", "sport"])
        .index("by_user_spot_sport", ["userId", "spotId", "sport"]),
    /**
     * Session journal entries for watersports sessions.
     * Users can log their sessions with location, time, duration, rating, and notes.
     * Links to forecast slots for comparison with actual conditions.
     */
    session_entries: defineTable({
        userId: v.id("users"),
        
        // Sport type
        sport: v.string(), // "wingfoil" | "surfing"
        
        // Location - either a spot reference or custom location
        spotId: v.optional(v.id("spots")), // Reference to known spot (null for custom)
        customLocation: v.optional(v.string()), // Name of custom location (free text)
        
        // Session timing
        sessionDate: v.number(), // Epoch ms of session start
        durationMinutes: v.number(), // Duration in minutes
        
        // Rating (1-5 stars)
        rating: v.number(),
        
        // Notes
        sessionNotes: v.optional(v.string()), // Personal session experience
        conditionNotes: v.optional(v.string()), // Observed conditions (live report)
        
        // Forecast references (links to actual scraped/scored data)
        // Captured at creation time, not updated on edit
        forecastSlotIds: v.optional(v.array(v.id("forecast_slots"))), // Slots covering session time
        
        // Metadata
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_user_date", ["userId", "sessionDate"])
        .index("by_user_sport", ["userId", "sport"])
        .index("by_spot", ["spotId"])
        .index("by_user_spot", ["userId", "spotId"]),
});
