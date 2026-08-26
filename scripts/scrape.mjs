import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { getForecast, getModelForecasts, extractSpotId } from "../lib/scraper.js";
import { scrapeableSpots, scrapeOneSpot } from "../lib/ingest/scrapePlan.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function main() {
    console.log("Waterman scraper starting (manual). Scheduled scrape is a Convex cron.");

    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
        console.error("Error: NEXT_PUBLIC_CONVEX_URL is missing. Check .env.local");
        process.exit(1);
    }

    const spots = scrapeableSpots(await client.query(api.spots.list));

    if (!spots || spots.length === 0) {
        console.log("No spots found in DB. Run seed first?");
        return;
    }

    console.log(`Found ${spots.length} spots.`);

    for (const spot of spots) {
        console.log(`\nScraping ${spot.name} (${spot.url})...`);
        const result = await scrapeOneSpot({
            spot,
            getForecast,
            getModelForecasts,
            extractSpotId,
            saveForecastSlots: (args) => client.mutation(api.spots.saveForecastSlots, args),
            saveTides: (args) => client.mutation(api.spots.saveTides, args),
            saveModelSlots: (args) => client.mutation(api.models.saveModelSlots, args),
            updateWindySpotId: (args) => client.mutation(api.spots.updateWindySpotId, args),
        });
        if (!result.ok) {
            console.error(`   -> Failed: ${result.error}`);
        } else {
            console.log(
                `   -> ${result.slotsCount} slots, ${result.tidesCount} tides, ${result.modelsSaved} model slots`
            );
        }
    }

    console.log("\nDone. Prefer `npx convex run ingest:scrapeAllSpots` for the cron path.");
    process.exit(0);
}

main();
