import { mutation } from "./_generated/server";

export const migrateSpots = mutation({
    args: {},
    handler: async (ctx) => {
        // Migrate all existing spots to have sports array
        const spots = await ctx.db.query("spots").collect();
        
        let migrated = 0;
        for (const spot of spots) {
            // If spot doesn't have sports field, add it based on existing configs
            if (!spot.sports || spot.sports.length === 0) {
                // Check what sports this spot has configs for
                const configs = await ctx.db
                    .query("spotConfigs")
                    .filter((q) => q.eq(q.field("spotId"), spot._id))
                    .collect();
                
                const sports = configs.map(c => c.sport.toLowerCase());
                
                // If no configs found, default to wingfoil
                const sportsArray = sports.length > 0 ? sports : ["wingfoil"];
                
                await ctx.db.patch(spot._id, {
                    sports: sportsArray
                });
                migrated++;
            }
        }
        
        // Also update spotConfigs to use lowercase sport names consistently
        const allConfigs = await ctx.db.query("spotConfigs").collect();
        for (const config of allConfigs) {
            const sportLower = config.sport.toLowerCase();
            if (config.sport !== sportLower) {
                await ctx.db.patch(config._id, {
                    sport: sportLower
                });
            }
        }
        
        return `Migrated ${migrated} spots`;
    }
});



