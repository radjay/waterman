import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Generate a secure random token for calendar subscriptions
 */
function generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get calendar feed data for a specific sport
 * Supports both authenticated (with token) and anonymous users
 */
export const getSportFeed = query({
    args: {
        sport: v.string(),
        token: v.optional(v.string()),
        spotIds: v.optional(v.array(v.id("spots"))),
    },
    returns: v.object({
        events: v.array(v.object({
            slotId: v.id("forecast_slots"),
            spotId: v.id("spots"),
            spotName: v.string(),
            country: v.optional(v.string()),
            sport: v.string(),
            timestamp: v.number(),
            score: v.number(),
            reasoning: v.string(),
            conditions: v.object({
                speed: v.number(),
                gust: v.number(),
                direction: v.number(),
                waveHeight: v.optional(v.number()),
                wavePeriod: v.optional(v.number()),
                waveDirection: v.optional(v.number()),
            }),
        })),
        metadata: v.object({
            sport: v.string(),
            spotCount: v.number(),
            isPersonalized: v.boolean(),
        }),
    }),
    handler: async (ctx, args) => {
        let targetSpotIds: Id<"spots">[] | null = null;
        let isPersonalized = false;

        // 1. Determine which spots to include
        if (args.spotIds && args.spotIds.length > 0) {
            // Explicit spot filter overrides everything
            targetSpotIds = args.spotIds;
        } else if (args.token) {
            // Look up subscription and get user's favorite spots
            const subscription = await ctx.db
                .query("calendar_subscriptions")
                .withIndex("by_token", (q) => q.eq("token", args.token))
                .filter((q) => q.eq(q.field("sport"), args.sport))
                .first();

            if (subscription && subscription.isActive) {
                // Note: We can't update access tracking in a query
                // This would need to be done via a mutation or action
                // For now, we'll just use the subscription without tracking

                // Get user's favorite spots
                const user = await ctx.db.get(subscription.userId);
                if (user && user.favoriteSpots && user.favoriteSpots.length > 0) {
                    // Filter to spots that support this sport
                    const spots = await Promise.all(
                        user.favoriteSpots.map(spotId => ctx.db.get(spotId))
                    );
                    targetSpotIds = spots
                        .filter((spot): spot is Doc<"spots"> => 
                            spot !== null && 
                            spot.sports !== undefined && 
                            spot.sports.includes(args.sport)
                        )
                        .map(spot => spot._id);
                    isPersonalized = true;
                }
            }
        }

        // 2. Get all spots for this sport if no specific spots determined
        if (targetSpotIds === null) {
            const allSpots = await ctx.db.query("spots").collect();
            targetSpotIds = allSpots
                .filter(spot => spot.sports && spot.sports.includes(args.sport))
                .map(spot => spot._id);
        }

        if (targetSpotIds.length === 0) {
            return {
                events: [],
                metadata: {
                    sport: args.sport,
                    spotCount: 0,
                    isPersonalized,
                },
            };
        }

        // 3. Get condition scores for these spots (score >= 75, next 7 days)
        const now = Date.now();
        const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;

        const allScores = await ctx.db.query("condition_scores").collect();
        const relevantScores = allScores.filter(score =>
            score.sport === args.sport &&
            targetSpotIds!.includes(score.spotId) &&
            score.userId === null && // System scores only
            score.score >= 75 &&
            score.timestamp >= now &&
            score.timestamp <= sevenDaysFromNow
        );

        // 4. Group by day and select best slot per day per spot (max 2 per day)
        interface DaySlots {
            [day: string]: typeof relevantScores;
        }
        
        const slotsByDay: DaySlots = {};
        for (const score of relevantScores) {
            const date = new Date(score.timestamp);
            const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            if (!slotsByDay[dayKey]) {
                slotsByDay[dayKey] = [];
            }
            slotsByDay[dayKey].push(score);
        }

        const selectedScores: typeof relevantScores = [];
        for (const dayKey in slotsByDay) {
            const daySlots = slotsByDay[dayKey];
            
            // Group by spot
            const slotsBySpot = new Map<Id<"spots">, typeof relevantScores>();
            for (const score of daySlots) {
                if (!slotsBySpot.has(score.spotId)) {
                    slotsBySpot.set(score.spotId, []);
                }
                slotsBySpot.get(score.spotId)!.push(score);
            }

            // Get best slot per spot
            const bestPerSpot: typeof relevantScores = [];
            for (const [spotId, scores] of slotsBySpot) {
                const best = scores.reduce((a, b) => a.score > b.score ? a : b);
                bestPerSpot.push(best);
            }

            // Sort by score and take top 2
            bestPerSpot.sort((a, b) => b.score - a.score);
            selectedScores.push(...bestPerSpot.slice(0, 2));
        }

        // 5. Join with forecast_slots and spots to get full data
        const events = await Promise.all(
            selectedScores.map(async (score) => {
                const slot = await ctx.db.get(score.slotId);
                const spot = await ctx.db.get(score.spotId);
                
                if (!slot || !spot) return null;

                return {
                    slotId: score.slotId,
                    spotId: score.spotId,
                    spotName: spot.name,
                    country: spot.country,
                    sport: args.sport,
                    timestamp: score.timestamp,
                    score: score.score,
                    reasoning: score.reasoning,
                    conditions: {
                        speed: slot.speed,
                        gust: slot.gust,
                        direction: slot.direction,
                        waveHeight: slot.waveHeight,
                        wavePeriod: slot.wavePeriod,
                        waveDirection: slot.waveDirection,
                    },
                };
            })
        );

        // Filter out nulls and sort by timestamp
        const validEvents = events.filter((e): e is NonNullable<typeof e> => e !== null);
        validEvents.sort((a, b) => a.timestamp - b.timestamp);

        return {
            events: validEvents,
            metadata: {
                sport: args.sport,
                spotCount: targetSpotIds.length,
                isPersonalized,
            },
        };
    },
});

/**
 * Create a calendar subscription for a user
 */
export const createSubscription = mutation({
    args: {
        sessionToken: v.string(),
        sport: v.string(),
    },
    returns: v.object({
        subscriptionId: v.id("calendar_subscriptions"),
        token: v.string(),
        feedUrl: v.string(),
    }),
    handler: async (ctx, args) => {
        // 1. Verify session token
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .first();

        if (!session || session.expiresAt < Date.now()) {
            throw new Error("Invalid or expired session");
        }

        // 2. Check if user already has subscription for this sport
        const existing = await ctx.db
            .query("calendar_subscriptions")
            .withIndex("by_user_sport", (q) => 
                q.eq("userId", session.userId).eq("sport", args.sport)
            )
            .first();

        if (existing) {
            // Return existing subscription
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://waterman.radx.dev";
            return {
                subscriptionId: existing._id,
                token: existing.token,
                feedUrl: `${appUrl}/api/calendar/${args.sport}/feed.ics?token=${existing.token}`,
            };
        }

        // 3. Generate unique subscription token
        const token = generateToken();

        // 4. Create new subscription
        const subscriptionId = await ctx.db.insert("calendar_subscriptions", {
            userId: session.userId,
            sport: args.sport,
            token,
            isActive: true,
            createdAt: Date.now(),
            accessCount: 0,
        });

        // 5. Build feed URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://waterman.radx.dev";
        const feedUrl = `${appUrl}/api/calendar/${args.sport}/feed.ics?token=${token}`;

        return {
            subscriptionId,
            token,
            feedUrl,
        };
    },
});

/**
 * Regenerate token for a calendar subscription
 */
export const regenerateToken = mutation({
    args: {
        sessionToken: v.string(),
        subscriptionId: v.id("calendar_subscriptions"),
    },
    returns: v.object({
        token: v.string(),
        feedUrl: v.string(),
    }),
    handler: async (ctx, args) => {
        // 1. Verify session token
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .first();

        if (!session || session.expiresAt < Date.now()) {
            throw new Error("Invalid or expired session");
        }

        // 2. Get subscription and verify ownership
        const subscription = await ctx.db.get(args.subscriptionId);
        if (!subscription || subscription.userId !== session.userId) {
            throw new Error("Subscription not found or access denied");
        }

        // 3. Generate new token
        const token = generateToken();

        // 4. Update subscription
        await ctx.db.patch(args.subscriptionId, { token });

        // 5. Build feed URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://waterman.radx.dev";
        const feedUrl = `${appUrl}/api/calendar/${subscription.sport}/feed.ics?token=${token}`;

        return {
            token,
            feedUrl,
        };
    },
});

/**
 * Delete a calendar subscription
 */
export const deleteSubscription = mutation({
    args: {
        sessionToken: v.string(),
        subscriptionId: v.id("calendar_subscriptions"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        // 1. Verify session token
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .first();

        if (!session || session.expiresAt < Date.now()) {
            throw new Error("Invalid or expired session");
        }

        // 2. Get subscription and verify ownership
        const subscription = await ctx.db.get(args.subscriptionId);
        if (!subscription || subscription.userId !== session.userId) {
            throw new Error("Subscription not found or access denied");
        }

        // 3. Delete subscription
        await ctx.db.delete(args.subscriptionId);

        return null;
    },
});

/**
 * Get all calendar subscriptions for a user
 */
export const getUserSubscriptions = query({
    args: {
        sessionToken: v.string(),
    },
    returns: v.array(v.object({
        subscriptionId: v.id("calendar_subscriptions"),
        sport: v.string(),
        feedUrl: v.string(),
        isActive: v.boolean(),
        createdAt: v.number(),
        lastAccessedAt: v.optional(v.number()),
        accessCount: v.optional(v.number()),
    })),
    handler: async (ctx, args) => {
        // 1. Verify session token
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
            .first();

        if (!session || session.expiresAt < Date.now()) {
            throw new Error("Invalid or expired session");
        }

        // 2. Get user's subscriptions
        const subscriptions = await ctx.db
            .query("calendar_subscriptions")
            .withIndex("by_user", (q) => q.eq("userId", session.userId))
            .collect();

        // 3. Build feed URLs
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://waterman.radx.dev";
        
        return subscriptions.map(sub => ({
            subscriptionId: sub._id,
            sport: sub.sport,
            feedUrl: `${appUrl}/api/calendar/${sub.sport}/feed.ics?token=${sub.token}`,
            isActive: sub.isActive,
            createdAt: sub.createdAt,
            lastAccessedAt: sub.lastAccessedAt,
            accessCount: sub.accessCount,
        }));
    },
});
