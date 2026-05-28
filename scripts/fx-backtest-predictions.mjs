/**
 * Compare v1 vs v2/v3/v4 bay kick-in predictions for a summer season.
 *
 * Phase 0 note: By default only runs on seasons with real marina observations (2024-2025).
 * Use --allow-weak-labels to force 2026 or non-marina years (not recommended for model comparison).
 *
 * FX_BACKTEST_SEASON=2025 npm run fx:backtest:predictions
 * FX_BACKTEST_SEASON=2025 npm run fx:backtest:predictions -- --all-presets
 */
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import {
  DEFAULT_ANALYSIS_SEASON_ID,
  resolveAnalysisSeason,
} from "../lib/forecast-experiment/analysisSeasons.js";
import {
  PREDICTION_MODEL_V1,
  PREDICTION_MODEL_V2,
  PREDICTION_MODEL_V3,
  PREDICTION_MODEL_V4,
  runPredictionVersionComparison,
} from "../lib/forecast-experiment/predictionBacktest.js";
import {
  DEFAULT_RIDEABILITY_PRESET,
  RIDEABILITY_THRESHOLD_PRESETS,
  resolveRideabilityThreshold,
} from "../lib/forecast-experiment/rideabilityThresholds.js";

dotenv.config({ path: ".env.local" });

function parseArgs(argv) {
  let preset;
  let thresholdKnots;
  let allowWeakLabels = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--preset" && argv[index + 1]) {
      preset = argv[index + 1];
      index += 1;
    } else if (arg === "--threshold" && argv[index + 1]) {
      thresholdKnots = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--allow-weak-labels") {
      allowWeakLabels = true;
    }
  }
  return { preset, thresholdKnots, allowWeakLabels };
}

function formatSummaryLine(label, summary) {
  const mae = summary.meanAbsoluteErrorMinutes;
  const withinHour =
    summary.daysComparable > 0
      ? `${summary.withinHourCount}/${summary.daysComparable}`
      : "—";
  const precision =
    summary.rideablePrecision != null ? `${Math.round(summary.rideablePrecision * 100)}%` : "—";
  const recall =
    summary.rideableRecall != null ? `${Math.round(summary.rideableRecall * 100)}%` : "—";
  return [
    `${label}:`,
    `MAE ${mae != null ? `${mae} min` : "—"}`,
    `within ±1h ${withinHour}`,
    `precision ${precision}`,
    `recall ${recall}`,
    `false+ ${summary.falsePositiveCount}`,
    `false- ${summary.falseNegativeCount}`,
    `daysComparable ${summary.daysComparable}`,
  ].join(" ");
}

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}

const { preset: presetArg, thresholdKnots: thresholdArg, allowWeakLabels } = parseArgs(process.argv.slice(2));
const seasonId = process.env.FX_BACKTEST_SEASON || DEFAULT_ANALYSIS_SEASON_ID;
const season = resolveAnalysisSeason(seasonId);

if (!season.hasMarinaLabels && !allowWeakLabels) {
  console.error(`\nERROR: Season "${seasonId}" has no marina observations (MARINA_LABEL_YEARS = 2024-2025).`);
  console.error("Kick-in backtest metrics on lag-inferred or insufficient labels are not reliable for model comparison.");
  console.error("Use --allow-weak-labels to run anyway (for NWP skill analysis or exploratory work).\n");
  process.exit(1);
}
const thresholdKnots = resolveRideabilityThreshold({
  thresholdKnots: thresholdArg,
  preset: presetArg ?? process.env.FX_BACKTEST_PRESET ?? DEFAULT_RIDEABILITY_PRESET,
});

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

console.log(`Prediction backtest: ${season.label}`);
console.log(`Threshold: ${thresholdKnots} kt`);
console.log(`Presets: ${Object.keys(RIDEABILITY_THRESHOLD_PRESETS).join(", ")}`);
if (allowWeakLabels) {
  console.log("WARNING: --allow-weak-labels enabled (using non-marina labels)");
}
console.log("");

const result = await runPredictionVersionComparison(convex, {
  seasonId: season.id,
  thresholdKnots,
  preset: presetArg ?? process.env.FX_BACKTEST_PRESET ?? DEFAULT_RIDEABILITY_PRESET,
});

if (!result.ok) {
  throw new Error(result.error);
}

console.log(
  `Overlap: ${result.window.startDateLocal} – ${result.window.endDateLocal} (${result.window.daysInRange} days)`
);
console.log("");
console.log(formatSummaryLine(`${PREDICTION_MODEL_V1} (${result.v1.modelVersionLabel})`, result.v1.summary));
console.log(formatSummaryLine(`${PREDICTION_MODEL_V2} (${result.v2.modelVersionLabel})`, result.v2.summary));
console.log(formatSummaryLine(`${PREDICTION_MODEL_V3} (${result.v3.modelVersionLabel})`, result.v3.summary));
console.log(formatSummaryLine(`${PREDICTION_MODEL_V4} (${result.v4.modelVersionLabel})`, result.v4.summary));

const v1Mae = result.v1.summary.meanAbsoluteErrorMinutes;
const v2Mae = result.v2.summary.meanAbsoluteErrorMinutes;
const v3Mae = result.v3.summary.meanAbsoluteErrorMinutes;
const v4Mae = result.v4.summary.meanAbsoluteErrorMinutes;
if (Number.isFinite(v1Mae) && Number.isFinite(v2Mae)) {
  const deltaV2 = v1Mae - v2Mae;
  console.log("");
  console.log(`v2 MAE delta vs v1: ${deltaV2 > 0 ? "+" : ""}${deltaV2} min (${deltaV2 >= 0 ? "v2 better" : "v1 better"})`);
}
if (Number.isFinite(v2Mae) && Number.isFinite(v3Mae)) {
  const deltaV3 = v2Mae - v3Mae;
  console.log(`v3 MAE delta vs v2: ${deltaV3 > 0 ? "+" : ""}${deltaV3} min (${deltaV3 >= 0 ? "v3 better" : "v2 better"})`);
}
if (Number.isFinite(v3Mae) && Number.isFinite(v4Mae)) {
  const deltaV4 = v3Mae - v4Mae;
  console.log(`v4 MAE delta vs v3: ${deltaV4 > 0 ? "+" : ""}${deltaV4} min (${deltaV4 >= 0 ? "v4 better" : "v3 better"})`);
}
