import { mutation } from "./_generated/server";

export const seedSpots = mutation({
    args: {},
    handler: async (ctx) => {
        // 1. Marina de Cascais
        const cascaisId = await ctx.db.insert("spots", {
            name: "Marina de Cascais",
            url: "https://windy.app/forecast2/spot/8512151/Marina+de+Cascais",
            country: "Portugal",
            sports: ["wingfoil"]
        });

        await ctx.db.insert("spotConfigs", {
            spotId: cascaisId,
            sport: "wingfoil",
            minSpeed: 15,
            minGust: 18,
            directionFrom: 315, // NW
            directionTo: 135, // SE (wrapping through North 0)
        });

        // 2. Lagoa da Albufeira
        const lagoaId = await ctx.db.insert("spots", {
            name: "Lagoa da Albufeira",
            url: "https://windy.app/forecast2/spot/8512085/Lagoa+de+Albufeira+kitesurfing",
            country: "Portugal",
            sports: ["wingfoil"]
        });

        await ctx.db.insert("spotConfigs", {
            spotId: lagoaId,
            sport: "wingfoil",
            minSpeed: 15,
            minGust: 18,
            directionFrom: 315,
            directionTo: 135,
        });

        // 3. Carcavelos (Surf spot)
        const carcavelosId = await ctx.db.insert("spots", {
            name: "Carcavelos",
            url: "https://windy.app/forecast2/spot/8512111/Carcavelos",
            country: "Portugal",
            sports: ["surfing"]
        });

        await ctx.db.insert("spotConfigs", {
            spotId: carcavelosId,
            sport: "surfing",
            minSwellHeight: 1.0, // meters
            maxSwellHeight: 4.0,
            swellDirectionFrom: 200, // SW
            swellDirectionTo: 280, // W
            minPeriod: 8, // seconds
            optimalTide: "both",
        });

        return "Seeded 3 spots (2 wingfoil, 1 surfing)";
    },
});
