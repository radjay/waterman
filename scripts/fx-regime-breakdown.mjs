#!/usr/bin/env node
/**
 * Regime breakdown analysis for Phase 1.2.
 *
 * Usage:
 *   FX_BACKTEST_SEASON=2024 node scripts/fx-regime-breakdown.mjs
 *   FX_BACKTEST_SEASON=2025 node scripts/fx-regime-breakdown.mjs
 *
 * Now includes:
 * - Regime distribution (labels + Cabo)
 * - Per-regime FP/FN/precision via real backtest day outcomes (v3.5 + v2)
 *   using the enhanced runPredictionSeasonBacktest (returns raw days) +
 *   classifyDayRegime + computeRegimeStats.
 */

import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import {
  DEFAULT_ANALYSIS_SEASON_ID,
  resolveAnalysisSeason,
} from "../lib/forecast-experiment/analysisSeasons.js";
import {
  classifyDayRegime,
  computeRegimeStats,
  REGIMES,
} from "../lib/forecast-experiment/dayRegimes.js";
import {
  PREDICTION_MODEL_V2,
  PREDICTION_MODEL_V3,
  runPredictionSeasonBacktest,
} from "../lib/forecast-experiment/predictionBacktest.js";
import {
  DEFAULT_RIDEABILITY_PRESET,
  resolveRideabilityThreshold,
} from "../lib/forecast-experiment/rideabilityThresholds.js";

dotenv.config({ path: ".env.local" });

async function main() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
  }

  const seasonId = process.env.FX_BACKTEST_SEASON || DEFAULT_ANALYSIS_SEASON_ID;
  const preset = DEFAULT_RIDEABILITY_PRESET;
  const thresholdKnots = resolveRideabilityThreshold({ preset });

  const season = resolveAnalysisSeason(seasonId);
  console.log(`Regime distribution for ${season.label} @ ${thresholdKnots} kt (cascais-bay)\n`);

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

  // Fetch Cabo for regime tagging (do this first so FP analysis can always run even if labels missing in DB)
  const { startAt } = (await import("../lib/forecast-experiment/time.js")).localDayWindowMs(
    season.ranges[0].startDateLocal,
    "Europe/Lisbon"
  );
  const { endAt } = (await import("../lib/forecast-experiment/time.js")).localDayWindowMs(
    season.ranges[season.ranges.length - 1].endDateLocal,
    "Europe/Lisbon"
  );

  const caboObs = await convex.query("forecastExperiment:listObservationsForWindow", {
    locationSlug: "cabo-raso",
    startAt: startAt - 2 * 3600_000,
    endAt: endAt + 2 * 3600_000,
  });

  const caboByDate = {};
  for (const obs of caboObs || []) {
    const date = new Date(obs.observedAt).toISOString().slice(0, 10);
    if (!caboByDate[date]) caboByDate[date] = [];
    caboByDate[date].push(obs);
  }

  // Fetch labels for cascais-bay in the season (for distribution; may be sparse or absent for some seasons in dev DB)
  const labels = await convex.query("forecastExperiment:listLabelsForWindow", {
    locationSlug: "cascais-bay",
    startDateLocal: season.ranges[0].startDateLocal,
    endDateLocal: season.ranges[season.ranges.length - 1].endDateLocal,
  });

  if (labels && labels.length > 0) {
    const regimeCounts = Object.fromEntries(REGIMES.map(r => [r, 0]));

    for (const label of labels) {
      const caboForDay = caboByDate[label.dateLocal] || [];
      const regime = classifyDayRegime({
        label,
        caboObservations: caboForDay,
        thresholdKnots,
      });
      regimeCounts[regime] = (regimeCounts[regime] || 0) + 1;
    }

    console.log("Regime distribution:");
    const total = labels.length;
    for (const r of REGIMES) {
      const count = regimeCounts[r] || 0;
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
      console.log(`  ${r.padEnd(12)} : ${count.toString().padStart(3)} days (${pct}%)`);
    }

    console.log(`\nTotal days with labels: ${total}`);
  } else {
    console.log("No (or zero) labels found for season in DB — distribution skipped. Per-regime FP analysis will still run from backtest day outcomes + Cabo.");
  }

  console.log("\nNote: In the current dev DB, many 2025 (and some 2024) labeled days are 'no-kick' or 'insufficient-data' (limits regime variety for FP analysis).");

  // --- Phase 1.2: Per-regime FP/FN/precision using real backtest day outcomes ---
  console.log("\n" + "=".repeat(60));
  console.log("Per-regime FP / precision analysis (Phase 1.2) — committed models");
  console.log("=".repeat(60));

  const modelsToAnalyze = [
    { version: PREDICTION_MODEL_V3, name: "v3.5 (ML)" },
    { version: PREDICTION_MODEL_V2, name: "v2 (rules)" },
  ];

  for (const m of modelsToAnalyze) {
    console.log(`\n${m.name} @ ${thresholdKnots} kt (preset: ${preset || DEFAULT_RIDEABILITY_PRESET})`);
    const bt = await runPredictionSeasonBacktest(convex, {
      seasonId: season.id,
      modelVersion: m.version,
      thresholdKnots,
      preset,
    });
    if (!bt.ok) {
      console.log(`  ERROR: backtest failed — ${bt.error}`);
      continue;
    }

    // Join each backtest day with regime (re-use the labels + caboByDate fetched above)
    const regimeDays = [];
    for (const day of bt.days || []) {
      if (!day.hasForecastData) continue;
      const labelForRegime = labels.find((l) => l.dateLocal === day.dateLocal) || {
        dateLocal: day.dateLocal,
        actualKickInAt: day.actual?.kickInAt,
      };
      const caboForDay = caboByDate[day.dateLocal] || [];
      const regime = classifyDayRegime({
        label: labelForRegime,
        caboObservations: caboForDay,
        thresholdKnots,
      });
      regimeDays.push({
        dateLocal: day.dateLocal,
        regime,
        predictedRideable: !!(day.predicted && day.predicted.kickInP50At),
        actualRideable: !!day.actual?.kickInAt,
      });
    }

    const stats = computeRegimeStats(regimeDays);

    console.log("  regime       days   FP  FN  prec   FP-rate");
    console.log("  " + "-".repeat(52));
    let modelFP = 0;
    let modelFN = 0;
    for (const r of REGIMES) {
      const s = stats[r] || { count: 0, falsePositive: 0, falseNegative: 0, precision: 0, falsePositiveRate: 0 };
      modelFP += s.falsePositive;
      modelFN += s.falseNegative;
      const prec = s.count > 0 ? `${(s.precision * 100).toFixed(0)}%` : "—";
      const rate = `${(s.falsePositiveRate * 100).toFixed(1)}%`;
      console.log(
        `  ${r.padEnd(12)} ${String(s.count).padStart(5)} ${String(s.falsePositive).padStart(4)} ${String(s.falseNegative).padStart(3)} ${prec.padStart(5)} ${rate.padStart(8)}`
      );
    }
    console.log(`  TOTAL FP/FN this model on season: ${modelFP} / ${modelFN}`);
    if (bt.summary) {
      const p = bt.summary.rideablePrecision != null ? (bt.summary.rideablePrecision * 100).toFixed(0) + "%" : "—";
      console.log(`  Overall backtest: FP ${bt.summary.falsePositiveCount || 0}, FN ${bt.summary.falseNegativeCount || 0}, prec ${p}`);
    }
  }

  console.log("\n1.2 Notes:");
  console.log("- v3.5 (committed calibration) shows very low total FP on full 2024/2025 seasons (see 1.3 preset matrix).");
  console.log("- Per-regime view shows error clustering (or confirms rarity across regimes).");
  console.log("- Dev DB currently yields mostly 'other' due to limited kick-day + Cabo variety in labels.");
  console.log("- End-to-end: classifyDayRegime + computeRegimeStats now driven by real prediction outcomes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});