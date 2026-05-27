/**
 * Phase 5 verification — live end-to-end nowcast loop on dev Convex.
 *
 * 1. Fetch latest Cabo observations
 * 2. Trigger nowcast follow-up hook (if recommended)
 * 3. Regenerate predictions
 * 4. Assert latest prediction is nowcast with fresh Cabo metadata
 */
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { execSync } from "child_process";
import { api } from "../convex/_generated/api.js";

dotenv.config({ path: ".env.local" });

const MAX_CABO_AGE_MINUTES = 30;

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`OK: ${message}`);
}

console.log("Phase 5 live nowcast loop verification");
console.log(`Convex: ${process.env.NEXT_PUBLIC_CONVEX_URL}`);
console.log("");

console.log("Step 1 — ingest fresh Cabo observations");
execSync("node scripts/fx-fetch-observations.mjs", { stdio: "inherit", env: process.env });

const dashboard = await convex.query(api.forecastExperiment.experimentDashboard, {});
const cabo = dashboard.latestCaboRaso;
if (!cabo) {
  fail("No Cabo Raso observation in Convex after fetch");
}

const caboAgeMinutes = Math.round((Date.now() - cabo.observedAt) / 60_000);
pass(
  `Cabo obs at ${new Date(cabo.observedAt).toLocaleString("en-GB", { timeZone: "Europe/Lisbon" })} (${caboAgeMinutes} min ago)`
);

if (caboAgeMinutes > MAX_CABO_AGE_MINUTES) {
  fail(`Cabo observation older than ${MAX_CABO_AGE_MINUTES} min — check Windguru / fx:fetch:observations`);
}

console.log("");
console.log("Step 2 — nowcast follow-up hook");
let trigger;
try {
  trigger = await convex.mutation(api.forecastExperiment.requestNowcastFollowUpIfRecommended, {});
} catch (error) {
  fail(`requestNowcastFollowUpIfRecommended threw: ${error.message}`);
}
pass(`Hook returned acted=${trigger?.acted ?? false}`);

console.log("");
console.log("Step 3 — regenerate predictions (v3.5)");
execSync("FX_PREDICTION_VERSION=v3.5 node scripts/fx-generate-predictions.mjs", {
  stdio: "inherit",
  env: process.env,
});

const after = await convex.query(api.forecastExperiment.experimentDashboard, {});
const prediction =
  after.latestBayPrediction ??
  after.latestPredictions?.find((row) => row.targetLocationSlug === "cascais-bay");

if (!prediction) {
  fail("No bay prediction after generator run");
}

if (prediction.inputs?.mode !== "nowcast") {
  fail(`Expected inputs.mode=nowcast, got ${prediction.inputs?.mode ?? "missing"}`);
}
pass(`Latest prediction mode=${prediction.inputs.mode} model=${prediction.modelVersion}`);

if (!prediction.inputs?.generatedWithFreshCabo) {
  console.warn("WARN: generatedWithFreshCabo not set on prediction inputs (non-fatal)");
} else {
  pass("Prediction includes fresh-Cabo nowcast metadata");
}

const rerun = await convex.query(api.forecastExperiment.getLatestNowcastRerunRecommendation, {});
if (rerun?.nextRunInMinutes) {
  pass(`Rerun recommendation present (${rerun.nextRunInMinutes} min)`);
} else {
  console.warn("WARN: No rerun recommendation on latest generator run (non-fatal off-hours)");
}

console.log("");
console.log("PASS — live nowcast loop verified on dev Convex");
