import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { getForecast } from "../lib/scraper.js";
import { extractSpotId } from "../lib/scraper.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function main() {
    console.log("🌊 Waterman Scraper Starting...");

    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
        console.error("Error: NEXT_PUBLIC_CONVEX_URL is missing. Check .env.local");
        process.exit(1);
    }

    // 1. Fetch Spots
    console.log("Fetching spots from Convex...");
    const spots = await client.query(api.spots.list);

    if (!spots || spots.length === 0) {
        console.log("No spots found in DB. Run seed first?");
        return;
    }

    console.log(`Found ${spots.length} spots.`);

    // 2. Scrape Each Spot
    for (const spot of spots) {
        console.log(`\nSurfing to ${spot.name} (${spot.url})...`);
        try {
            // Use stored windySpotId if available, otherwise extract from URL
            const windySpotId = spot.windySpotId || extractSpotId(spot.url);
            
            // Update spot with windySpotId if not already set (non-blocking)
            if (!spot.windySpotId && windySpotId) {
                try {
                    await client.mutation(api.spots.updateWindySpotId, {
                        spotId: spot._id,
                        windySpotId: windySpotId,
                    });
                    console.log(`   -> Updated spot with windySpotId: ${windySpotId}`);
                } catch (err) {
                    // Non-blocking - continue even if update fails
                    console.log(`   -> Note: Could not update windySpotId (${err.message}), continuing...`);
                }
            }

            // Use the spot ID directly for scraping
            const forecastData = await getForecast(windySpotId);
            const slots = forecastData.slots || [];
            const tides = forecastData.tides || [];
            
            console.log(`   -> Found ${slots.length} slots and ${tides.length} tide events.`);

            // Map to DB schema (include all fields from scraper)
            const dbSlots = slots.map(s => ({
                timestamp: s.timestamp,
                speed: s.speed,
                gust: s.gust,
                direction: s.direction,
                waveHeight: s.waveHeight,
                wavePeriod: s.wavePeriod,
                waveDirection: s.waveDirection,
            }));

            // Store Granular Slots
            const scrapeTimestamp = Date.now();
            if (dbSlots.length > 0) {
                await client.mutation(api.spots.saveForecastSlots, {
                    spotId: spot._id,
                    scrapeTimestamp: scrapeTimestamp,
                    slots: dbSlots
                });
                console.log(`   -> Saved ${dbSlots.length} slots to DB.`);
            } else {
                console.log("   -> No suitable slots found.");
            }

            // Store Tide Events separately
            if (tides.length > 0) {
                await client.mutation(api.spots.saveTides, {
                    spotId: spot._id,
                    scrapeTimestamp: scrapeTimestamp,
                    tides: tides
                });
                console.log(`   -> Saved ${tides.length} tide events to DB.`);
            }

        } catch (err) {
            console.error(`   -> Failed to scrape ${spot.name}:`, err.message);
        }
    }

    console.log("\n✅ Done!");
    process.exit(0);
}

main();
