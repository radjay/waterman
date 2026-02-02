import { query, mutation, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import crypto from "crypto";
import { Id } from "./_generated/dataModel";

/**
 * Verify admin authentication
 * Checks if the provided session token is valid
 */
function verifyAdmin(sessionToken: string | null): boolean {
  if (!sessionToken) return false;
  
  // In V1, we use a simple password-based system
  // The session token should match the ADMIN_PASSWORD from environment
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error("ADMIN_PASSWORD environment variable not set");
    return false;
  }
  
  // For V1, we'll use a simple comparison
  // In production, use a proper session token system
  return sessionToken === adminPassword;
}

/**
 * Authenticate admin user
 * Returns a session token if password is correct
 */
export const authenticate = action({
  args: {
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new Error("Admin authentication not configured");
    }
    
    if (args.password !== adminPassword) {
      throw new Error("Invalid password");
    }
    
    // For V1, return the password as the session token
    // In production, generate a proper JWT or session token
    return { sessionToken: adminPassword };
  },
});

/**
 * Verify admin session
 */
export const verifyAdminSession = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    return { isAuthenticated: verifyAdmin(args.sessionToken) };
  },
});

// ============================================================================
// SPOT MANAGEMENT
// ============================================================================

/**
 * List all spots (admin only)
 */
export const listSpots = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    const spots = await ctx.db.query("spots").collect();
    return spots;
  },
});

/**
 * Get a single spot (admin only)
 */
export const getSpot = query({
  args: {
    sessionToken: v.string(),
    spotId: v.id("spots"),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    return await ctx.db.get(args.spotId);
  },
});

/**
 * Create a new spot (admin only)
 */
export const createSpot = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    url: v.string(),
    country: v.optional(v.string()),
    town: v.optional(v.string()),
    windySpotId: v.optional(v.string()),
    sports: v.optional(v.array(v.string())),
    webcamUrl: v.optional(v.string()),
    webcamStreamSource: v.optional(v.string()),
    liveReportUrl: v.optional(v.string()),
    webcamOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    const spotId = await ctx.db.insert("spots", {
      name: args.name,
      url: args.url,
      country: args.country,
      town: args.town,
      windySpotId: args.windySpotId,
      sports: args.sports,
      webcamUrl: args.webcamUrl,
      webcamStreamSource: args.webcamStreamSource,
      liveReportUrl: args.liveReportUrl,
      webcamOnly: args.webcamOnly,
    });
    
    return { spotId };
  },
});

/**
 * Update a spot (admin only)
 */
export const updateSpot = mutation({
  args: {
    sessionToken: v.string(),
    spotId: v.id("spots"),
    name: v.optional(v.string()),
    url: v.optional(v.string()),
    country: v.optional(v.string()),
    town: v.optional(v.string()),
    windySpotId: v.optional(v.string()),
    sports: v.optional(v.array(v.string())),
    webcamUrl: v.optional(v.string()),
    webcamStreamSource: v.optional(v.string()),
    liveReportUrl: v.optional(v.string()),
    webcamOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    const { sessionToken, spotId, ...updates } = args;
    
    // Build updates object - include all non-undefined values
    // For booleans, explicitly include false values
    const cleanUpdates: any = {};
    Object.keys(updates).forEach(key => {
      const value = updates[key as keyof typeof updates];
      // Include the value if it's not undefined
      // This allows setting booleans to false explicitly
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    });
    
    await ctx.db.patch(spotId, cleanUpdates);
    return { success: true };
  },
});

/**
 * Delete a spot and all associated data (admin only)
 */
export const deleteSpot = mutation({
  args: {
    sessionToken: v.string(),
    spotId: v.id("spots"),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    // Delete all associated data (cascading deletes)
    
    // 1. Delete spot configs
    const configs = await ctx.db
      .query("spotConfigs")
      .filter(q => q.eq(q.field("spotId"), args.spotId))
      .collect();
    for (const config of configs) {
      await ctx.db.delete(config._id);
    }
    
    // 2. Delete forecast slots
    const slots = await ctx.db
      .query("forecast_slots")
      .withIndex("by_spot", q => q.eq("spotId", args.spotId))
      .collect();
    for (const slot of slots) {
      await ctx.db.delete(slot._id);
    }
    
    // 3. Delete tides
    const tides = await ctx.db
      .query("tides")
      .withIndex("by_spot", q => q.eq("spotId", args.spotId))
      .collect();
    for (const tide of tides) {
      await ctx.db.delete(tide._id);
    }
    
    // 4. Delete scrapes
    const scrapes = await ctx.db
      .query("scrapes")
      .withIndex("by_spot_and_timestamp", q => q.eq("spotId", args.spotId))
      .collect();
    for (const scrape of scrapes) {
      await ctx.db.delete(scrape._id);
    }
    
    // 5. Delete scoring prompts
    const prompts = await ctx.db
      .query("scoring_prompts")
      .withIndex("by_spot_sport", q => q.eq("spotId", args.spotId))
      .collect();
    for (const prompt of prompts) {
      await ctx.db.delete(prompt._id);
    }
    
    // 6. Delete condition scores
    const scores = await ctx.db
      .query("condition_scores")
      .withIndex("by_spot_timestamp_sport", q => q.eq("spotId", args.spotId))
      .collect();
    for (const score of scores) {
      await ctx.db.delete(score._id);
    }
    
    // 7. Finally, delete the spot itself
    await ctx.db.delete(args.spotId);
    
    return { success: true };
  },
});

/**
 * Get spot configs for a spot (admin only)
 */
export const getSpotConfigs = query({
  args: {
    sessionToken: v.string(),
    spotId: v.id("spots"),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    const configs = await ctx.db
      .query("spotConfigs")
      .filter(q => q.eq(q.field("spotId"), args.spotId))
      .collect();
    
    return configs;
  },
});

/**
 * Create or update a spot config (admin only)
 */
export const upsertSpotConfig = mutation({
  args: {
    sessionToken: v.string(),
    spotId: v.id("spots"),
    sport: v.string(),
    minSpeed: v.optional(v.number()),
    minGust: v.optional(v.number()),
    directionFrom: v.optional(v.number()),
    directionTo: v.optional(v.number()),
    minSwellHeight: v.optional(v.number()),
    maxSwellHeight: v.optional(v.number()),
    swellDirectionFrom: v.optional(v.number()),
    swellDirectionTo: v.optional(v.number()),
    minPeriod: v.optional(v.number()),
    optimalTide: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    const { sessionToken, spotId, sport, ...configFields } = args;
    
    // Check if config already exists
    const existing = await ctx.db
      .query("spotConfigs")
      .filter(q => 
        q.and(
          q.eq(q.field("spotId"), spotId),
          q.eq(q.field("sport"), sport)
        )
      )
      .first();
    
    const cleanConfig: any = {
      spotId,
      sport,
    };
    
    // Add only defined fields
    Object.keys(configFields).forEach(key => {
      const value = configFields[key as keyof typeof configFields];
      if (value !== undefined) {
        cleanConfig[key] = value;
      }
    });
    
    if (existing) {
      await ctx.db.patch(existing._id, cleanConfig);
      return { configId: existing._id, isNew: false };
    } else {
      const configId = await ctx.db.insert("spotConfigs", cleanConfig);
      return { configId, isNew: true };
    }
  },
});

/**
 * Delete a spot config (admin only)
 */
export const deleteSpotConfig = mutation({
  args: {
    sessionToken: v.string(),
    configId: v.id("spotConfigs"),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.delete(args.configId);
    return { success: true };
  },
});

// ============================================================================
// PROMPT MANAGEMENT
// ============================================================================

/**
 * List all system sport prompts (admin only)
 */
export const listSystemSportPrompts = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    const prompts = await ctx.db.query("system_sport_prompts").collect();
    return prompts;
  },
});

/**
 * Create or update a system sport prompt (admin only)
 */
export const upsertSystemSportPrompt = mutation({
  args: {
    sessionToken: v.string(),
    sport: v.string(),
    prompt: v.string(),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    const existing = await ctx.db
      .query("system_sport_prompts")
      .withIndex("by_sport", q => q.eq("sport", args.sport))
      .first();
    
    const now = Date.now();
    const promptData: any = {
      sport: args.sport,
      prompt: args.prompt,
      isActive: args.isActive !== undefined ? args.isActive : true,
      updatedAt: now,
    };
    
    if (existing) {
      // Archive the old prompt to history before updating
      await ctx.db.insert("system_prompt_history", {
        sport: existing.sport,
        prompt: existing.prompt,
        isActive: existing.isActive,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
        replacedAt: now,
        replacedByPromptId: existing._id, // Will point to the updated prompt
      });

      await ctx.db.patch(existing._id, promptData);
      return { promptId: existing._id, isNew: false };
    } else {
      promptData.createdAt = now;
      const promptId = await ctx.db.insert("system_sport_prompts", promptData);
      return { promptId, isNew: true };
    }
  },
});

/**
 * List spot-sport prompts (admin only)
 */
export const listSpotSportPrompts = query({
  args: {
    sessionToken: v.string(),
    spotId: v.optional(v.id("spots")),
    sport: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    let query = ctx.db.query("scoring_prompts");
    
    // Filter by spotId if provided
    if (args.spotId) {
      query = query.filter(q => q.eq(q.field("spotId"), args.spotId));
    }
    
    // Filter by sport if provided
    if (args.sport) {
      query = query.filter(q => q.eq(q.field("sport"), args.sport));
    }
    
    // Only get system prompts (userId is null)
    const allPrompts = await query.collect();
    return allPrompts.filter(p => p.userId === null);
  },
});

/**
 * Get a single spot-sport prompt (admin only)
 */
export const getSpotSportPrompt = query({
  args: {
    sessionToken: v.string(),
    spotId: v.id("spots"),
    sport: v.string(),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    return await ctx.db
      .query("scoring_prompts")
      .withIndex("by_spot_sport", q => 
        q.eq("spotId", args.spotId).eq("sport", args.sport)
      )
      .filter(q => q.eq(q.field("userId"), null))
      .first();
  },
});

/**
 * Create or update a spot-sport prompt (admin only)
 */
export const upsertSpotSportPrompt = mutation({
  args: {
    sessionToken: v.string(),
    spotId: v.id("spots"),
    sport: v.string(),
    spotPrompt: v.string(),
    temporalPrompt: v.string(),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    const existing = await ctx.db
      .query("scoring_prompts")
      .withIndex("by_spot_sport", q => 
        q.eq("spotId", args.spotId).eq("sport", args.sport)
      )
      .filter(q => q.eq(q.field("userId"), null))
      .first();
    
    const now = Date.now();
    const promptData: any = {
      spotId: args.spotId,
      sport: args.sport,
      userId: null, // System prompt
      spotPrompt: args.spotPrompt,
      temporalPrompt: args.temporalPrompt,
      isActive: args.isActive !== undefined ? args.isActive : true,
      updatedAt: now,
    };
    
    if (existing) {
      // Archive the old prompt to history before updating
      await ctx.db.insert("prompt_history", {
        spotId: existing.spotId,
        sport: existing.sport,
        userId: existing.userId,
        spotPrompt: existing.spotPrompt,
        temporalPrompt: existing.temporalPrompt,
        isActive: existing.isActive,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
        replacedAt: now,
        replacedByPromptId: existing._id, // Will point to the updated prompt
      });

      await ctx.db.patch(existing._id, promptData);
      return { promptId: existing._id, isNew: false };
    } else {
      promptData.createdAt = now;
      const promptId = await ctx.db.insert("scoring_prompts", promptData);
      return { promptId, isNew: true };
    }
  },
});

/**
 * Delete a spot-sport prompt (admin only)
 */
export const deleteSpotSportPrompt = mutation({
  args: {
    sessionToken: v.string(),
    promptId: v.id("scoring_prompts"),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.delete(args.promptId);
    return { success: true };
  },
});

// ============================================================================
// KPIs & MONITORING
// ============================================================================

/**
 * Get KPIs (admin only)
 */
export const getKPIs = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    const now = Date.now();
    const todayStart = new Date(now).setHours(0, 0, 0, 0);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    // Get all spots
    const spots = await ctx.db.query("spots").collect();
    
    // Get most recent scrape per spot
    const mostRecentScrapes: Record<string, number> = {};
    for (const spot of spots) {
      const scrapes = await ctx.db
        .query("scrapes")
        .withIndex("by_spot_and_timestamp", q => q.eq("spotId", spot._id))
        .order("desc")
        .take(1);
      
      if (scrapes.length > 0) {
        mostRecentScrapes[spot._id] = scrapes[0].scrapeTimestamp;
      }
    }
    
    // Get scrape stats for today - query per spot with limits to avoid reading too many documents
    const todayScrapes: any[] = [];
    for (const spot of spots) {
      // Get recent scrapes for this spot (limit to last 50 to avoid reading too many)
      const spotScrapes = await ctx.db
        .query("scrapes")
        .withIndex("by_spot_and_timestamp", q => q.eq("spotId", spot._id))
        .order("desc")
        .take(50);
      
      // Filter for today's scrapes
      const spotTodayScrapes = spotScrapes.filter(s => s.scrapeTimestamp >= todayStart);
      todayScrapes.push(...spotTodayScrapes);
    }
    const successfulScrapes = todayScrapes.filter(s => s.isSuccessful);
    const failedScrapes = todayScrapes.filter(s => !s.isSuccessful);
    
    // Get scoring stats for today - query per spot with limits
    const todayScores: any[] = [];
    for (const spot of spots) {
      // Get recent scores for this spot (limit to last 100 to avoid reading too many)
      const spotScores = await ctx.db
        .query("condition_scores")
        .withIndex("by_spot_timestamp_sport", q => q.eq("spotId", spot._id))
        .order("desc")
        .take(100);
      
      // Filter for today's scores
      const spotTodayScores = spotScores.filter(s => s.scoredAt >= todayStart);
      todayScores.push(...spotTodayScores);
    }
    
    // Get data volume (last 7 days) - query per spot with limits
    let recentSlotsCount = 0;
    for (const spot of spots) {
      // Get recent slots for this spot (limit to last 200 to avoid reading too many)
      const spotSlots = await ctx.db
        .query("forecast_slots")
        .withIndex("by_spot", q => q.eq("spotId", spot._id))
        .order("desc")
        .take(200);
      
      // Filter for last 7 days
      const spotRecentSlots = spotSlots.filter(s => 
        s.scrapeTimestamp && s.scrapeTimestamp >= sevenDaysAgo
      );
      recentSlotsCount += spotRecentSlots.length;
    }
    
    // Get scores from last 7 days - query per spot with limits
    let recentScoresCount = 0;
    for (const spot of spots) {
      // Get recent scores for this spot (limit to last 200 to avoid reading too many)
      const spotScores = await ctx.db
        .query("condition_scores")
        .withIndex("by_spot_timestamp_sport", q => q.eq("spotId", spot._id))
        .order("desc")
        .take(200);
      
      // Filter for last 7 days
      const spotRecentScores = spotScores.filter(s => s.scoredAt >= sevenDaysAgo);
      recentScoresCount += spotRecentScores.length;
    }
    
    // Count stale spots (no scrape in last 24 hours)
    const staleThreshold = now - (24 * 60 * 60 * 1000);
    const staleSpots = spots.filter(spot => {
      const lastScrape = mostRecentScrapes[spot._id];
      return !lastScrape || lastScrape < staleThreshold;
    });
    
    return {
      dataFreshness: {
        staleSpotsCount: staleSpots.length,
        mostRecentScrapes,
      },
      scraping: {
        totalToday: todayScrapes.length,
        successfulToday: successfulScrapes.length,
        failedToday: failedScrapes.length,
        successRate: todayScrapes.length > 0 
          ? (successfulScrapes.length / todayScrapes.length) * 100 
          : 0,
      },
      scoring: {
        totalToday: todayScores.length,
      },
      dataVolume: {
        totalSpots: spots.length,
        slotsLast7Days: recentSlotsCount,
        scoresLast7Days: recentScoresCount,
      },
    };
  },
});

/**
 * Get scrape stats (admin only)
 */
export const getScrapeStats = query({
  args: {
    sessionToken: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    let scrapes = await ctx.db.query("scrapes").collect();
    
    if (args.startDate) {
      scrapes = scrapes.filter(s => s.scrapeTimestamp >= args.startDate!);
    }
    if (args.endDate) {
      scrapes = scrapes.filter(s => s.scrapeTimestamp <= args.endDate!);
    }
    
    const successful = scrapes.filter(s => s.isSuccessful);
    const failed = scrapes.filter(s => !s.isSuccessful);
    
    return {
      total: scrapes.length,
      successful: successful.length,
      failed: failed.length,
      successRate: scrapes.length > 0 ? (successful.length / scrapes.length) * 100 : 0,
      scrapes: scrapes.sort((a, b) => b.scrapeTimestamp - a.scrapeTimestamp),
    };
  },
});

/**
 * Get scrapes with filters (admin only)
 */
export const getScrapes = query({
  args: {
    sessionToken: v.string(),
    spotId: v.optional(v.id("spots")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    let scrapes = await ctx.db.query("scrapes").collect();
    
    if (args.spotId) {
      scrapes = scrapes.filter(s => s.spotId === args.spotId);
    }
    if (args.startDate) {
      scrapes = scrapes.filter(s => s.scrapeTimestamp >= args.startDate!);
    }
    if (args.endDate) {
      scrapes = scrapes.filter(s => s.scrapeTimestamp <= args.endDate!);
    }
    
    // Sort by timestamp descending
    scrapes.sort((a, b) => b.scrapeTimestamp - a.scrapeTimestamp);
    
    // Apply limit
    if (args.limit) {
      scrapes = scrapes.slice(0, args.limit);
    }
    
    return scrapes;
  },
});

/**
 * Get scoring logs (admin only)
 */
export const getScoringLogs = query({
  args: {
    sessionToken: v.string(),
    spotId: v.optional(v.id("spots")),
    sport: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    let scores = await ctx.db.query("condition_scores").collect();
    
    if (args.spotId) {
      scores = scores.filter(s => s.spotId === args.spotId);
    }
    if (args.sport) {
      scores = scores.filter(s => s.sport === args.sport);
    }
    if (args.startDate) {
      scores = scores.filter(s => s.scoredAt >= args.startDate!);
    }
    if (args.endDate) {
      scores = scores.filter(s => s.scoredAt <= args.endDate!);
    }
    
    // Sort by scoredAt descending
    scores.sort((a, b) => b.scoredAt - a.scoredAt);
    
    // Apply limit
    if (args.limit) {
      scores = scores.slice(0, args.limit);
    }
    
    return scores;
  },
});

// ============================================================================
// MANUAL OPERATIONS
// ============================================================================

/**
 * Trigger scraping for selected spots (admin only)
 */
export const triggerScrape = action({
  args: {
    sessionToken: v.string(),
    spotIds: v.optional(v.array(v.id("spots"))),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    // Get spots to scrape
    let spots;
    if (args.spotIds && args.spotIds.length > 0) {
      spots = await Promise.all(
        args.spotIds.map(id => ctx.runQuery(api.spots.getSpotById, { spotId: id }))
      );
      spots = spots.filter(s => s !== null);
    } else {
      spots = await ctx.runQuery(api.spots.list, {});
    }
    
    const results = [];
    
    for (const spot of spots) {
      if (!spot) continue;
      
      try {
        const scrapeTimestamp = Date.now();
        
        // Use stored windySpotId if available, otherwise extract from URL
        const windySpotId = spot.windySpotId || extractSpotId(spot.url);
        if (!windySpotId) {
          results.push({
            spotId: spot._id,
            spotName: spot.name,
            success: false,
            error: "Could not determine Windy Spot ID",
          });
          continue;
        }
        
        // Fetch data from Windy API directly
        const apiUrl = `https://windy.app/widget/data.php?id=wfwindyapp&spotID=${windySpotId}&timelineRange=future`;
        const response = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Referer': `https://windy.app/forecast2/spot/${windySpotId}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        const jsonMatch = text.match(/window\.wfwindyapp\s*=\s*({[\s\S]+?})(?:;|$)/);
        if (!jsonMatch) {
          throw new Error('Could not extract JSON from API response');
        }
        
        const data = JSON.parse(jsonMatch[1]);
        const forecastData = JSON.parse(data.data);
        const tideData = data.tides ? JSON.parse(data.tides) : [];
        
        // Transform API data to our format
        const now = Date.now();
        const slots = [];
        const tides = [];
        
        for (const slot of forecastData) {
          const timestamp = slot.timestamp * 1000;
          if (timestamp < now) continue;
          
          const date = new Date(timestamp);
          const hour = date.getHours();
          if (hour < 9 || hour > 18) continue; // Daylight hours only
          
          const speedKnots = (slot.windSpeed || 0) * 1.94384;
          const gustKnots = (slot.windGust || 0) * 1.94384;
          
          slots.push({
            timestamp,
            speed: Math.round(speedKnots * 10) / 10,
            gust: Math.round(gustKnots * 10) / 10,
            direction: slot.windDirection || 0,
            waveHeight: slot.wavesHeight || 0,
            wavePeriod: slot.wavesPeriod || 0,
            waveDirection: slot.wavesDirection || 0,
          });
        }
        
        // Process tide data
        if (tideData.length >= 5) {
          const sortedTides = tideData
            .map(t => ({
              time: t.timestamp * 1000,
              height: t.tideHeight,
            }))
            .filter(t => t.time >= now)
            .sort((a, b) => a.time - b.time);
          
          const WINDOW = 3;
          for (let i = WINDOW; i < sortedTides.length - WINDOW; i++) {
            const current = sortedTides[i];
            const before = sortedTides.slice(i - WINDOW, i);
            const after = sortedTides.slice(i + 1, i + WINDOW + 1);
            
            const avgBefore = before.reduce((sum, t) => sum + t.height, 0) / before.length;
            const avgAfter = after.reduce((sum, t) => sum + t.height, 0) / after.length;
            
            if (current.height > avgBefore && current.height > avgAfter) {
              tides.push({ time: current.time, type: "high", height: current.height });
            } else if (current.height < avgBefore && current.height < avgAfter) {
              tides.push({ time: current.time, type: "low", height: current.height });
            }
          }
        }
        
        // Save forecast slots
        const saveResult = await ctx.runMutation(api.spots.saveForecastSlots, {
          spotId: spot._id,
          scrapeTimestamp,
          slots,
        });
        
        // Save tides
        if (tides.length > 0) {
          await ctx.runMutation(api.spots.saveTides, {
            spotId: spot._id,
            scrapeTimestamp,
            tides,
          });
        }
        
        results.push({
          spotId: spot._id,
          spotName: spot.name,
          success: saveResult.isSuccessful,
          slotsCount: slots.length,
          tidesCount: tides.length,
        });
      } catch (error: any) {
        results.push({
          spotId: spot._id,
          spotName: spot.name,
          success: false,
          error: error.message || "Unknown error",
        });
      }
    }
    
    return {
      total: spots.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  },
});

/**
 * Helper function to extract spot ID from URL
 */
function extractSpotId(url: string): string | null {
  const match = url.match(/\/spot\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Trigger scoring for unscored slots (admin only)
 */
export const triggerScoring = action({
  args: {
    sessionToken: v.string(),
    spotIds: v.optional(v.array(v.id("spots"))),
    sports: v.optional(v.array(v.string())),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    // Get spots to score
    let spots;
    if (args.spotIds && args.spotIds.length > 0) {
      spots = await Promise.all(
        args.spotIds.map(id => ctx.runQuery(api.spots.getSpotById, { spotId: id }))
      );
      spots = spots.filter(s => s !== null);
    } else {
      spots = await ctx.runQuery(api.spots.list, {});
    }
    
    // Get all slots for these spots
    const allSlots = [];
    for (const spot of spots) {
      if (!spot) continue;
      const slots = await ctx.runQuery(api.spots.getForecastSlots, { spotId: spot._id });
      // Ensure each slot has spotId (should already be in DB, but ensure it's set)
      allSlots.push(...slots.map(s => ({ 
        ...s, 
        spotId: s.spotId || spot._id // Use slot's spotId if present, otherwise use spot._id
      })));
    }
    
    // Filter by date range if provided
    let filteredSlots = allSlots;
    if (args.startDate) {
      filteredSlots = filteredSlots.filter(s => s.timestamp >= args.startDate!);
    }
    if (args.endDate) {
      filteredSlots = filteredSlots.filter(s => s.timestamp <= args.endDate!);
    }
    
    // Get sports to score
    const sportsToScore = args.sports || ["wingfoil", "surfing"];
    
    // Find unscored slots
    const unscoredSlots = [];
    for (const slot of filteredSlots) {
      for (const sport of sportsToScore) {
        // Check if score already exists for this specific slot-sport combination
        const existingScore = await ctx.runQuery(api.spots.getConditionScoreBySlot, {
          slotId: slot._id,
          sport,
        });
        
        if (!existingScore) {
          unscoredSlots.push({ slot, sport });
        }
      }
    }
    
    // Score the unscored slots
    const results = [];
    for (const { slot, sport } of unscoredSlots) {
      try {
        // Ensure spotId is set (should be from DB, but double-check)
        if (!slot.spotId) {
          throw new Error(`Slot ${slot._id} is missing spotId`);
        }
        
        // Call the existing scoreSingleSlot action
        await ctx.scheduler.runAfter(0, api.spots.scoreSingleSlot, {
          slotId: slot._id,
          sport,
          spotId: slot.spotId,
        });
        
        results.push({
          slotId: slot._id,
          spotId: slot.spotId,
          sport,
          success: true,
        });
      } catch (error: any) {
        results.push({
          slotId: slot._id,
          spotId: slot.spotId,
          sport,
          success: false,
          error: error.message || "Unknown error",
        });
      }
    }
    
    return {
      total: unscoredSlots.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  },
});

/**
 * Update all spots to have country = "Portugal" (admin only)
 */
export const updateAllSpotsToPortugal = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    const spots = await ctx.db.query("spots").collect();
    let updated = 0;
    
    for (const spot of spots) {
      await ctx.db.patch(spot._id, {
        country: "Portugal",
      });
      updated++;
    }
    
    return { updated, total: spots.length };
  },
});

// ============================================================================
// SCORING DEBUG & PROVENANCE
// ============================================================================

/**
 * Save scoring log for provenance tracking (internal use only)
 */
export const saveScoringLog = internalMutation({
  args: {
    scoreId: v.id("condition_scores"),
    slotId: v.id("forecast_slots"),
    spotId: v.id("spots"),
    sport: v.string(),
    userId: v.union(v.string(), v.null()),
    timestamp: v.number(),
    systemPrompt: v.string(),
    userPrompt: v.string(),
    model: v.string(),
    temperature: v.number(),
    maxTokens: v.number(),
    rawResponse: v.string(),
    scoredAt: v.number(),
    durationMs: v.optional(v.number()),
    attempt: v.optional(v.number()),
  },
  returns: v.id("scoring_logs"),
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("scoring_logs", {
      scoreId: args.scoreId,
      slotId: args.slotId,
      spotId: args.spotId,
      sport: args.sport,
      userId: args.userId,
      timestamp: args.timestamp,
      systemPrompt: args.systemPrompt,
      userPrompt: args.userPrompt,
      model: args.model,
      temperature: args.temperature,
      maxTokens: args.maxTokens,
      rawResponse: args.rawResponse,
      scoredAt: args.scoredAt,
      durationMs: args.durationMs,
      attempt: args.attempt,
    });
    return logId;
  },
});

/**
 * Get scoring debug data for a spot-sport-user combination (admin only)
 * Returns forecast slots with their scores, scoring log references, and linked journal entries
 * Shows slots from 72 hours ago to the future for debugging past slots
 */
export const getScoringDebugData = query({
  args: {
    sessionToken: v.string(),
    spotId: v.id("spots"),
    sport: v.string(),
    userId: v.union(v.string(), v.null()), // null = system scores
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    // Get the spot
    const spot = await ctx.db.get(args.spotId);
    if (!spot) {
      throw new Error("Spot not found");
    }
    
    // Get all slots for this spot from the most recent scrape
    const allSlots = await ctx.db
      .query("forecast_slots")
      .withIndex("by_spot", q => q.eq("spotId", args.spotId))
      .collect();
    
    if (allSlots.length === 0) {
      return { spot, slots: [] };
    }
    
    // Show slots from 72 hours ago onwards (past + future)
    // Search across ALL scrapes, not just the most recent, to find historical slots
    const now = Date.now();
    const past72Hours = now - (72 * 60 * 60 * 1000);
    
    // Filter to slots within the time window from any scrape
    let recentSlots = allSlots.filter(
      slot => slot.timestamp >= past72Hours
    ).sort((a, b) => {
      // Sort by timestamp first
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      // If same timestamp, prefer newer scrape (more recent data)
      const aScrape = a.scrapeTimestamp || 0;
      const bScrape = b.scrapeTimestamp || 0;
      return bScrape - aScrape;
    });
    
    // Deduplicate by timestamp (keep the one from the most recent scrape)
    const uniqueSlots: any[] = [];
    const seenTimestamps = new Set<number>();
    for (const slot of recentSlots) {
      if (!seenTimestamps.has(slot.timestamp)) {
        seenTimestamps.add(slot.timestamp);
        uniqueSlots.push(slot);
      }
    }
    recentSlots = uniqueSlots;
    
    // Get all journal entries for this spot+sport (if table exists)
    let journalEntriesBySlot: Map<string, Array<{ userId: string; rating: number; sessionDate: number }>> = new Map();
    try {
      const journalEntries = await ctx.db
        .query("session_entries")
        .withIndex("by_spot", q => q.eq("spotId", args.spotId))
        .filter(q => q.eq(q.field("sport"), args.sport))
        .collect();
      
      // Group entries by the slot they reference
      for (const entry of journalEntries) {
        if (entry.forecastSlotIds) {
          for (const slotId of entry.forecastSlotIds) {
            const slotIdStr = slotId as string;
            if (!journalEntriesBySlot.has(slotIdStr)) {
              journalEntriesBySlot.set(slotIdStr, []);
            }
            journalEntriesBySlot.get(slotIdStr)!.push({
              userId: entry.userId as string,
              rating: entry.rating,
              sessionDate: entry.sessionDate,
            });
          }
        }
      }
    } catch {
      // session_entries table doesn't exist yet - that's fine
    }
    
    // Get scores and scoring logs for these slots
    const result = await Promise.all(
      recentSlots.map(async (slot) => {
        // Get the condition score for this slot-sport-user combination
        const scores = await ctx.db
          .query("condition_scores")
          .withIndex("by_slot_sport", q => 
            q.eq("slotId", slot._id).eq("sport", args.sport)
          )
          .filter(q => q.eq(q.field("userId"), args.userId))
          .collect();
        
        const score = scores[0] || null;
        
        // Get the scoring log if it exists
        let scoringLogId: Id<"scoring_logs"> | null = null;
        if (score) {
          const logs = await ctx.db
            .query("scoring_logs")
            .withIndex("by_score", q => q.eq("scoreId", score._id))
            .collect();
          scoringLogId = logs[0]?._id || null;
        }
        
        // Get journal entries linked to this slot
        const journalEntries = journalEntriesBySlot.get(slot._id as string) || [];
        
        return {
          slot: {
            _id: slot._id,
            timestamp: slot.timestamp,
            speed: slot.speed,
            gust: slot.gust,
            direction: slot.direction,
            waveHeight: slot.waveHeight,
            wavePeriod: slot.wavePeriod,
            waveDirection: slot.waveDirection,
          },
          score: score ? {
            _id: score._id,
            score: score.score,
            reasoning: score.reasoning,
            factors: score.factors,
            scoredAt: score.scoredAt,
            model: score.model,
          } : null,
          scoringLogId,
          journalEntries, // Array of { userId, rating, sessionDate }
        };
      })
    );
    
    return { spot, slots: result };
  },
});

/**
 * Get a scoring log with full prompt/response data (admin only)
 */
export const getScoringLog = query({
  args: {
    sessionToken: v.string(),
    scoringLogId: v.id("scoring_logs"),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    const log = await ctx.db.get(args.scoringLogId);
    if (!log) {
      throw new Error("Scoring log not found");
    }
    
    // Get spot name for display
    const spot = await ctx.db.get(log.spotId);
    
    return {
      ...log,
      spotName: spot?.name || "Unknown Spot",
    };
  },
});

/**
 * Get list of users who have personalized scores for admin dropdown
 */
export const getUsersWithPersonalizedScores = query({
  args: {
    sessionToken: v.string(),
    spotId: v.optional(v.id("spots")),
  },
  handler: async (ctx, args) => {
    if (!verifyAdmin(args.sessionToken)) {
      throw new Error("Unauthorized");
    }
    
    // Get all condition scores with userId not null
    let scores = await ctx.db.query("condition_scores").collect();
    
    // Filter to scores with userId (personalized scores)
    const userIds = [...new Set(
      scores
        .filter(s => s.userId !== null)
        .map(s => s.userId as string)
    )];
    
    // Get user details
    const users = await Promise.all(
      userIds.map(async (userId) => {
        // Try to find the user in the users table
        const allUsers = await ctx.db.query("users").collect();
        const user = allUsers.find(u => u._id === userId);
        return {
          userId,
          email: user?.email || "Unknown",
          name: user?.name,
        };
      })
    );
    
    return users;
  },
});

