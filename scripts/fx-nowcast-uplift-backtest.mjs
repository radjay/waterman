/**
 * Phase 5 verification — historical nowcast uplift vs day-ahead Forecast.
 *
 * FX_BACKTEST_SEASON=2025 npm run fx:nowcast:uplift
 * FX_BACKTEST_SEASON=2024 npm run fx:nowcast:uplift -- --nowcast-hour 11
 */
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import {
  DEFAULT_ANALYSIS_SEASON_ID,
  resolveAnalysisSeason,
} from "../lib/forecast-experiment/analysisSeasons.js";
import { runNowcastUpliftBacktest } from "../lib/forecast-experiment/nowcastUpliftBacktest.js";
import {
  DEFAULT_RIDEABILITY_PRESET,
  resolveRideabilityThreshold,
} from "../lib/forecast-experiment/rideabilityThresholds.js";

dotenv.config({ path: ".env.local" });

function parseArgs(argv) {
  let preset;
  let thresholdKnots;
  let forecastHour = 7;
  let nowcastHour = 11;
  let strongCaboBeforeHour = 12;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--preset" && argv[index + 1]) {
      preset = argv[index + 1];
      index += 1;
    } else if (arg === "--threshold" && argv[index + 1]) {
      thresholdKnots = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--forecast-hour" && argv[index + 1]) {
      forecastHour = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--nowcast-hour" && argv[index + 1]) {
      nowcastHour = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--strong-cabo-before" && argv[index + 1]) {
      strongCaboBeforeHour = Number(argv[index + 1]);
      index += 1;
    }
  }

  return { preset, thresholdKnots, forecastHour, nowcastHour, strongCaboBeforeHour };
}

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}

const {
  preset: presetArg,
  thresholdKnots: thresholdArg,
  forecastHour,
  nowcastHour,
  strongCaboBeforeHour,
} = parseArgs(process.argv.slice(2));

const seasonId = process.env.FX_BACKTEST_SEASON || DEFAULT_ANALYSIS_SEASON_ID;
const season = resolveAnalysisSeason(seasonId);
const thresholdKnots = resolveRideabilityThreshold({
  thresholdKnots: thresholdArg,
  preset: presetArg ?? process.env.FX_BACKTEST_PRESET ?? DEFAULT_RIDEABILITY_PRESET,
});

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

console.log(`Phase 5 nowcast uplift backtest — ${season.label}`);
console.log(`Threshold: ${thresholdKnots} kt · model ${"v3.5"}`);
console.log(
  `Cutoffs: Forecast ${forecastHour}:00 · Nowcast ${nowcastHour}:00 · strong Cabo before ${strongCaboBeforeHour}:00`
);
console.log("");

const result = await runNowcastUpliftBacktest(convex, {
  seasonId: season.id,
  thresholdKnots,
  preset: presetArg ?? process.env.FX_BACKTEST_PRESET ?? DEFAULT_RIDEABILITY_PRESET,
  forecastCutoffHour: forecastHour,
  nowcastCutoffHour: nowcastHour,
  strongCaboBeforeHour,
});

if (!result.ok) {
  console.error(result.error);
  process.exit(1);
}

const { summary } = result;

console.log(
  `Window: ${result.window.startDateLocal} – ${result.window.endDateLocal} (${result.window.daysInRange} days)`
);
console.log("");
console.log(`Qualifying days (observed kick-in + strong early Cabo): ${summary.qualifyingDayCount}`);
console.log(`Comparable (both layers predicted kick-in): ${summary.comparableDayCount}`);
console.log("");
console.log(`Forecast MAE: ${summary.meanForecastErrorMinutes ?? "—"} min`);
console.log(`Nowcast MAE:  ${summary.meanNowcastErrorMinutes ?? "—"} min`);
console.log(`Mean uplift:  ${summary.meanUpliftMinutes ?? "—"} min (positive = nowcast tighter)`);
console.log(`Median uplift: ${summary.medianUpliftMinutes ?? "—"} min`);
console.log(
  `Improved: ${summary.improvedCount}/${summary.comparableDayCount}` +
    (summary.improvedShare != null ? ` (${Math.round(summary.improvedShare * 100)}%)` : "")
);
console.log("");
console.log(
  summary.passesVerification
    ? "PASS — nowcast materially tighter than day-ahead Forecast on strong-Cabo days"
    : "FAIL — does not meet Phase 5 uplift bar (mean uplift ≥ 15 min, ≥50% days improved, ≥5 comparable days)"
);

if (summary.comparableDayCount > 0 && summary.comparableDayCount <= 15) {
  console.log("");
  console.log("Per-day uplift (min, positive = nowcast better):");
  for (const day of result.days.filter((d) => d.forecast?.kickInP50At && d.nowcast?.kickInP50At)) {
    console.log(
      `  ${day.dateLocal}: forecast err ${day.forecastErrorMinutes ?? "—"}, nowcast err ${day.nowcastErrorMinutes ?? "—"}, uplift ${day.upliftMinutes ?? "—"}`
    );
  }
}

process.exit(summary.passesVerification ? 0 : 1);
