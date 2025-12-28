import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function main() {
    console.log("🌊 Seeding scoring prompts...\n");

    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
        console.error("Error: NEXT_PUBLIC_CONVEX_URL is missing. Check .env.local");
        process.exit(1);
    }

    try {
        // First, seed system sport prompts (shared across all spots)
        console.log("1. Seeding system sport prompts...");
        const systemResult = await client.mutation(api.seedScoringPrompts.seedSystemSportPrompts, {});
        console.log(`   ✅ ${systemResult.message}\n`);

        // Then, seed spot-specific prompts
        console.log("2. Seeding spot-specific prompts...");
        const spotResult = await client.mutation(api.seedScoringPrompts.seedScoringPrompts, {});
        console.log(`   ✅ ${spotResult.message}\n`);

        console.log("✅ All prompts seeded successfully!");
        console.log(`   System prompts: ${systemResult.total}`);
        console.log(`   Spot prompts: ${spotResult.total}`);
    } catch (error) {
        console.error("❌ Error seeding prompts:", error.message);
        process.exit(1);
    }
}

main();

