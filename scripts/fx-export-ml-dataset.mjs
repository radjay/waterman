import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { ANALYSIS_SEASONS } from "../lib/forecast-experiment/analysisSeasons.js";
import { exportMlDatasetFromConvex } from "../lib/forecast-experiment/mlDataset.js";
import {
  RIDEABILITY_THRESHOLD_PRESETS,
  resolveRideabilityThreshold,
} from "../lib/forecast-experiment/rideabilityThresholds.js";

dotenv.config({ path: ".env.local" });

const OUTPUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../data/forecast-experiment/ml-training"
);

function parseArgs(argv) {
  let seasonId = "average";
  let thresholdKnots;
  let preset;
  let allPresets = false;
  // Default ON for Phase 0 honest labels (only use real marina "observed" rows for supervised training)
  let observedOnly = true;
  // Phase 5 5.6: --nowcast produces training rows with later cutoff (e.g. midday) and nowcastMode=true
  // so the model can learn dynamic-Cabo same-day tightening scenarios.
  let nowcast = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--season" && argv[index + 1]) {
      seasonId = argv[index + 1];
      index += 1;
    } else if (arg === "--threshold" && argv[index + 1]) {
      thresholdKnots = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--preset" && argv[index + 1]) {
      preset = argv[index + 1];
      index += 1;
    } else if (arg === "--all-presets") {
      allPresets = true;
    } else if (arg === "--observed-only") {
      observedOnly = true;
    } else if (arg === "--no-observed-only") {
      observedOnly = false;
    } else if (arg === "--nowcast") {
      nowcast = true;
    }
  }

  return { seasonId, thresholdKnots, preset, allPresets, observedOnly, nowcast };
}

function rowToJsonl(row) {
  return JSON.stringify({
    dateLocal: row.dateLocal,
    summerYear: row.summerYear,
    thresholdKnots: row.thresholdKnots,
    preset: row.preset,
    cutoffHourLocal: row.cutoffHourLocal,
    nowcastMode: row.nowcastMode ?? false,   // Phase 5 5.6: true for dynamic-Cabo / same-day training rows
    features: row.features,
    actualKickInMinutes: row.actualKickInMinutes,
    labelStatus: row.labelStatus,
    hourlyRideable: row.hourlyRideable,
  });
}

const { seasonId, thresholdKnots, preset, allPresets, observedOnly, nowcast } = parseArgs(process.argv.slice(2));
const seasonRanges = ANALYSIS_SEASONS[seasonId]?.ranges ?? ANALYSIS_SEASONS.average.ranges;
const thresholdPresets = allPresets
  ? Object.entries(RIDEABILITY_THRESHOLD_PRESETS).map(([slug, knots]) => ({
      preset: slug,
      thresholdKnots: knots,
    }))
  : undefined;
const resolvedThreshold = resolveRideabilityThreshold({ thresholdKnots, preset });

console.log(`Export ML dataset (threshold ${resolvedThreshold} kt)`);
console.log(`Season: ${seasonId}`);
if (allPresets) {
  console.log(`Presets: ${Object.keys(RIDEABILITY_THRESHOLD_PRESETS).join(", ")}`);
}

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  console.warn("");
  console.warn("NEXT_PUBLIC_CONVEX_URL not set — skipping Convex fetch.");
  process.exit(0);
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const result = await exportMlDatasetFromConvex(convex, {
  seasonRanges,
  thresholdKnots,
  preset,
  thresholdPresets,
  nowcast,   // Phase 5 5.6: when true, rows use later cutoff + nowcastMode for dynamic-Cabo training
});

if (!result.ok) {
  throw new Error(result.error);
}

mkdirSync(OUTPUT_DIR, { recursive: true });

let rows = result.rows ?? [];
let bySummerYear = result.bySummerYear ?? {};

if (observedOnly) {
  const before = rows.length;
  rows = rows.filter((r) => r.labelStatus === "observed");
  bySummerYear = Object.fromEntries(
    Object.entries(bySummerYear).map(([y, yearRows]) => [
      y,
      yearRows.filter((r) => r.labelStatus === "observed"),
    ])
  );
  console.log(`--observed-only (default on): kept ${rows.length} / ${before} rows with labelStatus === "observed"`);
}

writeFileSync(
  join(OUTPUT_DIR, "manifest.json"),
  `${JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      seasonId,
      observedOnly,
      nowcast,
      window: result.window,
      featureNames: result.featureNames,
      rowCount: rows.length,
      labeledKickInCount: rows.filter((r) => r.actualKickInMinutes != null).length,
    },
    null,
    2
  )}\n`
);

writeFileSync(join(OUTPUT_DIR, nowcast ? "all-nowcast.jsonl" : "all.jsonl"), `${rows.map(rowToJsonl).join("\n")}\n`);

for (const [year, yearRows] of Object.entries(bySummerYear)) {
  writeFileSync(join(OUTPUT_DIR, `${year}.jsonl`), `${yearRows.map(rowToJsonl).join("\n")}\n`);
}

console.log("");
console.log(`Overlap: ${result.window.startDateLocal} – ${result.window.endDateLocal} (${result.window.daysInRange} days)`);
console.log(`Rows: ${rows.length} (after observedOnly filter)`);
console.log(`Wrote ${OUTPUT_DIR}/*.jsonl`);
