import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function main() {
    console.log("🔄 Migrating scoring prompts (removing systemPrompt field)...\n");

    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
        console.error("Error: NEXT_PUBLIC_CONVEX_URL is missing. Check .env.local");
        process.exit(1);
    }

    try {
        const result = await client.mutation(api.spots.removeSystemPromptField, {});
        console.log("✅ Success!");
        console.log(`   ${result.message}`);
        console.log(`   Updated: ${result.updated}`);
    } catch (error) {
        console.error("❌ Error migrating prompts:", error.message);
        process.exit(1);
    }
}

main();

