
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function main() {
    const spots = await client.query(api.spots.list);
    console.log(`Checking ${spots.length} spots...`);

    for (const spot of spots) {
        console.log(`Spot: ${spot.name}`);
        const slots = await client.query(api.spots.getForecastSlots, { spotId: spot._id });
        const withWave = slots.filter(s => s.waveHeight > 0);
        console.log(`  Total Slots: ${slots.length}`);
        console.log(`  Slots with Wave Data: ${withWave.length}`);
        if (withWave.length > 0) {
            console.log("  Sample:", JSON.stringify(withWave[0], null, 2));
        } else if (slots.length > 0) {
            console.log("  Sample (Zero Data):", JSON.stringify(slots[0], null, 2));
        }
    }
}

main().catch(console.error);
