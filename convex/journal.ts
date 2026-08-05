import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import {
  getLatestScrapeSlotsInWindow,
  getSlotsOverlappingTimeWindow,
} from "./queryHelpers/forecastSlots";

/**
 * Sports a journal entry may record.
 *
 * Kitesurfing was excluded here while the rest of the product supported it —
 * the report, dashboard, cams and conditions API all accept it. The new sport
 * selector switches the whole app's context between WING / KITE / SURF, so a
 * sport that half the app rejects is no longer tenable.
 */
const JOURNAL_SPORTS = ["wingfoil", "kitesurfing", "surfing"];


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
 * Find forecast slots that cover a session time window.
 * Returns slots from 1 hour before session start to session end.
 */
async function findForecastSlotsForSession(
  ctx: any,
  spotId: Id<"spots">,
  sessionStart: number,
  durationMinutes: number
): Promise<Id<"forecast_slots">[]> {
  const sessionEnd = sessionStart + durationMinutes * 60 * 1000;
  const searchStart = sessionStart - 60 * 60 * 1000;

  const matchingSlots = await getLatestScrapeSlotsInWindow(
    ctx,
    spotId,
    searchStart,
    sessionEnd
  );

  return matchingSlots.map((slot) => slot._id);
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new session entry
 */
export const createEntry = mutation({
  args: {
    sessionToken: v.string(),
    sport: v.string(), // "wingfoil" | "kitesurfing" | "surfing"
    spotId: v.optional(v.id("spots")),
    customLocation: v.optional(v.string()),
    sessionDate: v.number(), // Epoch ms
    durationMinutes: v.number(),
    rating: v.number(), // 1-5
    sessionNotes: v.optional(v.string()),
    conditionNotes: v.optional(v.string()),
  },
  returns: v.id("session_entries"),
  handler: async (ctx, args) => {
    // Verify session
    const userId = await verifySessionAndGetUserId(ctx, args.sessionToken);
    
    // Validate sport
    if (!JOURNAL_SPORTS.includes(args.sport)) {
      throw new Error(`Sport must be one of: ${JOURNAL_SPORTS.join(", ")}`);
    }
    
    // Validate location (must have spotId OR customLocation)
    if (!args.spotId && !args.customLocation) {
      throw new Error("Must provide either spotId or customLocation");
    }
    
    // Validate rating
    if (args.rating < 1 || args.rating > 5 || !Number.isInteger(args.rating)) {
      throw new Error("Rating must be an integer between 1 and 5");
    }
    
    // Validate duration
    if (args.durationMinutes <= 0 || args.durationMinutes > 480) {
      throw new Error("Duration must be between 1 and 480 minutes (8 hours)");
    }
    
    // Find forecast slots if spotId provided
    let forecastSlotIds: Id<"forecast_slots">[] | undefined = undefined;
    if (args.spotId) {
      forecastSlotIds = await findForecastSlotsForSession(
        ctx,
        args.spotId,
        args.sessionDate,
        args.durationMinutes
      );
      // Convert to undefined if empty array
      if (forecastSlotIds.length === 0) {
        forecastSlotIds = undefined;
      }
    }
    
    const now = Date.now();
    
    // Create entry
    const entryId = await ctx.db.insert("session_entries", {
      userId,
      sport: args.sport,
      spotId: args.spotId,
      customLocation: args.customLocation,
      sessionDate: args.sessionDate,
      durationMinutes: args.durationMinutes,
      rating: args.rating,
      sessionNotes: args.sessionNotes,
      conditionNotes: args.conditionNotes,
      forecastSlotIds,
      createdAt: now,
      updatedAt: now,
    });
    
    return entryId;
  },
});

/**
 * Update an existing session entry
 */
export const updateEntry = mutation({
  args: {
    sessionToken: v.string(),
    entryId: v.id("session_entries"),
    sport: v.optional(v.string()),
    spotId: v.optional(v.id("spots")),
    customLocation: v.optional(v.string()),
    sessionDate: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    rating: v.optional(v.number()),
    sessionNotes: v.optional(v.string()),
    conditionNotes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify session
    const userId = await verifySessionAndGetUserId(ctx, args.sessionToken);
    
    // Get entry
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new Error("Entry not found");
    }
    
    // Verify user owns this entry
    if (entry.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Validate sport if provided
    if (args.sport !== undefined) {
      if (!JOURNAL_SPORTS.includes(args.sport)) {
        throw new Error(`Sport must be one of: ${JOURNAL_SPORTS.join(", ")}`);
      }
    }
    
    // Validate location if both provided or neither provided
    if (args.spotId !== undefined && args.customLocation !== undefined) {
      throw new Error("Cannot provide both spotId and customLocation");
    }
    
    // Validate rating if provided
    if (args.rating !== undefined) {
      if (args.rating < 1 || args.rating > 5 || !Number.isInteger(args.rating)) {
        throw new Error("Rating must be an integer between 1 and 5");
      }
    }
    
    // Validate duration if provided
    if (args.durationMinutes !== undefined) {
      if (args.durationMinutes <= 0 || args.durationMinutes > 480) {
        throw new Error("Duration must be between 1 and 480 minutes (8 hours)");
      }
    }
    
    // Build update object (only include provided fields)
    const updates: any = {
      updatedAt: Date.now(),
    };
    
    if (args.sport !== undefined) updates.sport = args.sport;
    if (args.spotId !== undefined) {
      updates.spotId = args.spotId;
      updates.customLocation = undefined;
    }
    if (args.customLocation !== undefined) {
      updates.customLocation = args.customLocation;
      updates.spotId = undefined;
    }
    if (args.sessionDate !== undefined) updates.sessionDate = args.sessionDate;
    if (args.durationMinutes !== undefined) updates.durationMinutes = args.durationMinutes;
    if (args.rating !== undefined) updates.rating = args.rating;
    if (args.sessionNotes !== undefined) updates.sessionNotes = args.sessionNotes;
    if (args.conditionNotes !== undefined) updates.conditionNotes = args.conditionNotes;
    
    // NOTE: forecastSlotIds is NOT updated - it stays as captured at creation
    
    await ctx.db.patch(args.entryId, updates);
    
    return null;
  },
});

/**
 * Delete a session entry
 */
export const deleteEntry = mutation({
  args: {
    sessionToken: v.string(),
    entryId: v.id("session_entries"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify session
    const userId = await verifySessionAndGetUserId(ctx, args.sessionToken);
    
    // Get entry
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new Error("Entry not found");
    }
    
    // Verify user owns this entry
    if (entry.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Delete entry
    await ctx.db.delete(args.entryId);
    
    return null;
  },
});

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get forecast slots for a spot within a time window (for preview)
 * Searches across all scrapes, not just the most recent
 */
export const getForecastSlotsForTimeWindow = query({
  args: {
    spotId: v.id("spots"),
    startTime: v.number(),
    endTime: v.number(),
  },
  returns: v.array(v.object({
    _id: v.id("forecast_slots"),
    timestamp: v.number(),
    speed: v.number(),
    gust: v.number(),
    direction: v.number(),
    waveHeight: v.optional(v.number()),
    wavePeriod: v.optional(v.number()),
    waveDirection: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    const uniqueSlots = await getSlotsOverlappingTimeWindow(
      ctx,
      args.spotId,
      args.startTime,
      args.endTime
    );

    return uniqueSlots.map((slot) => ({
      _id: slot._id,
      timestamp: slot.timestamp,
      speed: slot.speed,
      gust: slot.gust,
      direction: slot.direction,
      waveHeight: slot.waveHeight,
      wavePeriod: slot.wavePeriod,
      waveDirection: slot.waveDirection,
    }));
  },
});

/**
 * Get all entries for the current user (list view - lightweight)
 */
export const listEntries = query({
  args: {
    sessionToken: v.string(),
    sport: v.optional(v.string()), // Filter by sport (optional)
    limit: v.optional(v.number()), // Default 20
  },
  returns: v.object({
    entries: v.array(v.object({
      _id: v.id("session_entries"),
      sport: v.string(),
      spotId: v.optional(v.id("spots")),
      spotName: v.optional(v.string()),
      customLocation: v.optional(v.string()),
      sessionDate: v.number(),
      durationMinutes: v.number(),
      rating: v.number(),
      sessionNotes: v.optional(v.string()),
      conditionNotes: v.optional(v.string()),
      hasForecastData: v.boolean(),
      createdAt: v.number(),
    })),
  }),
  handler: async (ctx, args) => {
    // Verify session
    const userId = await verifySessionAndGetUserId(ctx, args.sessionToken);
    
    // Build query
    let query = ctx.db
      .query("session_entries")
      .withIndex("by_user_date", (q) => q.eq("userId", userId));
    
    // Collect all entries (we'll filter and sort in memory)
    let entries = await query.collect();
    
    // Filter by sport if provided
    if (args.sport) {
      entries = entries.filter(e => e.sport === args.sport);
    }
    
    // Sort by sessionDate desc (most recent first)
    entries.sort((a, b) => b.sessionDate - a.sessionDate);
    
    // Apply limit
    const limit = args.limit || 20;
    entries = entries.slice(0, limit);
    
    // Join with spots table for spot names
    const result = await Promise.all(
      entries.map(async (entry) => {
        let spotName: string | undefined = undefined;
        if (entry.spotId) {
          const spot = await ctx.db.get(entry.spotId);
          spotName = spot?.name;
        }
        
        return {
          _id: entry._id,
          sport: entry.sport,
          spotId: entry.spotId,
          spotName,
          customLocation: entry.customLocation,
          sessionDate: entry.sessionDate,
          durationMinutes: entry.durationMinutes,
          rating: entry.rating,
          sessionNotes: entry.sessionNotes,
          conditionNotes: entry.conditionNotes,
          hasForecastData: entry.forecastSlotIds !== undefined && entry.forecastSlotIds.length > 0,
          createdAt: entry.createdAt,
        };
      })
    );
    
    return { entries: result };
  },
});

/**
 * Get a single entry by ID (detail view - includes full forecast data)
 */
export const getEntry = query({
  args: {
    sessionToken: v.string(),
    entryId: v.id("session_entries"),
  },
  returns: v.union(
    v.object({
      _id: v.id("session_entries"),
      sport: v.string(),
      spotId: v.optional(v.id("spots")),
      spotName: v.optional(v.string()),
      customLocation: v.optional(v.string()),
      sessionDate: v.number(),
      durationMinutes: v.number(),
      rating: v.number(),
      sessionNotes: v.optional(v.string()),
      conditionNotes: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      // Full forecast data from linked slots
      forecastSlots: v.array(v.object({
        _id: v.id("forecast_slots"),
        timestamp: v.number(),
        speed: v.number(),
        gust: v.number(),
        direction: v.number(),
        waveHeight: v.optional(v.number()),
        wavePeriod: v.optional(v.number()),
        waveDirection: v.optional(v.number()),
        // Condition score for this slot+sport (if exists)
        score: v.optional(v.object({
          value: v.number(),
          reasoning: v.string(),
        })),
      })),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Verify session
    const userId = await verifySessionAndGetUserId(ctx, args.sessionToken);
    
    // Get entry
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      return null;
    }
    
    // Verify user owns entry
    if (entry.userId !== userId) {
      return null;
    }
    
    // Get spot name if applicable
    let spotName: string | undefined = undefined;
    if (entry.spotId) {
      const spot = await ctx.db.get(entry.spotId);
      spotName = spot?.name;
    }
    
    // Fetch forecast slots and scores if available
    const forecastSlots: any[] = [];
    
    // Helper function to find slots by timestamp (fallback method)
    const findSlotsByTimestamp = async () => {
      if (!entry.spotId) return;
      
      const sessionEnd = entry.sessionDate + (entry.durationMinutes * 60 * 1000);
      const searchStart = entry.sessionDate - (60 * 60 * 1000);

      const uniqueSlots = await getSlotsOverlappingTimeWindow(
        ctx,
        entry.spotId!,
        searchStart,
        sessionEnd
      );

      if (uniqueSlots.length === 0) return;

      // Get scores for these slots.
      //
      // By (spot, sport, timestamp) rather than slotId: system scores are now
      // one row per hour rather than one per scrape, so a slotId lookup would
      // find nothing for any slot but the last one scored. This is also strictly
      // better for old entries — slots are archived after 48h, so a session's
      // comparison used to blank out once its slot row left the table.
      for (const slot of uniqueSlots) {
        const scores = await ctx.db
          .query("condition_scores")
          .withIndex("by_spot_sport_timestamp", (q) =>
            q.eq("spotId", slot.spotId)
             .eq("sport", entry.sport)
             .eq("timestamp", slot.timestamp)
          )
          .collect();

        const score = scores.find(s => s.userId === null) || scores[0] || null;

        forecastSlots.push({
          _id: slot._id,
          timestamp: slot.timestamp,
          speed: slot.speed,
          gust: slot.gust,
          direction: slot.direction,
          waveHeight: slot.waveHeight,
          wavePeriod: slot.wavePeriod,
          waveDirection: slot.waveDirection,
          score: score ? {
            value: score.score,
            reasoning: score.reasoning,
          } : undefined,
        });
      }
    };
    
    if (entry.forecastSlotIds && entry.forecastSlotIds.length > 0) {
      // First, try to get slots by ID
      const slotsById: any[] = [];
      for (const slotId of entry.forecastSlotIds) {
        const slot = await ctx.db.get(slotId);
        if (slot) {
          slotsById.push(slot);
        }
      }
      
      // If we found slots by ID, use them
      if (slotsById.length > 0) {
        for (const slot of slotsById) {
          // Get condition score for this slot+sport, keyed by the hour rather
          // than the slot document — see the note on the other lookup above.
          const scores = await ctx.db
            .query("condition_scores")
            .withIndex("by_spot_sport_timestamp", (q) =>
              q.eq("spotId", slot.spotId)
               .eq("sport", entry.sport)
               .eq("timestamp", slot.timestamp)
            )
            .collect();

          // Use system score (userId: null) or first available
          const score = scores.find(s => s.userId === null) || scores[0] || null;
          
          forecastSlots.push({
            _id: slot._id,
            timestamp: slot.timestamp,
            speed: slot.speed,
            gust: slot.gust,
            direction: slot.direction,
            waveHeight: slot.waveHeight,
            wavePeriod: slot.wavePeriod,
            waveDirection: slot.waveDirection,
            score: score ? {
              value: score.score,
              reasoning: score.reasoning,
            } : undefined,
          });
        }
      } else {
        // Fallback: if slots by ID weren't found, try to find slots by timestamp
        await findSlotsByTimestamp();
      }
    } else if (entry.spotId) {
      // If no forecastSlotIds stored at all, try to find slots by timestamp
      // This handles entries created before forecast linking was implemented
      await findSlotsByTimestamp();
    }
    
    return {
      _id: entry._id,
      sport: entry.sport,
      spotId: entry.spotId,
      spotName,
      customLocation: entry.customLocation,
      sessionDate: entry.sessionDate,
      durationMinutes: entry.durationMinutes,
      rating: entry.rating,
      sessionNotes: entry.sessionNotes,
      conditionNotes: entry.conditionNotes,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      forecastSlots,
    };
  },
});
