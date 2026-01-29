import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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
