#!/usr/bin/env node
/**
 * Average and peak effective wind on nortada days, by month.
 * Only counts readings in the active nortada window (> 10 kt, 06:00–21:00 Lisbon).
 *
 * FX_BACKTEST_SEASON=average npm run fx:analyze:nortada-winds
 */

import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";
import {
  DEFAULT_ANALYSIS_SEASON_ID,
  resolveAnalysisSeason,
} from "../lib/forecast-experiment/analysisSeasons.js";
import { NORTADA_ACTIVE_WINDOW_MIN_KNOTS, NORTADA_STATIONS } from "../lib/forecast-experiment/dayRegimes.js";
import { fetchSeasonObservationsGroupedByDate } from "../lib/forecast-experiment/fetchObservations.js";
import { analyzeNortadaWindByMonth } from "../lib/forecast-experiment/nortadaWindAnalysis.js";

dotenv.config({ path: ".env.local" });

const seasonId = process.env.FX_BACKTEST_SEASON || DEFAULT_ANALYSIS_SEASON_ID;
const timezone = "Europe/Lisbon";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const season = resolveAnalysisSeason(seasonId);

function printTable(title, rows) {
  console.log(`\n${title}`);
  console.log("Month     Days  Avg wind  Avg peak  Max peak");
  console.log("------    ----  --------  --------  --------");
  for (const [month, stats] of rows) {
    console.log(
      `${month.padEnd(8)}  ${String(stats.days).padStart(4)}  ${String(stats.avgWindKnots).padStart(8)}  ${String(stats.avgPeakKnots).padStart(8)}  ${String(stats.maxPeakKnots).padStart(8)}`
    );
  }
}

async function main() {
  const observationsByStation = {};
  for (const slug of NORTADA_STATIONS) {
    const byDate = await fetchSeasonObservationsGroupedByDate(convex, {
      locationSlug: slug,
      ranges: season.ranges,
      timezone,
    });
    observationsByStation[slug] = Object.fromEntries(byDate.entries());
  }

  const labels = [];
  for (const range of season.ranges) {
    const rows = await convex.query(api.forecastExperiment.listLabelsForWindow, {
      locationSlug: "cascais-bay",
      startDateLocal: range.startDateLocal,
      endDateLocal: range.endDateLocal,
    });
    labels.push(...(rows || []));
  }

  const analysis = analyzeNortadaWindByMonth({
    nortadaLabels: labels,
    observationsByStation,
    timezone,
  });

  console.log(`Nortada wind analysis — ${season.label}`);
  console.log(
    `Active window: > ${NORTADA_ACTIVE_WINDOW_MIN_KNOTS} kt effective, 06:00–21:00 Lisbon`
  );
  console.log(`Stations pooled: ${NORTADA_STATIONS.join(", ")}`);

  printTable(
    "By calendar month (all years pooled)",
    Object.entries(analysis.byCalendarMonth)
  );
  printTable(
    "By year-month (pooled stations)",
    Object.entries(analysis.byYearMonth)
  );

  for (const station of NORTADA_STATIONS) {
    const rows = Object.entries(analysis.byYearMonthStation[station] || {});
    if (rows.length === 0) {
      console.log(`\n=== ${station} ===\n(no readings > ${NORTADA_ACTIVE_WINDOW_MIN_KNOTS} kt in active window)`);
      continue;
    }
    printTable(`=== ${station} ===`, rows);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
