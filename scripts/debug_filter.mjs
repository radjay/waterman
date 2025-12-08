import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function main() {
    console.log("🐞 Debugging Filter Logic...");

    const spots = await client.query(api.spots.list);

    for (const spot of spots) {
        console.log(`\nChecking Spot: ${spot.name}`);
        const [slots, config] = await Promise.all([
            client.query(api.spots.getForecastSlots, { spotId: spot._id }),
            client.query(api.spots.getSpotConfig, { spotId: spot._id })
        ]);

        if (!config) {
            console.log("No config found.");
            continue;
        }

        console.log(`Config: Speed >= ${config.minSpeed}, Gust >= ${config.minGust}, Dir: ${config.directionFrom} -> ${config.directionTo}`);

        // Analyze slots
        let passed = 0;
        let rejected = 0;

        // Import direction range checking (note: this is a .mjs file, so we can't use ES6 imports easily)
        // For now, we'll inline the function or use a simpler approach
        function isDirectionInRange(direction, from, to) {
            if (from === undefined || to === undefined) {
                return true; // No direction filter
            }
            if (from <= to) {
                return direction >= from && direction <= to;
            } else {
                return direction >= from || direction <= to;
            }
        }

        slots.forEach(slot => {
            // Simulate Logic
            const isSpeed = slot.speed >= config.minSpeed;
            const isGust = slot.gust >= config.minGust;
            const isDir = isDirectionInRange(slot.direction, config.directionFrom, config.directionTo);

            // Check specific example case (Direction 0)
            if (slot.direction === 0) {
                console.log(`\n🔍 Analyzing Zero Direction Slot:`);
                console.log(`   Speed: ${slot.speed} (${isSpeed ? 'PASS' : 'FAIL'})`);
                console.log(`   Gust: ${slot.gust} (${isGust ? 'PASS' : 'FAIL'})`);
                console.log(`   Dir: ${slot.direction} (${isDir ? 'PASS' : 'FAIL'})`);
                console.log(`   Logic: ${slot.direction} >= ${config.directionFrom} || ${slot.direction} <= ${config.directionTo}`);
            }

            if (isSpeed && isGust && isDir) {
                passed++;
            } else {
                rejected++;
                // console.log(`Rejected: Spd: ${slot.speed}, Dir: ${slot.direction}`);
            }
        });

        console.log(`Result: ${passed} passed, ${rejected} rejected.`);
    }
}

main();
