import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";
import { FX_LOCATIONS, FX_MODELS } from "../lib/forecast-experiment/locations.js";
import { buildPreviousRunsUrl } from "../lib/forecast-experiment/openMeteoClient.js";
import { leadHours } from "../lib/forecast-experiment/time.js";
import { parseNumericKnots } from "../lib/forecast-experiment/units.js";

dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const workerName = "fx-backfill-openmeteo-previous-runs";
const startDate = process.env.FX_BACKFILL_START_DATE || "2025-05-01";
const endDate = process.env.FX_BACKFILL_END_DATE || "2025-09-30";
const monthChunks = buildMonthChunks(startDate, endDate);

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}

const workerRunId = await convex.mutation(api.forecastExperiment.startWorkerRun, {
  workerName,
  metadata: { startDate, endDate },
});

let insertedCount = 0;
let skippedCount = 0;

try {
  for (const location of FX_LOCATIONS.filter((item) => item.role !== "context")) {
    await convex.mutation(api.forecastExperiment.upsertLocation, {
      ...location,
      enabled: true,
    });
  }

  for (const chunk of monthChunks) {
    console.log(`Backfilling ${chunk.startDate} → ${chunk.endDate} (run ${chunk.runStartedAt})`);
    for (const model of FX_MODELS.filter((item) => item.enabled)) {
      const url = buildPreviousRunsUrl({
        location: FX_LOCATIONS[0],
        model,
        startDate: chunk.startDate,
        endDate: chunk.endDate,
      });
      const response = await fetch(url);
      const text = await response.text();
      if (!response.ok) {
        console.warn(`Skipping ${model.model} ${chunk.startDate}: ${response.status} ${text.slice(0, 200)}`);
        continue;
      }
      const json = JSON.parse(text);
      const hourly = json.hourly;
      if (!hourly?.time) continue;

      for (const dayOffset of [0, 1, 2]) {
        const runStartedAt = Date.parse(`${chunk.runStartedAt}T00:00:00Z`);
        const speedKey = `wind_speed_10m_previous_day${dayOffset}`;
        const gustKey = `wind_gusts_10m_previous_day${dayOffset}`;
        const dirKey = `wind_direction_10m_previous_day${dayOffset}`;
        if (!hourly[speedKey]) continue;

        const points = hourly.time.map((time, index) => {
          const validTime = Date.parse(`${time}Z`);
          return {
            locationSlug: FX_LOCATIONS[0].slug,
            validTime,
            leadHours: leadHours(runStartedAt, validTime),
            intervalMinutes: 60,
            windSpeedKnots: parseNumericKnots(hourly[speedKey]?.[index]),
            windGustKnots: parseNumericKnots(hourly[gustKey]?.[index]),
            windDirectionDeg: parseNumericKnots(hourly[dirKey]?.[index]),
          };
        }).filter((point) => point.windSpeedKnots !== undefined || point.windGustKnots !== undefined);

        if (points.length === 0) continue;

        const result = await convex.mutation(api.forecastExperiment.saveForecastRunWithPoints, {
          run: {
            provider: model.provider,
            model: `${model.model}-previous-day${dayOffset}`,
            providerModel: model.openMeteoModel,
            runStartedAt,
            fetchedAt: Date.now(),
            status: "success",
            sourceUrl: url.toString(),
            forecastDays: 7,
            variables: [speedKey, gustKey, dirKey],
          },
          points,
        });
        insertedCount += result.insertedPoints;
        skippedCount += result.skipped ? 1 : 0;
        if (result.insertedPoints > 0) {
          console.log(`  ${model.model}-day${dayOffset}: +${result.insertedPoints} points`);
        }
      }
      await sleep(500);
    }
  }

  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "success",
    attemptedCount: FX_MODELS.length,
    insertedCount,
    skippedCount,
  });
} catch (error) {
  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "failed",
    errorMessage: error.message,
    insertedCount,
    skippedCount,
  });
  throw error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** One chunk per calendar month; runStartedAt is the first of that month. */
function buildMonthChunks(startDate, endDate) {
  const rangeStart = new Date(`${startDate}T00:00:00Z`);
  const rangeEnd = new Date(`${endDate}T00:00:00Z`);
  const chunks = [];
  let cursor = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1));

  while (cursor <= rangeEnd) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(Date.UTC(year, month + 1, 0));
    const chunkStart = rangeStart > cursor ? startDate : monthStart;
    const chunkEnd = lastDay > rangeEnd ? endDate : lastDay.toISOString().slice(0, 10);
    chunks.push({
      startDate: chunkStart,
      endDate: chunkEnd,
      runStartedAt: monthStart,
    });
    cursor = new Date(Date.UTC(year, month + 1, 1));
  }

  return chunks;
}
