import { mutation } from "../_generated/server";

export const updateCarcavelosConfig = mutation({
    args: {},
    handler: async (ctx) => {
        // Find Carcavelos spot
        const carcavelos = await ctx.db
            .query("spots")
            .filter((q) => q.eq(q.field("name"), "Carcavelos"))
            .first();

        if (!carcavelos) {
            return "Carcavelos spot not found";
        }

        // Find and update the surfing config
        const config = await ctx.db
            .query("spotConfigs")
            .filter((q) => 
                q.and(
                    q.eq(q.field("spotId"), carcavelos._id),
                    q.eq(q.field("sport"), "surfing")
                )
            )
            .first();

        if (!config) {
            return "Carcavelos surfing config not found";
        }

        // Update with correct wave direction range based on actual data (84-129 degrees)
        await ctx.db.patch(config._id, {
            swellDirectionFrom: 80,  // E
            swellDirectionTo: 130,   // SE
        });

        return "Updated Carcavelos config";
    }
});



