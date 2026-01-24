#!/usr/bin/env node
/**
 * Debug script to investigate calendar feed data discrepancies
 * Checks condition_scores, forecast_slots, and their relationships
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// Hardcode the Convex URL for now
const CONVEX_URL = "https://adorable-anteater-323.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  try {
    console.log("🔍 Investigating calendar data discrepancies...\n");

    // 1. Get all spots for wingfoil
    const allSpots = await client.query(api.spots.getAll);
    const wingSpots = allSpots.filter(spot => spot.sports?.includes("wingfoil"));
    
    console.log(`Found ${wingSpots.length} wingfoil spots\n`);

    // 2. Get calendar feed data (same call the API makes)
    const feedData = await client.query(api.calendar.getSportFeed, {
      sport: "wingfoil",
    });

    console.log(`Calendar feed has ${feedData.events.length} events\n`);

    // 3. For each event, show the details
    for (const event of feedData.events.slice(0, 5)) { // Show first 5
      const eventDate = new Date(event.timestamp);
      console.log(`\n📅 Event: ${event.spotName} - ${eventDate.toLocaleString()}`);
      console.log(`   Score: ${event.score}`);
      console.log(`   Wind: ${event.conditions.speed} kn, gusts ${event.conditions.gust} kn`);
      console.log(`   Direction: ${event.conditions.direction}°`);
      console.log(`   Waves: ${event.conditions.waveHeight}m`);
      console.log(`   Reasoning: ${event.reasoning.substring(0, 100)}...`);
      console.log(`   Slot ID: ${event.slotId}`);
    }

    // 4. Now check what forecast data we have for today
    console.log("\n\n🌊 Checking current forecast data...\n");
    
    const now = Date.now();
    const tomorrow = now + 24 * 60 * 60 * 1000;
    
    // Get conditions for Marina de Cascais for comparison
    const marinaCascais = wingSpots.find(s => s.name.includes("Cascais"));
    if (marinaCascais) {
      console.log(`\nChecking Marina de Cascais (${marinaCascais._id})...\n`);
      
      // Get recent forecast slots
      try {
        const slots = await client.query(api.admin.getRecentSlots, {
          spotId: marinaCascais._id,
          sport: "wingfoil",
          limit: 10,
        });
        
        console.log(`Found ${slots?.length || 0} recent forecast slots:\n`);
        
        if (slots && slots.length > 0) {
          for (const slot of slots.slice(0, 5)) {
            const slotDate = new Date(slot.timestamp);
            console.log(`   ${slotDate.toLocaleString()}: ${slot.speed} kn (${slot.gust}*) ${slot.direction}°, waves ${slot.waveHeight}m`);
          }
        }
      } catch (err) {
        console.log("   (Could not fetch recent slots - query may not exist)");
      }
    }

  } catch (error) {
    console.error("Error:", error.message);
    console.error(error.stack);
  }
}

main();
