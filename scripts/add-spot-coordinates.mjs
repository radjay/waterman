import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function main() {
    console.log("🌊 Adding coordinates to forecast spots...\n");

    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
        console.error("Error: NEXT_PUBLIC_CONVEX_URL is missing. Check .env.local");
        process.exit(1);
    }

    try {
        const result = await client.mutation(api.spots.addSpotCoordinates, {});
        console.log(`✅ ${result}\n`);
        console.log("✅ Coordinates added successfully!");
    } catch (error) {
        console.error("❌ Error adding coordinates:", error.message);
        process.exit(1);
    }
}

main();
