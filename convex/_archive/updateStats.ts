import { mutation } from "./_generated/server";

export const update = mutation({
    args: {},
    handler: async (ctx) => {
        const configs = await ctx.db.query("spotConfigs").collect();

        for (const config of configs) {
            await ctx.db.patch(config._id, {
                directionFrom: 315, // NW
                directionTo: 135,   // SE (Targeting North sector crossing 0)
            });
        }

        return `Updated ${configs.length} configs to 315-135`;
    },
});
