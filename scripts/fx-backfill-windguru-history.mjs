import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";
import { FX_WINDGURU_BACKFILL } from "../lib/forecast-experiment/locations.js";
import { dateRangeWeeks } from "../lib/forecast-experiment/time.js";
import {
  fetchWindguruStationData,
  parseWindguruStationData,
} from "../lib/forecast-experiment/windguruClient.js";

dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const workerName = "fx-backfill-windguru-history";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}

const startDate = process.env.FX_BACKFILL_START_DATE;
const endDate = process.env.FX_BACKFILL_END_DATE || new Date().toISOString().slice(0, 10);
const avgMinutes = Number(process.env.FX_BACKFILL_AVG_MINUTES || "10");
const stationFilter = process.env.FX_BACKFILL_STATION_ID;

const workerRunId = await convex.mutation(api.forecastExperiment.startWorkerRun, {
  workerName,
  metadata: { startDate, endDate, avgMinutes, stationFilter },
});

let attemptedCount = 0;
let insertedCount = 0;
let skippedCount = 0;

try {
  const targets = FX_WINDGURU_BACKFILL.filter((item) =>
    !stationFilter || item.stationId === stationFilter
  );

  for (const target of targets) {
    const rangeStart = startDate || target.startDate;
    const rangeEnd = target.endDate || endDate;
    const weeks = dateRangeWeeks(rangeStart, rangeEnd);

    for (const week of weeks) {
      attemptedCount += 1;
      const json = await fetchWindguruStationData({
        stationId: target.stationId,
        from: week.from,
        to: week.to,
        avgMinutes,
      });
      const observations = parseWindguruStationData(json, {
        sourceSlug: target.sourceSlug,
        stationId: target.stationId,
        locationSlug: target.locationSlug,
      }).filter((obs) => obs.quality !== "suspect");

      if (observations.length === 0) {
        skippedCount += 1;
        await sleep(500);
        continue;
      }

      const result = await convex.mutation(api.forecastExperiment.saveObservations, {
        observations,
      });
      insertedCount += result.inserted;
      skippedCount += result.skipped;
      await sleep(500);
    }
  }

  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "success",
    attemptedCount,
    insertedCount,
    skippedCount,
  });

  console.log(`Backfill complete: inserted=${insertedCount}, skipped=${skippedCount}, attempted=${attemptedCount}`);
} catch (error) {
  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: insertedCount > 0 ? "partial" : "failed",
    attemptedCount,
    insertedCount,
    skippedCount,
    errorMessage: error.message,
  });
  throw error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
