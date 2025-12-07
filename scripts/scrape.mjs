import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { getForecast } from "../lib/scraper.js";
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
            const slots = await getForecast(spot.url, spot._id);
            console.log(`   -> Found ${slots.length} slots.`);

            // Map to DB schema (remove extra fields if any, only include tide if not null)
            // Include both forecast slots and tide-only entries
            const dbSlots = slots.map(s => {
                const slot = {
                    timestamp: s.timestamp,
                    speed: s.speed || 0,
                    gust: s.gust || 0,
                    direction: s.direction || 0,
                    waveHeight: s.waveHeight || 0,
                    wavePeriod: s.wavePeriod || 0,
                    waveDirection: s.waveDirection || 0,
                };
                
                // Only include tide fields if they have values
                if (s.tideHeight !== null && s.tideHeight !== undefined) {
                    slot.tideHeight = s.tideHeight;
                }
                if (s.tideType !== null && s.tideType !== undefined) {
                    slot.tideType = s.tideType;
                }
                if (s.tideTime !== null && s.tideTime !== undefined) {
                    slot.tideTime = s.tideTime;
                }
                
                return slot;
            });

            // Assuming 'suitableSlots' is intended to be 'dbSlots' or a filtered version of it
            // and 'convex' is intended to be 'client'.
            // The instruction is to log the first slot of 'suitableSlots'.
            // Since 'suitableSlots' is not defined, we'll assume it refers to 'dbSlots' for logging.
            // The provided code snippet also includes a conditional save and a log for 'suitableSlots'.
            // We will integrate the provided snippet as faithfully as possible,
            // assuming 'suitableSlots' refers to 'dbSlots' and 'convex' refers to 'client'.

            // Store Granular Slots
            if (dbSlots.length > 0) {
                await client.mutation(api.spots.saveForecastSlots, {
                    spotId: spot._id,
                    slots: dbSlots
                });
                console.log(`   -> Saved ${dbSlots.length} slots to DB (Granular).`);
            } else {
                console.log("   -> No suitable slots found.");
            }

        } catch (err) {
            console.error(`   -> Failed to scrape ${spot.name}:`, err.message);
        }
    }

    console.log("\n✅ Done!");
    process.exit(0);
}

main();
