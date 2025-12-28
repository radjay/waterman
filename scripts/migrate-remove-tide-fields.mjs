#!/usr/bin/env node

/**
 * Migration script to remove tide fields from forecast_slots table.
 * 
 * Run this after updating the schema to remove tideHeight, tideType, and tideTime
 * from forecast_slots (since tides are now stored in a separate table).
 * 
 * Usage: node scripts/migrate-remove-tide-fields.mjs
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function main() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    console.error("❌ Error: NEXT_PUBLIC_CONVEX_URL is missing. Check .env.local");
    process.exit(1);
  }

  console.log("🔄 Starting migration to remove tide fields from forecast_slots...");
  
  try {
    const result = await client.mutation(api.spots.removeTideFieldsFromSlots, {});
    
    console.log(`✅ Migration complete: ${result.message}`);
    console.log(`   Updated ${result.updated} documents`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();

