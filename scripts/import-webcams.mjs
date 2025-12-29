#!/usr/bin/env node

/**
 * Migration script to import webcams from Portufornia to Waterman database.
 * 
 * This script reads the webcam spots from Portufornia and adds them to the
 * Waterman database as webcam-only spots (not scraped/scored).
 * 
 * Usage: node scripts/import-webcams.mjs
 */

import dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Webcam spots from Portufornia
const portuforniaSpots = [
  {
    town: "Sao Pedro do Estoril",
    spot: "Bico",
    streamId: "5fcf6d21-f52c-422a-3035-3530-6d61-63-98fa-626cced74f41d",
    region: "Linha",
    sports: ["surf"],
    streamSource: "quanteec",
    latitude: 38.6975,
    longitude: -9.3714,
  },
  {
    town: "Estoril",
    spot: "Praia das Moitas",
    streamId: "https://video-auth1.iol.pt/beachcam/bctamarizfixa/playlist.m3u8",
    region: "Linha",
    sports: ["surf", "wing"],
    streamSource: "iol",
    latitude: 38.7025,
    longitude: -9.3789,
  },
  {
    town: "Carcavelos",
    spot: "Carcavelos",
    streamId: "7dbfbd58-2c72-4c87-3135-3530-6d61-63-a1b9-8dc2ff272a5cd",
    region: "Linha",
    sports: ["surf", "kite"],
    streamSource: "quanteec",
    latitude: 38.6847,
    longitude: -9.3333,
  },
  {
    town: "Guincho",
    spot: "Praia do Guincho (S)",
    streamId: "61f5d898-0c04-4515-3934-3530-6d61-63-87e5-3432badee226d",
    region: "Cascais",
    sports: ["surf", "windsurf", "kite", "wing"],
    streamSource: "quanteec",
    latitude: 38.7314,
    longitude: -9.4714,
  },
  {
    town: "Guincho",
    spot: "Praia do Guincho (N)",
    streamId: "8d2e5d1c-5771-49c8-3834-3530-6d61-63-a417-988a6df6a2f2d",
    region: "Cascais",
    sports: ["surf", "windsurf", "kite", "wing"],
    streamSource: "quanteec",
    latitude: 38.7333,
    longitude: -9.4733,
  },
  {
    town: "Guincho",
    spot: "Praia da Cresmina",
    streamId: "https://video-auth1.iol.pt/beachcam/crismina/playlist.m3u8",
    region: "Cascais",
    sports: ["surf"],
    streamSource: "iol",
    latitude: 38.7289,
    longitude: -9.4689,
  },
  {
    town: "Cascais",
    spot: "Baia de Cascais",
    streamId: "https://video-auth1.iol.pt/beachcam/praiadospescadores/playlist.m3u8",
    region: "Cascais",
    sports: ["windsurf", "wing"],
    streamSource: "iol",
    latitude: 38.6958,
    longitude: -9.4214,
  },
  {
    town: "Caparica",
    spot: "Praia do Sao Joao",
    streamId: "f829148a-5ae5-4a90-3735-3530-6d61-63-b215-b6a95fb68802d",
    region: "Almada",
    sports: ["surf"],
    streamSource: "quanteec",
    latitude: 38.6333,
    longitude: -9.2333,
  },
  {
    town: "Caparica",
    spot: "Praia do CDS",
    streamId: "b969e298-ceb4-4132-3635-3530-6d61-63-82b6-c59507e55b39d",
    region: "Almada",
    sports: ["surf"],
    streamSource: "quanteec",
    latitude: 38.6367,
    longitude: -9.2367,
  },
  {
    town: "Caparica",
    spot: "Praia do Riviera",
    streamId: "033c1cda-143d-4a55-3835-3530-6d61-63-a933-f44c0821ad62d",
    region: "Almada",
    sports: ["surf"],
    streamSource: "quanteec",
    latitude: 38.6389,
    longitude: -9.2389,
  },
  {
    town: "Caparica",
    spot: "Fonte da Telha",
    streamId: "a31a9026-5ced-4668-3935-3530-6d61-63-aa32-b07694268059d",
    region: "Almada",
    sports: ["windsurf", "kite", "wing", "surf"],
    streamSource: "quanteec",
    latitude: 38.5667,
    longitude: -9.1667,
  },
  {
    town: "Sesimbra",
    spot: "Lagoa de Albufeira",
    streamId: "https://video-auth1.iol.pt/beachcam/bclagoaalbufeira/playlist.m3u8",
    region: "Sesimbra",
    sports: ["kite", "windsurf", "wing"],
    streamSource: "iol",
    latitude: 38.5167,
    longitude: -9.1667,
  },
  {
    town: "Colares",
    spot: "Praia Grande - Sul",
    streamId: "f05e1d93-57cf-4e07-3734-3530-6d61-63-8b8c-a57a96c1fc1ed",
    region: "Sintra",
    sports: ["surf"],
    streamSource: "quanteec",
    latitude: 38.8167,
    longitude: -9.4667,
  },
  {
    town: "Obidos",
    spot: "Lagoa de Obidos",
    streamId: "https://video-auth1.iol.pt/beachcam/bcfozdoarelho/playlist.m3u8",
    region: "Obidos",
    sports: ["surf", "windsurf", "kite", "wing"],
    streamSource: "iol",
    latitude: 39.4167,
    longitude: -9.2167,
  },
];

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("Error: NEXT_PUBLIC_CONVEX_URL or CONVEX_URL environment variable is required");
  console.error("Please set it in .env.local or as an environment variable");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function importWebcams() {
  console.log("Starting webcam import...");
  console.log(`Found ${portuforniaSpots.length} webcam spots to import`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const spot of portuforniaSpots) {
    try {
      // Create spot name: "Spot Name, Town"
      const spotName = `${spot.spot}, ${spot.town}`;
      
      // Check if spot already exists (by full name or by webcamStreamId)
      const existingSpots = await client.query(api.spots.list, { includeWebcams: true });
      const existing = existingSpots.find(
        s => s.name === spotName || s.webcamStreamId === spot.streamId
      );

      if (existing) {
        console.log(`Skipping ${spotName} (already exists)`);
        skipped++;
        continue;
      }

      // Map sports from Portufornia format to Waterman format
      const sportsMap = {
        surf: "surfing",
        kite: "kitesurf",
        windsurf: "windsurf",
        wing: "wingfoil",
      };
      const mappedSports = spot.sports.map(s => sportsMap[s] || s);

      // Create a placeholder URL (webcam-only spots don't need Windy.app URLs)
      const placeholderUrl = `https://windy.app/spot/${spot.spot.toLowerCase().replace(/\s+/g, "-")}`;

      // Add the webcam spot
      const spotId = await client.mutation(api.spots.addWebcamSpot, {
        name: spotName,
        url: placeholderUrl,
        sports: mappedSports,
        webcamStreamId: spot.streamId,
        webcamStreamSource: spot.streamSource,
        town: spot.town,
        region: spot.region,
        latitude: spot.latitude,
        longitude: spot.longitude,
      });

      console.log(`✓ Imported: ${spotName} (${spotId})`);
      imported++;
    } catch (error) {
      console.error(`✗ Error importing ${spot.spot}, ${spot.town}:`, error.message);
      errors++;
    }
  }

  console.log("\n=== Import Summary ===");
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${portuforniaSpots.length}`);
}

importWebcams().catch(console.error);

