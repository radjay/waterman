import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";
import { FX_LOCATIONS, FX_MODELS } from "../lib/forecast-experiment/locations.js";
import { candidateGlobalRuns } from "../lib/forecast-experiment/time.js";
import { fetchSingleRun, parseSingleRunPoints, HOURLY_VARIABLES } from "../lib/forecast-experiment/openMeteoClient.js";

dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const workerName = "fx-fetch-openmeteo-runs";
const forecastDays = Number(process.env.FX_FORECAST_DAYS || "3");

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}

const workerRunId = await convex.mutation(api.forecastExperiment.startWorkerRun, {
  workerName,
  metadata: { forecastDays },
});

let attemptedCount = 0;
let insertedCount = 0;
let skippedCount = 0;

try {
  for (const location of FX_LOCATIONS.filter((item) => item.role !== "context")) {
    await convex.mutation(api.forecastExperiment.upsertLocation, {
      ...location,
      enabled: true,
    });
  }

  const runs = candidateGlobalRuns();
  for (const model of FX_MODELS.filter((item) => item.enabled)) {
    for (const runIso of runs) {
      const runStartedAt = Date.parse(`${runIso}:00Z`);
      const alreadyStored = await convex.query(api.forecastExperiment.findForecastRun, {
        provider: model.provider,
        model: model.model,
        runStartedAt,
      });
      if (alreadyStored) {
        skippedCount += 1;
        continue;
      }

      const allPoints = [];
      let sourceUrl = "";
      let responseHash = "";
      for (const location of FX_LOCATIONS.filter((item) => item.role !== "context")) {
        attemptedCount += 1;
        const result = await fetchSingleRun({ location, model, run: runIso, forecastDays });
        sourceUrl = result.url;
        responseHash = result.hash;
        allPoints.push(...parseSingleRunPoints({
          json: result.json,
          locationSlug: location.slug,
          runStartedAt,
        }));
        await sleep(500);
      }

      const result = await convex.mutation(api.forecastExperiment.saveForecastRunWithPoints, {
        run: {
          provider: model.provider,
          model: model.model,
          providerModel: model.openMeteoModel,
          runStartedAt,
          runAvailableAt: Date.now(),
          fetchedAt: Date.now(),
          status: "success",
          sourceUrl,
          responseHash,
          forecastDays,
          variables: HOURLY_VARIABLES,
        },
        points: allPoints,
      });
      insertedCount += result.insertedPoints;
      skippedCount += result.skipped ? 1 : 0;
    }
  }

  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "success",
    attemptedCount,
    insertedCount,
    skippedCount,
  });
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
