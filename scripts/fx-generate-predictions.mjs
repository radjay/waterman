import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";
import { FX_LOCATIONS } from "../lib/forecast-experiment/locations.js";
import { localDateKey } from "../lib/forecast-experiment/time.js";
import { buildBaselinePrediction } from "../lib/forecast-experiment/prediction.js";

dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const workerRunId = await convex.mutation(api.forecastExperiment.startWorkerRun, {
  workerName: "fx-generate-predictions",
});

let insertedCount = 0;

try {
  const generatedAt = Date.now();
  const target = FX_LOCATIONS.find((location) => location.slug === "cascais-bay");
  const forecastDateLocal = localDateKey(generatedAt, target.timezone);
  const startAt = generatedAt;
  const endAt = generatedAt + 36 * 60 * 60_000;
  const points = await convex.query(api.forecastExperiment.listRecentForecastPoints, {
    locationSlug: "cascais-bay",
    startAt,
    endAt,
  });
  const caboRasoObservations = await convex.query(api.forecastExperiment.listLatestObservations, {
    locationSlug: "cabo-raso",
    sinceAt: generatedAt - 6 * 60 * 60_000,
  });
  const prediction = buildBaselinePrediction({
    targetLocationSlug: "cascais-bay",
    forecastDateLocal,
    generatedAt,
    points,
    caboRasoObservations,
    thresholdKnots: target.defaultRideableWindKnots,
  });
  await convex.mutation(api.forecastExperiment.savePrediction, prediction);
  insertedCount = 1;
  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "success",
    attemptedCount: 1,
    insertedCount,
  });
} catch (error) {
  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "failed",
    attemptedCount: 1,
    insertedCount,
    errorMessage: error.message,
  });
  throw error;
}
