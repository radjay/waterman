#!/usr/bin/env node
/**
 * Rebuild marina daily labels and persist dayRegime tags from Cabo + Marina observations.
 *
 * Usage:
 *   FX_BACKTEST_SEASON=2025 npm run fx:backfill:regimes
 *   FX_BACKTEST_SEASON=average npm run fx:backfill:regimes -- --dry-run
 */

import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";
import {
  DEFAULT_ANALYSIS_SEASON_ID,
  resolveAnalysisSeason,
} from "../lib/forecast-experiment/analysisSeasons.js";
import { buildDayRegimeTag, REGIMES } from "../lib/forecast-experiment/dayRegimes.js";
import { fetchSeasonObservationsGroupedByDate } from "../lib/forecast-experiment/fetchObservations.js";
import { buildDailyLabel } from "../lib/forecast-experiment/labels.js";
import { FX_LOCATIONS } from "../lib/forecast-experiment/locations.js";
import { addDays, localDayWindowMs } from "../lib/forecast-experiment/time.js";
import {
  DEFAULT_RIDEABILITY_PRESET,
  resolveRideabilityThreshold,
} from "../lib/forecast-experiment/rideabilityThresholds.js";

dotenv.config({ path: ".env.local" });

const dryRun = process.argv.includes("--dry-run");
const seasonId = process.env.FX_BACKTEST_SEASON || DEFAULT_ANALYSIS_SEASON_ID;
const preset = process.env.FX_RIDEABILITY_PRESET || DEFAULT_RIDEABILITY_PRESET;
const thresholdKnots = resolveRideabilityThreshold({ preset });

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const bayLocation = FX_LOCATIONS.find((item) => item.slug === "cascais-bay");
if (!bayLocation) {
  throw new Error("cascais-bay location config missing");
}

function listDatesInSeason(season) {
  const dates = [];
  for (const range of season.ranges) {
    let cursor = range.startDateLocal;
    while (cursor <= range.endDateLocal) {
      dates.push(cursor);
      cursor = addDays(cursor, 1);
    }
  }
  return dates;
}

async function fetchObservationsByDate(locationSlug, ranges, timezone) {
  return fetchSeasonObservationsGroupedByDate(convex, {
    locationSlug,
    ranges,
    timezone,
  });
}

async function main() {
  const season = resolveAnalysisSeason(seasonId);
  if (!season.hasMarinaLabels && seasonId !== "average") {
    console.warn(`Season ${seasonId} has no marina labels — backfill may be sparse.`);
  }

  console.log(
    `Backfill labels + regimes for ${season.label} @ ${thresholdKnots} kt (${preset})${dryRun ? " [dry-run]" : ""}\n`
  );

  const datesLocal = listDatesInSeason(season);
  const marinaByDate = await fetchObservationsByDate("cascais-bay", season.ranges, bayLocation.timezone);
  const caboByDate = await fetchObservationsByDate("cabo-raso", season.ranges, bayLocation.timezone);
  const guinchoByDate = await fetchObservationsByDate("guincho", season.ranges, bayLocation.timezone);

  const regimeCounts = Object.fromEntries(REGIMES.map((regime) => [regime, 0]));
  const statusCounts = {};
  let saved = 0;

  for (const dateLocal of datesLocal) {
    const { startAt, endAt } = localDayWindowMs(dateLocal, bayLocation.timezone);
    const dayMarina = (marinaByDate.get(dateLocal) || []).filter(
      (obs) => obs.observedAt >= startAt && obs.observedAt < endAt
    );
    const dayCabo = caboByDate.get(dateLocal) || [];
    const dayGuincho = guinchoByDate.get(dateLocal) || [];

    const label = buildDailyLabel({
      locationSlug: bayLocation.slug,
      dateLocal,
      observations: dayMarina,
      reports: [],
      caboRasoObservations: dayCabo,
      thresholdKnots,
    });

    const { dayRegime, regimeSummary } = buildDayRegimeTag({
      label,
      caboObservations: dayCabo,
      marinaObservations: dayMarina,
      guinchoObservations: dayGuincho,
      thresholdKnots,
      timezone: bayLocation.timezone,
    });

    regimeCounts[dayRegime] = (regimeCounts[dayRegime] || 0) + 1;
    statusCounts[label.labelStatus] = (statusCounts[label.labelStatus] || 0) + 1;

    const doc = {
      ...label,
      dayRegime,
      regimeSummary,
    };

    if (!dryRun) {
      await convex.mutation(api.forecastExperiment.saveDailyLabel, doc);
      saved += 1;
    }
  }

  console.log("Label status distribution:");
  for (const [status, count] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${status.padEnd(18)} ${count}`);
  }

  console.log("\nDay regime distribution:");
  for (const regime of REGIMES) {
    const count = regimeCounts[regime] || 0;
    const pct = datesLocal.length > 0 ? ((count / datesLocal.length) * 100).toFixed(1) : "0.0";
    console.log(`  ${regime.padEnd(12)} ${String(count).padStart(4)} (${pct}%)`);
  }

  const nortadaDays = datesLocal.filter((dateLocal) => {
    const { startAt, endAt } = localDayWindowMs(dateLocal, bayLocation.timezone);
    const dayMarina = (marinaByDate.get(dateLocal) || []).filter(
      (obs) => obs.observedAt >= startAt && obs.observedAt < endAt
    );
    const { dayRegime } = buildDayRegimeTag({
      label: { dateLocal },
      caboObservations: caboByDate.get(dateLocal) || [],
      marinaObservations: dayMarina,
      guinchoObservations: guinchoByDate.get(dateLocal) || [],
      thresholdKnots,
      timezone: bayLocation.timezone,
    });
    return dayRegime === "nortada";
  }).length;

  console.log(`\nNortada days (observed north wind): ${nortadaDays}`);
  console.log(`Total days processed: ${datesLocal.length}`);
  if (dryRun) {
    console.log("Dry run — no rows written.");
  } else {
    console.log(`Saved ${saved} label rows to fx_daily_labels.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
