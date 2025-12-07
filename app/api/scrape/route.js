import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { getForecast } from "../../../lib/scraper.js";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export async function POST(request) {
  try {
    // Optional: Add a simple auth check (you can add a secret token)
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.SCRAPE_SECRET_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    console.log("🌊 Waterman Scraper Starting (API trigger)...");

    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_CONVEX_URL is missing" },
        { status: 500 }
      );
    }

    // 1. Fetch Spots
    console.log("Fetching spots from Convex...");
    const spots = await client.query(api.spots.list);

    if (!spots || spots.length === 0) {
      return NextResponse.json(
        { error: "No spots found in DB" },
        { status: 404 }
      );
    }

    console.log(`Found ${spots.length} spots.`);

    const results = [];

    // 2. Scrape Each Spot
    for (const spot of spots) {
      console.log(`\nScraping ${spot.name} (${spot.url})...`);
      try {
        const slots = await getForecast(spot.url, spot._id);
        console.log(`   -> Found ${slots.length} slots.`);

        // Map to DB schema
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

        // Store Granular Slots
        if (dbSlots.length > 0) {
          await client.mutation(api.spots.saveForecastSlots, {
            spotId: spot._id,
            slots: dbSlots
          });
          console.log(`   -> Saved ${dbSlots.length} slots to DB.`);
          results.push({
            spot: spot.name,
            success: true,
            slotsCount: dbSlots.length
          });
        } else {
          console.log("   -> No suitable slots found.");
          results.push({
            spot: spot.name,
            success: true,
            slotsCount: 0
          });
        }

      } catch (err) {
        console.error(`   -> Failed to scrape ${spot.name}:`, err.message);
        results.push({
          spot: spot.name,
          success: false,
          error: err.message
        });
      }
    }

    console.log("\n✅ Scraping complete!");

    return NextResponse.json({
      success: true,
      message: "Scraping completed",
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error in scraper API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Also allow GET for easy testing (though POST is more secure)
export async function GET(request) {
  return POST(request);
}

