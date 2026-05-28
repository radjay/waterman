/**
 * Phase 5 verification — historical nowcast uplift vs day-ahead Forecast.
 *
 * FX_BACKTEST_SEASON=2025 npm run fx:nowcast:uplift
 * FX_BACKTEST_SEASON=2025 npm run fx:nowcast:uplift -- --sweep-cutoffs
 * FX_BACKTEST_SEASON=2025 npm run fx:nowcast:uplift -- --regime nortada
 */
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import {
  DEFAULT_ANALYSIS_SEASON_ID,
  resolveAnalysisSeason,
} from "../lib/forecast-experiment/analysisSeasons.js";
import {
  REGIME_FILTER_NORTADA,
  runNowcastCutoffSweep,
  runNowcastUpliftBacktest,
} from "../lib/forecast-experiment/nowcastUpliftBacktest.js";
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
  let sweepCutoffs = false;
  let regime = "all";

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
    } else if (arg === "--sweep-cutoffs") {
      sweepCutoffs = true;
    } else if (arg === "--regime" && argv[index + 1]) {
      regime = argv[index + 1];
      index += 1;
    }
  }

  return {
    preset,
    thresholdKnots,
    forecastHour,
    nowcastHour,
    strongCaboBeforeHour,
    sweepCutoffs,
    regime,
  };
}

function printSummaryLine(label, summary) {
  console.log(
    `${label}: comparable ${summary.comparableDayCount}, uplift ${summary.meanUpliftMinutes ?? "—"} min, improved ${summary.improvedCount}/${summary.comparableDayCount}` +
      (summary.improvedShare != null ? ` (${Math.round(summary.improvedShare * 100)}%)` : "") +
      (summary.passesVerification ? " PASS" : "")
  );
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
  sweepCutoffs,
  regime,
} = parseArgs(process.argv.slice(2));

const seasonId = process.env.FX_BACKTEST_SEASON || DEFAULT_ANALYSIS_SEASON_ID;
const season = resolveAnalysisSeason(seasonId);
const thresholdKnots = resolveRideabilityThreshold({
  thresholdKnots: thresholdArg,
  preset: presetArg ?? process.env.FX_BACKTEST_PRESET ?? DEFAULT_RIDEABILITY_PRESET,
});
const regimeFilter = regime === "nortada" ? REGIME_FILTER_NORTADA : "all";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

console.log(`Phase 5 nowcast uplift — ${season.label}`);
console.log(`Threshold: ${thresholdKnots} kt · regime: ${regimeFilter}`);
console.log("");

if (sweepCutoffs) {
  console.log(`Sweeping nowcast cutoff hours (Forecast fixed @ ${forecastHour}:00)…`);
  const sweepResult = await runNowcastCutoffSweep(convex, {
    seasonId: season.id,
    thresholdKnots,
    preset: presetArg ?? process.env.FX_BACKTEST_PRESET ?? DEFAULT_RIDEABILITY_PRESET,
    forecastCutoffHour: forecastHour,
    strongCaboBeforeHour,
    regimeFilter,
  });

  if (!sweepResult.ok) {
    console.error(sweepResult.error);
    process.exit(1);
  }

  for (const row of sweepResult.sweep) {
    printSummaryLine(`Nowcast @ ${row.nowcastCutoffHour}:00`, row.summary);
  }

  console.log("");
  if (sweepResult.best) {
    console.log(
      `Best cutoff: ${sweepResult.best.nowcastCutoffHour}:00 (mean uplift ${sweepResult.best.summary.meanUpliftMinutes ?? "—"} min)`
    );
    process.exit(sweepResult.best.summary.passesVerification ? 0 : 1);
  }
  process.exit(1);
}

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
  regimeFilter,
});

if (!result.ok) {
  console.error(result.error);
  process.exit(1);
}

const { summary } = result;

console.log(
  `Window: ${result.window.startDateLocal} – ${result.window.endDateLocal} (${result.window.daysInRange} days)`
);
console.log(`Nowcast model: ${result.nowcastModelVersion}`);
console.log("");
console.log(`Qualifying days: ${summary.qualifyingDayCount}`);
console.log(`Comparable: ${summary.comparableDayCount}`);
console.log("");
console.log(`Forecast MAE: ${summary.meanForecastErrorMinutes ?? "—"} min`);
console.log(`Nowcast MAE:  ${summary.meanNowcastErrorMinutes ?? "—"} min`);
console.log(`Mean uplift:  ${summary.meanUpliftMinutes ?? "—"} min`);
console.log(
  `Improved: ${summary.improvedCount}/${summary.comparableDayCount}` +
    (summary.improvedShare != null ? ` (${Math.round(summary.improvedShare * 100)}%)` : "")
);
console.log("");
console.log(
  summary.passesVerification
    ? "PASS — nowcast materially tighter than day-ahead Forecast"
    : "FAIL — does not meet Phase 5 uplift bar"
);

process.exit(summary.passesVerification ? 0 : 1);
