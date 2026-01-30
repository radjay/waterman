import { query, mutation, action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import Groq from "groq-sdk";
import { buildPrompt } from "./prompts";

// =============================================================================
// CONSTANTS
// =============================================================================

const SKILL_LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Verify session and return userId, or throw error if invalid
 */
async function verifySessionAndGetUserId(
  ctx: any,
  sessionToken: string
): Promise<Id<"users">> {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", sessionToken))
    .first();

  if (!session || Date.now() > session.expiresAt) {
    throw new Error("Invalid or expired session");
  }

  return session.userId;
}

/**
 * Log a personalization event for abuse monitoring
 */
async function logPersonalizationEvent(
  ctx: any,
  userId: Id<"users">,
  eventType: string,
  sport?: string,
  spotId?: Id<"spots">,
  slotsScored?: number
): Promise<void> {
  await ctx.db.insert("personalization_logs", {
    userId,
    eventType,
    sport,
    spotId,
    slotsScored,
    timestamp: Date.now(),
  });
}

// =============================================================================
// SPORT PROFILE MUTATIONS
// =============================================================================

/**
 * Create or update a user's sport profile
 */
export const upsertSportProfile = mutation({
  args: {
    sessionToken: v.string(),
    sport: v.string(),
    skillLevel: v.string(),
    context: v.optional(v.string()),
  },
  returns: v.object({
    profileId: v.id("user_sport_profiles"),
    isNew: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Verify session
    const userId = await verifySessionAndGetUserId(ctx, args.sessionToken);

    // Validate skill level
    if (!SKILL_LEVELS.includes(args.skillLevel as any)) {
      throw new Error(
        `Invalid skill level. Must be one of: ${SKILL_LEVELS.join(", ")}`
      );
    }

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("user_sport_profiles")
      .withIndex("by_user_sport", (q) =>
        q.eq("userId", userId).eq("sport", args.sport)
      )
      .first();

    const now = Date.now();

    if (existingProfile) {
      // Update existing profile
      await ctx.db.patch(existingProfile._id, {
        skillLevel: args.skillLevel,
        context: args.context,
        updatedAt: now,
      });

      // Log the update event
      await logPersonalizationEvent(
        ctx,
        userId,
        "sport_profile_update",
        args.sport
      );

      return {
        profileId: existingProfile._id,
        isNew: false,
      };
    } else {
      // Create new profile
      const profileId = await ctx.db.insert("user_sport_profiles", {
        userId,
        sport: args.sport,
        skillLevel: args.skillLevel,
        context: args.context,
        createdAt: now,
        updatedAt: now,
      });

      // Log the create event
      await logPersonalizationEvent(
        ctx,
        userId,
        "sport_profile_update",
        args.sport
      );

      return {
        profileId,
        isNew: true,
      };
    }
  },
});

/**
 * Delete a user's sport profile
 */
export const deleteSportProfile = mutation({
  args: {
    sessionToken: v.string(),
    sport: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await verifySessionAndGetUserId(ctx, args.sessionToken);

    const profile = await ctx.db
      .query("user_sport_profiles")
      .withIndex("by_user_sport", (q) =>
        q.eq("userId", userId).eq("sport", args.sport)
      )
      .first();

    if (profile) {
      await ctx.db.delete(profile._id);
    }

    return null;
  },
});

// =============================================================================
// SPOT CONTEXT MUTATIONS
// =============================================================================

/**
 * Create or update a user's spot context
 */
export const upsertSpotContext = mutation({
  args: {
    sessionToken: v.string(),
    spotId: v.id("spots"),
    sport: v.string(),
    context: v.string(),
    isExpertInput: v.optional(v.boolean()),
  },
  returns: v.object({
    contextId: v.id("user_spot_context"),
    isNew: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await verifySessionAndGetUserId(ctx, args.sessionToken);

    // Verify spot exists
    const spot = await ctx.db.get(args.spotId);
    if (!spot) {
      throw new Error("Spot not found");
    }

    // Check if context already exists
    const existingContext = await ctx.db
      .query("user_spot_context")
      .withIndex("by_user_spot_sport", (q) =>
        q.eq("userId", userId).eq("spotId", args.spotId).eq("sport", args.sport)
      )
      .first();

    const now = Date.now();

    if (existingContext) {
      // Update existing context
      await ctx.db.patch(existingContext._id, {
        context: args.context,
        isExpertInput: args.isExpertInput,
        updatedAt: now,
      });

      // Log the update event
      await logPersonalizationEvent(
        ctx,
        userId,
        "spot_context_update",
        args.sport,
        args.spotId
      );

      return {
        contextId: existingContext._id,
        isNew: false,
      };
    } else {
      // Create new context
      const contextId = await ctx.db.insert("user_spot_context", {
        userId,
        spotId: args.spotId,
        sport: args.sport,
        context: args.context,
        isExpertInput: args.isExpertInput,
        createdAt: now,
        updatedAt: now,
      });

      // Log the create event
      await logPersonalizationEvent(
        ctx,
        userId,
        "spot_context_update",
        args.sport,
        args.spotId
      );

      return {
        contextId,
        isNew: true,
      };
    }
  },
});

/**
 * Delete a user's spot context
 */
export const deleteSpotContext = mutation({
  args: {
    sessionToken: v.string(),
    contextId: v.id("user_spot_context"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await verifySessionAndGetUserId(ctx, args.sessionToken);

    const context = await ctx.db.get(args.contextId);

    if (!context) {
      throw new Error("Context not found");
    }

    // Verify user owns this context
    if (context.userId !== userId) {
      throw new Error("Not authorized to delete this context");
    }

    await ctx.db.delete(args.contextId);
    return null;
  },
});

// =============================================================================
// USER SETTINGS MUTATIONS
// =============================================================================

/**
 * Update user's personalization settings
 */
export const updatePersonalizationSettings = mutation({
  args: {
    sessionToken: v.string(),
    showPersonalizedScores: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await verifySessionAndGetUserId(ctx, args.sessionToken);

    await ctx.db.patch(userId, {
      showPersonalizedScores: args.showPersonalizedScores,
    });

    return { success: true };
  },
});

// =============================================================================
// SPORT PROFILE QUERIES
// =============================================================================

/**
 * Get a user's sport profile for a specific sport
 */
export const getSportProfile = query({
  args: {
    sessionToken: v.string(),
    sport: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("user_sport_profiles"),
      _creationTime: v.number(),
      userId: v.id("users"),
      sport: v.string(),
      skillLevel: v.string(),
      context: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || Date.now() > session.expiresAt) {
      return null;
    }

    const profile = await ctx.db
      .query("user_sport_profiles")
      .withIndex("by_user_sport", (q) =>
        q.eq("userId", session.userId).eq("sport", args.sport)
      )
      .first();

    return profile;
  },
});

/**
 * Get all of a user's sport profiles
 */
export const getAllSportProfiles = query({
  args: {
    sessionToken: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("user_sport_profiles"),
      _creationTime: v.number(),
      userId: v.id("users"),
      sport: v.string(),
      skillLevel: v.string(),
      context: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || Date.now() > session.expiresAt) {
      return [];
    }

    const profiles = await ctx.db
      .query("user_sport_profiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();

    return profiles;
  },
});

// =============================================================================
// SPOT CONTEXT QUERIES
// =============================================================================

/**
 * Get a user's spot context for a specific spot and sport
 */
export const getSpotContext = query({
  args: {
    sessionToken: v.string(),
    spotId: v.id("spots"),
    sport: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("user_spot_context"),
      _creationTime: v.number(),
      userId: v.id("users"),
      spotId: v.id("spots"),
      sport: v.string(),
      context: v.string(),
      isExpertInput: v.optional(v.boolean()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || Date.now() > session.expiresAt) {
      return null;
    }

    const context = await ctx.db
      .query("user_spot_context")
      .withIndex("by_user_spot_sport", (q) =>
        q
          .eq("userId", session.userId)
          .eq("spotId", args.spotId)
          .eq("sport", args.sport)
      )
      .first();

    return context;
  },
});

/**
 * Get all of a user's spot contexts
 */
export const getAllSpotContexts = query({
  args: {
    sessionToken: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("user_spot_context"),
      _creationTime: v.number(),
      userId: v.id("users"),
      spotId: v.id("spots"),
      spotName: v.string(),
      spotCountry: v.optional(v.string()),
      sport: v.string(),
      context: v.string(),
      isExpertInput: v.optional(v.boolean()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || Date.now() > session.expiresAt) {
      return [];
    }

    const contexts = await ctx.db
      .query("user_spot_context")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();

    // Join with spots to get spot names
    const contextsWithSpotInfo = await Promise.all(
      contexts.map(async (context) => {
        const spot = await ctx.db.get(context.spotId);
        return {
          ...context,
          spotName: spot?.name || "Unknown Spot",
          spotCountry: spot?.country,
        };
      })
    );

    return contextsWithSpotInfo;
  },
});

/**
 * Get all user's spot contexts for a specific sport
 */
export const getSpotContextsForSport = query({
  args: {
    sessionToken: v.string(),
    sport: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("user_spot_context"),
      spotId: v.id("spots"),
      spotName: v.string(),
      context: v.string(),
      isExpertInput: v.optional(v.boolean()),
    })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || Date.now() > session.expiresAt) {
      return [];
    }

    const contexts = await ctx.db
      .query("user_spot_context")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .filter((q) => q.eq(q.field("sport"), args.sport))
      .collect();

    // Join with spots to get spot names
    const contextsWithSpotInfo = await Promise.all(
      contexts.map(async (context) => {
        const spot = await ctx.db.get(context.spotId);
        return {
          _id: context._id,
          spotId: context.spotId,
          spotName: spot?.name || "Unknown Spot",
          context: context.context,
          isExpertInput: context.isExpertInput,
        };
      })
    );

    return contextsWithSpotInfo;
  },
});

// =============================================================================
// ADMIN QUERIES (for expert input review)
// =============================================================================

/**
 * Get all expert inputs for a spot (admin use)
 */
export const getExpertInputsForSpot = query({
  args: {
    spotId: v.id("spots"),
    sport: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("user_spot_context"),
      userId: v.id("users"),
      context: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const contexts = await ctx.db
      .query("user_spot_context")
      .withIndex("by_spot_sport_expert", (q) =>
        q
          .eq("spotId", args.spotId)
          .eq("sport", args.sport)
          .eq("isExpertInput", true)
      )
      .collect();

    return contexts.map((c) => ({
      _id: c._id,
      userId: c.userId,
      context: c.context,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  },
});

/**
 * Get all expert inputs across all spots (admin use)
 */
export const getAllExpertInputs = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("user_spot_context"),
      userId: v.id("users"),
      userEmail: v.string(),
      spotId: v.id("spots"),
      spotName: v.string(),
      spotCountry: v.optional(v.string()),
      sport: v.string(),
      context: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    // Get all contexts marked as expert input
    const allContexts = await ctx.db.query("user_spot_context").collect();
    const expertContexts = allContexts.filter((c) => c.isExpertInput === true);

    // Enrich with user and spot info
    const enrichedContexts = await Promise.all(
      expertContexts.map(async (context) => {
        const [user, spot] = await Promise.all([
          ctx.db.get(context.userId),
          ctx.db.get(context.spotId),
        ]);

        return {
          _id: context._id,
          userId: context.userId,
          userEmail: user?.email || "Unknown",
          spotId: context.spotId,
          spotName: spot?.name || "Unknown Spot",
          spotCountry: spot?.country,
          sport: context.sport,
          context: context.context,
          createdAt: context.createdAt,
          updatedAt: context.updatedAt,
        };
      })
    );

    // Sort by most recent first
    return enrichedContexts.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/**
 * Get personalization logs for a user (admin use)
 */
export const getPersonalizationLogs = query({
  args: {
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("personalization_logs"),
      userId: v.id("users"),
      userEmail: v.string(),
      eventType: v.string(),
      sport: v.optional(v.string()),
      spotId: v.optional(v.id("spots")),
      spotName: v.optional(v.string()),
      slotsScored: v.optional(v.number()),
      timestamp: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    let logsQuery = ctx.db.query("personalization_logs");

    if (args.userId) {
      logsQuery = logsQuery.withIndex("by_user", (q) =>
        q.eq("userId", args.userId)
      );
    }

    const logs = await logsQuery.order("desc").take(limit);

    // Enrich with user and spot info
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        let spotName: string | undefined;
        if (log.spotId) {
          const spot = await ctx.db.get(log.spotId);
          spotName = spot?.name;
        }

        return {
          _id: log._id,
          userId: log.userId,
          userEmail: user?.email || "Unknown",
          eventType: log.eventType,
          sport: log.sport,
          spotId: log.spotId,
          spotName,
          slotsScored: log.slotsScored,
          timestamp: log.timestamp,
        };
      })
    );

    return enrichedLogs;
  },
});

/**
 * Get user's personalization settings
 */
export const getPersonalizationSettings = query({
  args: {
    sessionToken: v.string(),
  },
  returns: v.object({
    showPersonalizedScores: v.boolean(),
    hasSportProfiles: v.boolean(),
    hasSpotContexts: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || Date.now() > session.expiresAt) {
      return {
        showPersonalizedScores: true,
        hasSportProfiles: false,
        hasSpotContexts: false,
      };
    }

    const user = await ctx.db.get(session.userId);
    const sportProfiles = await ctx.db
      .query("user_sport_profiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();
    const spotContexts = await ctx.db
      .query("user_spot_context")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();

    return {
      showPersonalizedScores: user?.showPersonalizedScores !== false, // Default true
      hasSportProfiles: sportProfiles.length > 0,
      hasSpotContexts: spotContexts.length > 0,
    };
  },
});

// =============================================================================
// FAVORITE SPOTS QUERIES
// =============================================================================

/**
 * Get user's favorite spots with names and sports (for spot context editor)
 */
export const getFavoriteSpotsWithDetails = query({
  args: {
    sessionToken: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("spots"),
      name: v.string(),
      country: v.optional(v.string()),
      sports: v.array(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || Date.now() > session.expiresAt) {
      return [];
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.favoriteSpots || user.favoriteSpots.length === 0) {
      return [];
    }

    // Get spot details for each favorite
    const spotsWithDetails = await Promise.all(
      user.favoriteSpots.map(async (spotId) => {
        const spot = await ctx.db.get(spotId);
        if (!spot) return null;
        return {
          _id: spot._id,
          name: spot.name,
          country: spot.country,
          sports: spot.sports || ["wingfoil"],
        };
      })
    );

    return spotsWithDetails.filter(
      (spot): spot is NonNullable<typeof spot> => spot !== null
    );
  },
});

// =============================================================================
// INTERNAL QUERIES (for action use)
// =============================================================================

/**
 * Internal query to get user data for personalized scoring
 */
export const getUserDataForScoring = internalQuery({
  args: {
    sessionToken: v.string(),
    sport: v.string(),
  },
  handler: async (ctx, args) => {
    // Get session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || Date.now() > session.expiresAt) {
      return null;
    }

    // Get user
    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    // Get sport profile
    const sportProfile = await ctx.db
      .query("user_sport_profiles")
      .withIndex("by_user_sport", (q) =>
        q.eq("userId", session.userId).eq("sport", args.sport)
      )
      .first();

    // Get all spot contexts for this sport
    const spotContexts = await ctx.db
      .query("user_spot_context")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .filter((q) => q.eq(q.field("sport"), args.sport))
      .collect();

    return {
      userId: session.userId,
      userIdString: session.userId as string, // For condition_scores.userId field
      favoriteSpots: user.favoriteSpots || [],
      sportProfile: sportProfile
        ? {
            skillLevel: sportProfile.skillLevel,
            context: sportProfile.context,
          }
        : null,
      spotContexts: spotContexts.map((c) => ({
        spotId: c.spotId,
        context: c.context,
      })),
    };
  },
});

/**
 * Internal query to get future slots for a spot
 */
export const getFutureSlotsForSpot = internalQuery({
  args: {
    spotId: v.id("spots"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const twoDaysFromNow = now + 2 * 24 * 60 * 60 * 1000;

    // Get all slots for this spot
    const allSlots = await ctx.db
      .query("forecast_slots")
      .withIndex("by_spot", (q) => q.eq("spotId", args.spotId))
      .collect();

    // Find the most recent scrape timestamp
    const scrapeTimestamps = [
      ...new Set(
        allSlots
          .map((s) => s.scrapeTimestamp)
          .filter((ts) => ts !== undefined && ts !== null)
      ),
    ];
    const latestScrapeTimestamp = Math.max(...scrapeTimestamps);

    // Filter to future slots from latest scrape (next 2 days for faster scoring)
    const futureSlots = allSlots.filter(
      (slot) =>
        slot.timestamp >= now &&
        slot.timestamp <= twoDaysFromNow &&
        slot.scrapeTimestamp === latestScrapeTimestamp
    );

    return futureSlots.sort((a, b) => a.timestamp - b.timestamp);
  },
});

/**
 * Internal mutation to log personalization event
 */
export const logScoringEvent = mutation({
  args: {
    userId: v.id("users"),
    sport: v.string(),
    slotsScored: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("personalization_logs", {
      userId: args.userId,
      eventType: "manual_rescore",
      sport: args.sport,
      slotsScored: args.slotsScored,
      timestamp: Date.now(),
    });
  },
});

// =============================================================================
// PERSONALIZED SCORING ACTION
// =============================================================================

/**
 * Build personalized prompt by adding user context to system + spot prompts
 */
function buildPersonalizedPrompt(
  systemPrompt: string,
  spotPrompt: string,
  userSkillLevel: string,
  userSportContext: string | undefined,
  userSpotContext: string | undefined
): string {
  // Create user context section
  let userContextSection = `\n\n=== USER PERSONALIZATION ===\n`;
  userContextSection += `User Skill Level: ${userSkillLevel.toUpperCase()}\n`;

  if (userSportContext) {
    userContextSection += `\nUser's Personal Context for this Sport:\n${userSportContext}\n`;
  }

  if (userSpotContext) {
    userContextSection += `\nUser's Notes for this Spot:\n${userSpotContext}\n`;
  }

  userContextSection += `\nIMPORTANT: Evaluate conditions FROM THIS USER'S PERSPECTIVE based on their skill level and personal context above. A "${userSkillLevel}" rider will have different ideal conditions than others. Score what would be ideal for THIS specific user, not the general population.\n`;

  // Combine: system prompt + spot prompt + user context
  return `${systemPrompt}\n\nSpot-Specific Information:\n${spotPrompt}${userContextSection}`;
}

/**
 * Score a single slot for a specific user with their personalized context.
 */
export const scorePersonalizedSlot = action({
  args: {
    slotId: v.id("forecast_slots"),
    spotId: v.id("spots"),
    sport: v.string(),
    userId: v.string(), // User ID as string for condition_scores table
    userSkillLevel: v.string(),
    userSportContext: v.optional(v.string()),
    userSpotContext: v.optional(v.string()),
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
    const slot = await ctx.runQuery(api.spots.getSlotById, {
      slotId: args.slotId,
    });
    if (!slot) {
      console.error(`Slot ${args.slotId} not found`);
      return null;
    }

    // Get spot data
    const spot = await ctx.runQuery(api.spots.getSpotById, {
      spotId: args.spotId,
    });
    if (!spot) {
      console.error(`Spot ${args.spotId} not found`);
      return null;
    }

    // Get time series context
    const timeSeriesContext = await ctx.runQuery(api.spots.getTimeSeriesContext, {
      spotId: args.spotId,
      timestamp: slot.timestamp,
      scrapeTimestamp: slot.scrapeTimestamp,
    });

    // Get system sport prompt
    const systemPromptData = await ctx.runQuery(api.spots.getSystemSportPrompt, {
      sport: args.sport,
    });

    // Get spot-specific prompt
    const spotPromptData = await ctx.runQuery(api.spots.getScoringPrompt, {
      spotId: args.spotId,
      sport: args.sport,
    });

    // Build personalized system prompt
    const baseSystemPrompt = systemPromptData?.prompt || "";
    const baseSpotPrompt = spotPromptData?.spotPrompt || "";
    const temporalPrompt = spotPromptData?.temporalPrompt || "";

    const personalizedSystemPrompt = buildPersonalizedPrompt(
      baseSystemPrompt,
      baseSpotPrompt,
      args.userSkillLevel,
      args.userSportContext,
      args.userSpotContext
    );

    // Build the full prompt using existing utility
    const { system, user } = buildPrompt(
      personalizedSystemPrompt,
      "", // spot prompt is already included in personalized system prompt
      temporalPrompt,
      slot,
      timeSeriesContext,
      spot.name
    );

    // Call Groq API with retry logic (shorter delays for interactive use)
    const retryDelays = [2000, 5000]; // 2s, 5s - faster retries for better UX
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model: "openai/gpt-oss-120b",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.3,
          max_tokens: 1500,
          response_format: {
            type: "json_object",
          },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error("No content in response");
        }

        const response = JSON.parse(content);

        // Validate response
        if (
          typeof response.score !== "number" ||
          response.score < 0 ||
          response.score > 100
        ) {
          throw new Error(`Invalid score: ${response.score}`);
        }
        if (
          typeof response.reasoning !== "string" ||
          response.reasoning.trim().length === 0
        ) {
          throw new Error("Missing or empty reasoning");
        }

        const score = Math.round(response.score);

        // Save personalized score
        await ctx.runMutation(api.spots.saveConditionScore, {
          slotId: args.slotId,
          spotId: args.spotId,
          timestamp: slot.timestamp,
          sport: args.sport,
          userId: args.userId,
          score,
          reasoning: response.reasoning.substring(0, 200),
          factors: response.factors,
          model: "openai/gpt-oss-120b",
          scrapeTimestamp: slot.scrapeTimestamp,
        });

        return { score, reasoning: response.reasoning };
      } catch (error: any) {
        lastError = error;
        console.error(
          `Personalized scoring attempt ${attempt + 1} failed:`,
          error.message
        );

        if (attempt < retryDelays.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt])
          );
        }
      }
    }

    console.error("All personalized scoring retries failed:", lastError);
    return null;
  },
});

/**
 * Score all future slots for a user's favorite spots with personalized context.
 * Called after user updates their sport profile.
 */
export const scorePersonalizedSlots = action({
  args: {
    sessionToken: v.string(),
    sport: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user data
    const userData = await ctx.runQuery(
      internal.personalization.getUserDataForScoring,
      {
        sessionToken: args.sessionToken,
        sport: args.sport,
      }
    );

    if (!userData) {
      throw new Error("Invalid session or user not found");
    }

    if (!userData.sportProfile) {
      throw new Error("Sport profile not found. Please set up your profile first.");
    }

    if (userData.favoriteSpots.length === 0) {
      return {
        success: true,
        message: "No favorite spots to score. Add some favorite spots first!",
        slotsScored: 0,
      };
    }

    // Create a map of spotId -> user's spot context
    const spotContextMap = new Map<string, string>();
    for (const sc of userData.spotContexts) {
      spotContextMap.set(sc.spotId.toString(), sc.context);
    }

    let totalSlotsScored = 0;
    let totalSlotsFailed = 0;

    // Score each favorite spot
    for (const spotId of userData.favoriteSpots) {
      // Get future slots for this spot
      const futureSlots = await ctx.runQuery(
        internal.personalization.getFutureSlotsForSpot,
        { spotId }
      );

      // Score each slot
      for (const slot of futureSlots) {
        const result = await ctx.runAction(
          api.personalization.scorePersonalizedSlot,
          {
            slotId: slot._id,
            spotId,
            sport: args.sport,
            userId: userData.userIdString,
            userSkillLevel: userData.sportProfile.skillLevel,
            userSportContext: userData.sportProfile.context,
            userSpotContext: spotContextMap.get(spotId.toString()),
          }
        );

        if (result) {
          totalSlotsScored++;
        } else {
          totalSlotsFailed++;
        }

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Log the scoring event
    await ctx.runMutation(api.personalization.logScoringEvent, {
      userId: userData.userId,
      sport: args.sport,
      slotsScored: totalSlotsScored,
    });

    return {
      success: true,
      slotsScored: totalSlotsScored,
      slotsFailed: totalSlotsFailed,
      spotsProcessed: userData.favoriteSpots.length,
    };
  },
});
