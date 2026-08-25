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
        .index("by_user", ["userId"])
        .index("by_expiresAt", ["expiresAt"]),
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
        .index("by_user", ["userId"])
        .index("by_expiresAt", ["expiresAt"]),
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
    }).index("by_spot_sport", ["spotId", "sport"]),
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
      .index("by_spot_and_scrape_timestamp", ["spotId", "scrapeTimestamp"])
      .index("by_spot_timestamp", ["spotId", "timestamp"]),
    /**
     * Archived forecast slots for historical analysis.
     * Old slots (>48h) are moved here from forecast_slots after each scrape.
     * Not read by the app -- only for offline analysis of forecast evolution.
     */
    forecast_slots_archive: defineTable({
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
        archivedAt: v.number(),
    }).index("by_spot", ["spotId"])
      .index("by_spot_and_scrape_timestamp", ["spotId", "scrapeTimestamp"]),
    /**
     * Per-model wind series, one row per model per slot per scrape.
     *
     * The blended `forecast_slots` series remains the scored one; these are
     * additive evidence used for agreement and the confidence grid. Only wind
     * is stored because Windy.app serves wave data from separate models and it
     * is byte-identical across all five wind models — there is no swell spread
     * to record.
     *
     * NOTE: production and development share one Convex deployment, so this
     * table goes live for everyone the moment it is pushed. All fields are
     * additive and optional-safe for that reason.
     *
     * Retention: pruned to the latest 3 scrapes per spot. Three rather than
     * two because _getForecastSlotsForSpot deliberately carries today's
     * timestamps forward from older scrapes, so a displayed slot can be older
     * than the newest scrape.
     */
    forecast_model_slots: defineTable({
        spotId: v.id("spots"),
        model: v.string(), // "ecmwf" | "gfs27_long" | "iconeuro" | "iconglobal" | "lew"
        timestamp: v.number(), // Epoch ms
        scrapeTimestamp: v.number(),
        speed: v.number(), // knots
        gust: v.number(), // knots
        direction: v.number(), // degrees
    })
        .index("by_spot_and_scrape", ["spotId", "scrapeTimestamp"])
        .index("by_spot_model_timestamp", ["spotId", "model", "timestamp"])
        .index("by_spot_timestamp", ["spotId", "timestamp"]),
    /**
     * Live station readings, keyed by station rather than spot.
     *
     * Two spots share station 2329 and two share 3294. A per-spot row would
     * duplicate one physical measurement as if it were two independent ones,
     * and would double the table. spotId is optional and currently unused;
     * by_station_time is the index that matters.
     */
    station_readings: defineTable({
        stationId: v.string(),
        time: v.number(), // Epoch ms of the reading
        speed: v.number(), // knots
        gust: v.optional(v.number()),
        direction: v.optional(v.number()),
        tempC: v.optional(v.number()),
    })
        .index("by_station_time", ["stationId", "time"]),
    /**
     * Rider counts detected from cam footage.
     *
     * DEFINED BUT NEVER WRITTEN in this phase. There is no computer-vision
     * pipeline; the UI runs on fixtures generated in the Next layer and gated
     * behind the `riderCounts` flag. Nothing seeds this table — production and
     * development share a deployment, so seeded fixtures would be shown to real
     * users as if they were measurements.
     *
     * It exists now so the shape is settled while the UI is built, and so the
     * fixture module can match the real query's return shape exactly.
     */
    cam_rider_counts: defineTable({
        spotId: v.id("spots"),
        at: v.number(), // Epoch ms of the observation
        count: v.number(),
        sport: v.optional(v.string()),
        source: v.string(), // e.g. "cv-v1" — never "fixture"
        confidence: v.optional(v.number()), // 0-1, for the range-not-integer question
    })
        .index("by_spot_time", ["spotId", "at"]),
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
    }).index("by_spot_and_timestamp", ["spotId", "scrapeTimestamp"])
      .index("by_success_timestamp", ["isSuccessful", "scrapeTimestamp"]),
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
        .index("by_spot_sport_timestamp", ["spotId", "sport", "timestamp"])
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

    // =========================================================================
    // Forecast experiment (fx_*) — isolated from production forecast/scoring
    // =========================================================================

    fx_locations: defineTable({
        slug: v.string(),
        name: v.string(),
        role: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        timezone: v.string(),
        defaultRideableWindKnots: v.number(),
        enabled: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_slug", ["slug"])
        .index("by_enabled", ["enabled"]),

    fx_observation_sources: defineTable({
        slug: v.string(),
        provider: v.string(),
        providerStationId: v.string(),
        locationSlug: v.string(),
        name: v.string(),
        cadenceMinutes: v.number(),
        enabled: v.boolean(),
        metadata: v.optional(v.any()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_slug", ["slug"])
        .index("by_provider_station", ["provider", "providerStationId"])
        .index("by_enabled", ["enabled"]),

    fx_worker_runs: defineTable({
        workerName: v.string(),
        startedAt: v.number(),
        finishedAt: v.optional(v.number()),
        status: v.string(),
        attemptedCount: v.optional(v.number()),
        insertedCount: v.optional(v.number()),
        skippedCount: v.optional(v.number()),
        errorMessage: v.optional(v.string()),
        metadata: v.optional(v.any()),
    })
        .index("by_worker_started", ["workerName", "startedAt"])
        .index("by_status_started", ["status", "startedAt"]),

    fx_forecast_runs: defineTable({
        provider: v.string(),
        model: v.string(),
        providerModel: v.string(),
        runStartedAt: v.number(),
        runAvailableAt: v.optional(v.number()),
        fetchedAt: v.number(),
        status: v.string(),
        sourceUrl: v.optional(v.string()),
        responseHash: v.optional(v.string()),
        forecastDays: v.number(),
        variables: v.array(v.string()),
        errorMessage: v.optional(v.string()),
    })
        .index("by_provider_model_run", ["provider", "model", "runStartedAt"])
        .index("by_run_started", ["runStartedAt"])
        .index("by_status_fetched", ["status", "fetchedAt"]),

    fx_forecast_points: defineTable({
        forecastRunId: v.id("fx_forecast_runs"),
        provider: v.string(),
        model: v.string(),
        locationSlug: v.string(),
        runStartedAt: v.number(),
        validTime: v.number(),
        leadHours: v.number(),
        intervalMinutes: v.number(),
        windSpeedKnots: v.optional(v.number()),
        windGustKnots: v.optional(v.number()),
        windDirectionDeg: v.optional(v.number()),
        temperatureC: v.optional(v.number()),
        cloudCoverPct: v.optional(v.number()),
        pressureMslHpa: v.optional(v.number()),
        shortwaveRadiation: v.optional(v.number()),
        boundaryLayerHeightM: v.optional(v.number()),
        raw: v.optional(v.any()),
        createdAt: v.number(),
    })
        .index("by_run", ["forecastRunId"])
        .index("by_location_valid", ["locationSlug", "validTime"])
        .index("by_location_model_valid", ["locationSlug", "model", "validTime"])
        .index("by_provider_model_run_valid", ["provider", "model", "runStartedAt", "validTime"]),

    fx_observations: defineTable({
        sourceSlug: v.string(),
        provider: v.string(),
        providerStationId: v.string(),
        locationSlug: v.string(),
        observedAt: v.number(),
        receivedAt: v.number(),
        windSpeedKnots: v.optional(v.number()),
        windGustKnots: v.optional(v.number()),
        windDirectionDeg: v.optional(v.number()),
        temperatureC: v.optional(v.number()),
        pressureMslHpa: v.optional(v.number()),
        humidityPct: v.optional(v.number()),
        radiationKjM2: v.optional(v.number()),
        quality: v.string(),
        raw: v.optional(v.any()),
        createdAt: v.number(),
    })
        .index("by_source_observed", ["sourceSlug", "observedAt"])
        .index("by_location_observed", ["locationSlug", "observedAt"])
        .index("by_provider_station_observed", ["provider", "providerStationId", "observedAt"]),

    fx_user_reports: defineTable({
        userId: v.union(v.id("users"), v.null()),
        locationSlug: v.string(),
        sport: v.string(),
        reportedAt: v.number(),
        observedAt: v.number(),
        status: v.string(),
        windSpeedEstimateKnots: v.optional(v.number()),
        windDirectionEstimateDeg: v.optional(v.number()),
        notes: v.optional(v.string()),
        confidence: v.number(),
        createdAt: v.number(),
    })
        .index("by_location_observed", ["locationSlug", "observedAt"])
        .index("by_user_observed", ["userId", "observedAt"]),

    fx_daily_labels: defineTable({
        locationSlug: v.string(),
        sport: v.string(),
        dateLocal: v.string(),
        thresholdKnots: v.number(),
        actualKickInAt: v.optional(v.number()),
        actualKickOutAt: v.optional(v.number()),
        peakStartAt: v.optional(v.number()),
        peakEndAt: v.optional(v.number()),
        maxWindKnots: v.optional(v.number()),
        maxGustKnots: v.optional(v.number()),
        sourceConfidence: v.number(),
        labelStatus: v.string(),
        sourceSummary: v.string(),
        dayRegime: v.optional(v.string()),
        regimeSummary: v.optional(v.string()),
        computedAt: v.number(),
    })
        .index("by_location_date", ["locationSlug", "dateLocal"])
        .index("by_status_date", ["labelStatus", "dateLocal"])
        .index("by_location_regime_date", ["locationSlug", "dayRegime", "dateLocal"]),

    fx_model_skill_scores: defineTable({
        provider: v.string(),
        model: v.string(),
        locationSlug: v.string(),
        sport: v.string(),
        season: v.string(),
        regime: v.string(),
        leadBucketHours: v.string(),
        sampleCount: v.number(),
        windSpeedMae: v.optional(v.number()),
        windSpeedRmse: v.optional(v.number()),
        directionMae: v.optional(v.number()),
        onsetMaeMinutes: v.optional(v.number()),
        rideableBrier: v.optional(v.number()),
        updatedAt: v.number(),
    })
        .index("by_model_location", ["provider", "model", "locationSlug"])
        .index("by_location_regime", ["locationSlug", "regime"]),

    fx_predictions: defineTable({
        targetLocationSlug: v.string(),
        sport: v.string(),
        generatedAt: v.number(),
        forecastDateLocal: v.string(),
        modelVersion: v.string(),
        mode: v.optional(v.string()),
        thresholdKnots: v.number(),
        predictedKickInAt: v.optional(v.number()),
        predictedStrongKickInAt: v.optional(v.number()),
        // Legacy field names (pre-rename); kept so existing prod documents validate
        kickInP50At: v.optional(v.number()),
        kickInP75At: v.optional(v.number()),
        peakStartAt: v.optional(v.number()),
        peakEndAt: v.optional(v.number()),
        probabilityTimeline: v.array(v.object({
            time: v.number(),
            rideableProbability: v.number(),
            expectedWindKnots: v.optional(v.number()),
            p10WindKnots: v.optional(v.number()),
            p90WindKnots: v.optional(v.number()),
        })),
        confidence: v.number(),
        summary: v.string(),
        inputs: v.any(),
        createdAt: v.number(),
    })
        .index("by_target_date", ["targetLocationSlug", "forecastDateLocal"])
        .index("by_target_date_mode", ["targetLocationSlug", "forecastDateLocal", "mode"])
        .index("by_generated", ["generatedAt"]),
});
