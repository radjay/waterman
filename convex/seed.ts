import { mutation } from "./_generated/server";

export const seedSpots = mutation({
    args: {},
    handler: async (ctx) => {
        // 1. Marina de Cascais
        const cascaisId = await ctx.db.insert("spots", {
            name: "Marina de Cascais",
            url: "https://windy.app/forecast2/spot/8512151/Marina+de+Cascais",
            country: "Portugal",
            sports: ["wingfoil"],
            webcamUrl: "https://video-auth1.iol.pt/beachcam/praiadospescadores/playlist.m3u8",
            webcamStreamSource: "iol",
            liveReportUrl: "https://www.windguru.cz/station/2329"
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
            sports: ["wingfoil"],
            webcamUrl: "https://video-auth1.iol.pt/beachcam/bclagoaalbufeira/playlist.m3u8",
            webcamStreamSource: "iol"
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
            sports: ["surfing"],
            webcamUrl: "https://deliverys5.quanteec.com/contents/encodings/live/7dbfbd58-2c72-4c87-3135-3530-6d61-63-a1b9-8dc2ff272a5cd/media_0.m3u8",
            webcamStreamSource: "quanteec"
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
