import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function main() {
    console.log("🔍 Checking scoring status...\n");

    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
        console.error("Error: NEXT_PUBLIC_CONVEX_URL is missing. Check .env.local");
        process.exit(1);
    }

    try {
        // Get all spots
        const spots = await client.query(api.spots.list, {});
        
        for (const spot of spots) {
            console.log(`📍 ${spot.name}`);
            console.log(`   Sports: ${(spot.sports || ["wingfoil"]).join(", ")}`);
            
            // Check system prompts for each sport
            const sports = spot.sports && spot.sports.length > 0 ? spot.sports : ["wingfoil"];
            for (const sport of sports) {
                const systemPrompt = await client.query(api.spots.getSystemSportPrompt, { sport });
                const spotPrompt = await client.query(api.spots.getScoringPrompt, {
                    spotId: spot._id,
                    sport,
                });
                
                console.log(`   ${sport}:`);
                console.log(`      System prompt: ${systemPrompt ? "✅" : "❌ MISSING"}`);
                console.log(`      Spot prompt: ${spotPrompt ? "✅" : "❌ MISSING"}`);
                
                // Check scores
                const scores = await client.query(api.spots.getConditionScores, {
                    spotId: spot._id,
                    sport,
                });
                console.log(`      Scores: ${scores.length}`);
            }
            console.log();
        }
        
        console.log("💡 If prompts are missing, run: node scripts/seed-prompts.mjs");
        console.log("💡 Check Convex Dashboard → Logs for scoring errors");
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error);
        process.exit(1);
    }
}

main();


