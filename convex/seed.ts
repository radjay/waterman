import { mutation } from "./_generated/server";

export const seedSpots = mutation({
    args: {},
    handler: async (ctx) => {
        // 1. Marina de Cascais
        const cascaisId = await ctx.db.insert("spots", {
            name: "Marina de Cascais",
            url: "https://windy.app/forecast2/spot/8512151/Marina+de+Cascais",
            country: "Portugal"
        });

        await ctx.db.insert("spotConfigs", {
            spotId: cascaisId,
            sport: "Wingfoil",
            minSpeed: 15,
            minGust: 18,
            directionFrom: 315, // NW
            directionTo: 135, // SE (wrapping through North 0)
        });

        // 2. Lagoa da Albufeira
        const lagoaId = await ctx.db.insert("spots", {
            name: "Lagoa da Albufeira",
            url: "https://windy.app/forecast2/spot/8512085/Lagoa+de+Albufeira+kitesurfing",
            country: "Portugal"
        });

        await ctx.db.insert("spotConfigs", {
            spotId: lagoaId,
            sport: "Wingfoil",
            minSpeed: 15,
            minGust: 18,
            directionFrom: 315,
            directionTo: 135,
        });

        return "Seeded 2 spots";
    },
});
