import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function main() {
    console.log("📊 Checking condition scores...\n");

    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
        console.error("Error: NEXT_PUBLIC_CONVEX_URL is missing. Check .env.local");
        process.exit(1);
    }

    try {
        // Get all spots
        const spots = await client.query(api.spots.list, {});
        console.log(`Found ${spots.length} spots\n`);

        for (const spot of spots) {
            console.log(`📍 ${spot.name}`);
            
            // Get sports for this spot
            const sports = spot.sports && spot.sports.length > 0 ? spot.sports : ["wingfoil"];
            
            for (const sport of sports) {
                console.log(`   Sport: ${sport}`);
                
                // Get condition scores for this spot-sport
                const scores = await client.query(api.spots.getConditionScores, {
                    spotId: spot._id,
                    sport: sport,
                });
                
                if (scores.length === 0) {
                    console.log(`      No scores yet (scoring may still be in progress)\n`);
                    continue;
                }
                
                console.log(`      Found ${scores.length} scores\n`);
                
                // Show first 5 scores as examples
                const sampleScores = scores.slice(0, 5);
                for (const score of sampleScores) {
                    const date = new Date(score.timestamp);
                    const scoredDate = new Date(score.scoredAt);
                    console.log(`      ${date.toLocaleString()}:`);
                    console.log(`         Score: ${score.score}/100`);
                    console.log(`         Reasoning: ${score.reasoning}`);
                    if (score.factors) {
                        console.log(`         Factors:`, JSON.stringify(score.factors, null, 2));
                    }
                    console.log(`         Scored at: ${scoredDate.toLocaleString()}`);
                    console.log(`         Model: ${score.model || "unknown"}\n`);
                }
                
                if (scores.length > 5) {
                    console.log(`      ... and ${scores.length - 5} more scores\n`);
                }
            }
        }

        console.log("✅ Score check complete!");
        console.log("\n💡 To see all scores, check the condition_scores table in Convex Dashboard");
    } catch (error) {
        console.error("❌ Error checking scores:", error.message);
        console.error(error);
        process.exit(1);
    }
}

main();

