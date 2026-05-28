import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { ANALYSIS_SEASONS } from "../lib/forecast-experiment/analysisSeasons.js";
import { mineBayWindCoefficients } from "../lib/forecast-experiment/mineBayWindCoefficients.js";
import {
  DEFAULT_RIDEABILITY_PRESET,
  RIDEABILITY_THRESHOLD_PRESETS,
  resolveRideabilityThreshold,
} from "../lib/forecast-experiment/rideabilityThresholds.js";

dotenv.config({ path: ".env.local" });

const OUTPUT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../data/forecast-experiment/bay-wind-v2-coefficients.json"
);

function parseArgs(argv) {
  let thresholdKnots;
  let preset;
  let seasonId = "average";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--threshold" && argv[index + 1]) {
      thresholdKnots = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--preset" && argv[index + 1]) {
      preset = argv[index + 1];
      index += 1;
    } else if (arg === "--season" && argv[index + 1]) {
      seasonId = argv[index + 1];
      index += 1;
    }
  }

  return { thresholdKnots, preset, seasonId };
}

const { thresholdKnots, preset, seasonId } = parseArgs(process.argv.slice(2));
const resolvedThreshold = resolveRideabilityThreshold({ thresholdKnots, preset });
const seasonRanges = ANALYSIS_SEASONS[seasonId]?.ranges ?? ANALYSIS_SEASONS.average.ranges;

console.log(`Mining bay wind coefficients (threshold ${resolvedThreshold} kt)`);
console.log(`Season: ${seasonId} (${seasonRanges.map((r) => `${r.startDateLocal}..${r.endDateLocal}`).join(", ")})`);

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  console.warn("");
  console.warn("NEXT_PUBLIC_CONVEX_URL not set — skipping Convex fetch.");
  console.warn("Commit DEFAULT_BAY_WIND_COEFFICIENTS until a dev Convex env is available.");
  console.warn(`Presets: ${Object.entries(RIDEABILITY_THRESHOLD_PRESETS).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  console.warn(`Default preset: ${DEFAULT_RIDEABILITY_PRESET}`);
  process.exit(0);
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const result = await mineBayWindCoefficients(convex, {
  seasonRanges,
  thresholdKnots: resolvedThreshold,
  preset,
});

if (!result.ok) {
  throw new Error(result.error);
}

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, `${JSON.stringify(result.coefficients, null, 2)}\n`);

console.log("");
console.log(`Overlap: ${result.window.startDateLocal} – ${result.window.endDateLocal} (${result.window.daysAnalyzed} days)`);
console.log(`Lag kick-in pairs: ${result.lagDaysComparable}`);
console.log("");
console.log("Bias sample counts:");
for (const [regime, buckets] of Object.entries(result.sampleCounts.biasByRegimeHour)) {
  for (const [bucket, count] of Object.entries(buckets)) {
    console.log(`  ${regime} ${bucket}: ${count}`);
  }
}
console.log("");
console.log("Lag sample counts:");
for (const [bucket, count] of Object.entries(result.sampleCounts.lagMinutesByForecastPeak)) {
  console.log(`  ${bucket}: ${count}`);
}
console.log("");
console.log(`Wrote ${OUTPUT_PATH}`);
