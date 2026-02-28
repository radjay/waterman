import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Add kitesurfing as a sport to Guincho, Lagoa da Albufeira, and Fonte de Telha spots.
 * - Guincho (Praia do Guincho): existing surf spot, add wing + kite
 * - Lagoa da Albufeira: existing wing spot, add kite
 * - Fonte da Telha: new spot or update to support wing + kite + surf
 */
export const addKitesurfingToSpots = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        let spotsCreated = 0;
        let spotsUpdated = 0;
        let configsCreated = 0;

        // Define the spots with their full data
        // Note: Praia do Guincho likely exists as a surfing spot
        const spotsData = [
            {
                name: "Praia do Guincho", // Full name as it exists in DB
                alternateName: "Guincho", // Short name
                url: "https://windy.app/forecast2/spot/8512093/Guincho",
                country: "Portugal",
                sports: ["wingfoil", "kitesurfing", "surfing"], // All three sports
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
                sports: ["wingfoil", "kitesurfing", "surfing"], // All three sports
                windySpotId: "8512086",
            },
        ];

        for (const spotData of spotsData) {
            // Find spot by URL or name (for existing spots like Praia do Guincho)
            let spot = await ctx.db
                .query("spots")
                .filter(q => q.eq(q.field("url"), spotData.url))
                .first();

            // If not found by URL, try by name
            if (!spot) {
                spot = await ctx.db
                    .query("spots")
                    .filter(q => q.eq(q.field("name"), spotData.name))
                    .first();
            }

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
                // Spot exists - merge sports arrays to include all desired sports
                const currentSports = spot.sports || [];
                const targetSports = spotData.sports;
                const needsUpdate = targetSports.some(sport => !currentSports.includes(sport));

                if (needsUpdate) {
                    // Merge current sports with target sports (deduplicate)
                    const mergedSports = Array.from(new Set([...currentSports, ...targetSports]));
                    await ctx.db.patch(spot._id, {
                        sports: mergedSports,
                    });
                    spotsUpdated++;
                    console.log(`Updated sports for ${spot.name}: ${mergedSports.join(", ")}`);
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

            // Create configs for all sports this spot should support
            for (const sport of spotData.sports) {
                const existingConfig = await ctx.db
                    .query("spotConfigs")
                    .filter(q =>
                        q.and(
                            q.eq(q.field("spotId"), spot!._id),
                            q.eq(q.field("sport"), sport)
                        )
                    )
                    .first();

                if (!existingConfig) {
                    if (sport === "wingfoil") {
                        await ctx.db.insert("spotConfigs", {
                            spotId: spot!._id,
                            sport: "wingfoil",
                            minSpeed: 15,
                            minGust: 18,
                            directionFrom: 315,
                            directionTo: 135,
                        });
                        console.log(`Created wingfoil config for ${spot!.name}`);
                    } else if (sport === "surfing") {
                        // Surfing config - similar to Carcavelos
                        await ctx.db.insert("spotConfigs", {
                            spotId: spot!._id,
                            sport: "surfing",
                            minSwellHeight: 1.0,
                            maxSwellHeight: 4.0,
                            swellDirectionFrom: 200, // SW
                            swellDirectionTo: 280, // W
                            minPeriod: 8,
                            optimalTide: "both",
                        });
                        console.log(`Created surfing config for ${spot!.name}`);
                    }
                    // Kitesurfing is already handled above
                }
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
