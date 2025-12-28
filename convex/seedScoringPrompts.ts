import { mutation } from "./_generated/server";
import { SYSTEM_SPORT_PROMPTS, DEFAULT_TEMPORAL_PROMPT } from "./prompts";

/**
 * Seed system sport prompts (shared across all spots).
 * These define general evaluation guidelines for each sport.
 */
export const seedSystemSportPrompts = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        let created = 0;
        let updated = 0;

        // Seed system prompts for each sport
        for (const [sport, prompt] of Object.entries(SYSTEM_SPORT_PROMPTS)) {
            const existing = await ctx.db
                .query("system_sport_prompts")
                .withIndex("by_sport", q => q.eq("sport", sport))
                .first();

            if (existing) {
                await ctx.db.patch(existing._id, {
                    prompt,
                    isActive: true,
                    updatedAt: now,
                });
                updated++;
            } else {
                await ctx.db.insert("system_sport_prompts", {
                    sport,
                    prompt,
                    isActive: true,
                    createdAt: now,
                    updatedAt: now,
                });
                created++;
            }
        }

        return {
            message: `Seeded system sport prompts: ${created} created, ${updated} updated`,
            created,
            updated,
            total: created + updated,
        };
    },
});

/**
 * Seed scoring prompts for all spots and their supported sports.
 * 
 * This creates spot-specific prompts (userId: null) for each spot-sport combination.
 * System prompts are stored separately in system_sport_prompts table.
 */
export const seedScoringPrompts = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        let created = 0;
        let updated = 0;

        // Get all spots
        const spots = await ctx.db.query("spots").collect();

        for (const spot of spots) {
            // Get sports for this spot (default to wingfoil if none specified)
            const sports = spot.sports && spot.sports.length > 0 
                ? spot.sports 
                : ["wingfoil"];

            for (const sport of sports) {
                // Check if prompt already exists
                const existing = await ctx.db
                    .query("scoring_prompts")
                    .withIndex("by_spot_sport", q => 
                        q.eq("spotId", spot._id)
                         .eq("sport", sport)
                    )
                    .filter(q => q.eq(q.field("userId"), null))
                    .first();

                // Get spot config to build spot-specific prompt
                const config = await ctx.db
                    .query("spotConfigs")
                    .filter(q => 
                        q.and(
                            q.eq(q.field("spotId"), spot._id),
                            q.eq(q.field("sport"), sport)
                        )
                    )
                    .first();

                // Build spot-specific prompt from config
                let spotPrompt = `This is ${spot.name}. `;
                
                if (sport === "wingfoil" || sport === "wingfoiling") {
                    spotPrompt += "For wingfoiling at this spot: ";
                    if (config?.minSpeed) {
                        spotPrompt += `Minimum wind speed required is ${config.minSpeed} knots. `;
                    }
                    if (config?.minGust) {
                        spotPrompt += `Minimum gust speed required is ${config.minGust} knots. `;
                    }
                    if (config?.directionFrom !== undefined && config?.directionTo !== undefined) {
                        spotPrompt += `Optimal wind directions are from ${config.directionFrom}° to ${config.directionTo}° (wrapping through 0° if needed). `;
                    }
                    spotPrompt += "Consider wind consistency - steady wind is preferred over gusty conditions. ";
                    spotPrompt += "Higher wind speeds (15-25 knots) are ideal, but consistency and direction matter more than peak speed.";
                } else if (sport === "surfing" || sport === "surf") {
                    spotPrompt += "For surfing at this spot: ";
                    if (config?.minSwellHeight) {
                        spotPrompt += `Minimum swell height is ${config.minSwellHeight}m. `;
                    }
                    if (config?.maxSwellHeight) {
                        spotPrompt += `Maximum swell height is ${config.maxSwellHeight}m (larger swells may be too powerful). `;
                    }
                    if (config?.minPeriod) {
                        spotPrompt += `Minimum wave period is ${config.minPeriod} seconds (longer periods indicate better quality swells). `;
                    }
                    if (config?.swellDirectionFrom !== undefined && config?.swellDirectionTo !== undefined) {
                        spotPrompt += `Optimal swell directions are from ${config.swellDirectionFrom}° to ${config.swellDirectionTo}°. `;
                    }
                    if (config?.optimalTide) {
                        if (config.optimalTide === "high") {
                            spotPrompt += "High tide is optimal for this spot. ";
                        } else if (config.optimalTide === "low") {
                            spotPrompt += "Low tide is optimal for this spot. ";
                        } else {
                            spotPrompt += "Both high and low tide can work at this spot. ";
                        }
                    }
                    spotPrompt += "Consider wave quality, consistency, and safety when scoring.";
                } else {
                    spotPrompt += `Evaluate conditions for ${sport} at this spot based on general best practices.`;
                }

                if (existing) {
                    // Update existing prompt
                    await ctx.db.patch(existing._id, {
                        spotPrompt,
                        temporalPrompt: DEFAULT_TEMPORAL_PROMPT,
                        isActive: true,
                        updatedAt: now,
                    });
                    updated++;
                } else {
                    // Create new prompt
                    await ctx.db.insert("scoring_prompts", {
                        spotId: spot._id,
                        sport,
                        userId: null, // System prompt
                        spotPrompt,
                        temporalPrompt: DEFAULT_TEMPORAL_PROMPT,
                        isActive: true,
                        createdAt: now,
                        updatedAt: now,
                    });
                    created++;
                }
            }
        }

        return {
            message: `Seeded scoring prompts: ${created} created, ${updated} updated`,
            created,
            updated,
            total: created + updated,
        };
    },
});

