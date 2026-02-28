import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Add kitesurfing as a sport to Guincho, Lagoa da Albufeira, and Fonte de Telha spots.
 * Creates spots if they don't exist, then adds kitesurfing configs.
 */
export const addKitesurfingToSpots = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        let spotsCreated = 0;
        let spotsUpdated = 0;
        let configsCreated = 0;

        // Define the spots with their full data
        const spotsData = [
            {
                name: "Guincho",
                url: "https://windy.app/forecast2/spot/8512093/Guincho",
                country: "Portugal",
                sports: ["wingfoil", "kitesurfing"],
                windySpotId: "8512093",
            },
            {
                name: "Lagoa da Albufeira",
                url: "https://windy.app/forecast2/spot/8512085/Lagoa+de+Albufeira+kitesurfing",
                country: "Portugal",
                sports: ["wingfoil", "kitesurfing"],
                windySpotId: "8512085",
                webcamUrl: "https://video-auth1.iol.pt/beachcam/bclagoaalbufeira/playlist.m3u8",
                webcamStreamSource: "iol",
            },
            {
                name: "Fonte da Telha",
                url: "https://windy.app/forecast2/spot/8512086/Fonte+da+Telha",
                country: "Portugal",
                sports: ["wingfoil", "kitesurfing"],
                windySpotId: "8512086",
            },
        ];

        for (const spotData of spotsData) {
            // Find spot by URL (most reliable identifier)
            let spot = await ctx.db
                .query("spots")
                .filter(q => q.eq(q.field("url"), spotData.url))
                .first();

            // Create spot if it doesn't exist
            if (!spot) {
                const spotId = await ctx.db.insert("spots", {
                    name: spotData.name,
                    url: spotData.url,
                    country: spotData.country,
                    sports: spotData.sports,
                    windySpotId: spotData.windySpotId,
                    ...(spotData.webcamUrl && { webcamUrl: spotData.webcamUrl }),
                    ...(spotData.webcamStreamSource && { webcamStreamSource: spotData.webcamStreamSource }),
                });
                spot = await ctx.db.get(spotId);
                spotsCreated++;
                console.log(`Created spot: ${spotData.name}`);
            } else {
                // Check if spot already has kitesurfing
                const currentSports = spot.sports || [];
                if (!currentSports.includes("kitesurfing")) {
                    // Add kitesurfing to sports array
                    await ctx.db.patch(spot._id, {
                        sports: [...currentSports, "kitesurfing"],
                    });
                    spotsUpdated++;
                    console.log(`Added kitesurfing to ${spot.name}`);
                }
            }

            // Check if kitesurfing config already exists
            const existingConfig = await ctx.db
                .query("spotConfigs")
                .filter(q =>
                    q.and(
                        q.eq(q.field("spotId"), spot!._id),
                        q.eq(q.field("sport"), "kitesurfing")
                    )
                )
                .first();

            if (!existingConfig) {
                // Create kitesurfing config
                // Kitesurfing generally needs slightly less wind than wingfoiling
                await ctx.db.insert("spotConfigs", {
                    spotId: spot!._id,
                    sport: "kitesurfing",
                    minSpeed: 12, // Lower minimum than wingfoiling (15)
                    minGust: 15,  // Lower minimum than wingfoiling (18)
                    directionFrom: 315, // NW - same as wingfoiling
                    directionTo: 135,   // SE - same as wingfoiling
                });
                configsCreated++;
                console.log(`Created kitesurfing config for ${spot!.name}`);
            }

            // Also create wingfoil config if it doesn't exist (for new spots)
            const existingWingfoilConfig = await ctx.db
                .query("spotConfigs")
                .filter(q =>
                    q.and(
                        q.eq(q.field("spotId"), spot!._id),
                        q.eq(q.field("sport"), "wingfoil")
                    )
                )
                .first();

            if (!existingWingfoilConfig) {
                await ctx.db.insert("spotConfigs", {
                    spotId: spot!._id,
                    sport: "wingfoil",
                    minSpeed: 15,
                    minGust: 18,
                    directionFrom: 315,
                    directionTo: 135,
                });
                console.log(`Created wingfoil config for ${spot!.name}`);
            }
        }

        return {
            message: `Kitesurfing setup complete: ${spotsCreated} spots created, ${spotsUpdated} spots updated, ${configsCreated} kitesurfing configs created`,
            spotsCreated,
            spotsUpdated,
            configsCreated,
        };
    },
});
