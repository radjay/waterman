import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function main() {
    console.log("🗑️  Removing all scrapes from today...");

    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
        console.error("Error: NEXT_PUBLIC_CONVEX_URL is missing. Check .env.local");
        process.exit(1);
    }

    try {
        const result = await client.mutation(api.spots.removeTodayScrapes);
        console.log(`✅ ${result.message}`);
        console.log(`   - Deleted ${result.deletedScrapesCount} scrapes`);
        console.log(`   - Deleted ${result.deletedSlotsCount} forecast slots`);
        console.log("\n✅ Done! The system will now use yesterday's scrape as the last valid one.");
    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }

    process.exit(0);
}

main();

