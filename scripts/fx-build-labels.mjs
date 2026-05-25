import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";
import { FX_LOCATIONS } from "../lib/forecast-experiment/locations.js";
import { localDateKey, localDayWindowMs } from "../lib/forecast-experiment/time.js";
import { buildDailyLabel } from "../lib/forecast-experiment/labels.js";

dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const workerRunId = await convex.mutation(api.forecastExperiment.startWorkerRun, {
  workerName: "fx-build-labels",
});

let insertedCount = 0;
let attemptedCount = 0;

try {
  const now = Date.now();
  const daysBack = Number(process.env.FX_LABEL_DAYS_BACK || "7");
  for (let offset = 0; offset <= daysBack; offset += 1) {
    const dayMs = now - offset * 24 * 60 * 60_000;
    for (const location of FX_LOCATIONS.filter((item) => item.role !== "context")) {
      const dateLocal = localDateKey(dayMs, location.timezone);
      const { startAt: dayStart, endAt: dayEnd } = localDayWindowMs(dateLocal, location.timezone);
      const startAt = dayStart - 2 * 60 * 60_000;
      const endAt = dayEnd + 2 * 60 * 60_000;
      attemptedCount += 1;
      const observations = await convex.query(api.forecastExperiment.listObservationsForWindow, {
        locationSlug: location.slug,
        startAt,
        endAt,
      });
      const reports = await convex.query(api.forecastExperiment.listReportsForWindow, {
        locationSlug: location.slug,
        startAt,
        endAt,
      });
      const caboRasoObservations = location.slug === "cascais-bay"
        ? await convex.query(api.forecastExperiment.listObservationsForWindow, {
            locationSlug: "cabo-raso",
            startAt,
            endAt,
          })
        : [];
      const label = buildDailyLabel({
        locationSlug: location.slug,
        dateLocal,
        observations,
        reports,
        caboRasoObservations,
        thresholdKnots: location.defaultRideableWindKnots,
      });
      await convex.mutation(api.forecastExperiment.saveDailyLabel, label);
      insertedCount += 1;
    }
  }
  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "success",
    attemptedCount,
    insertedCount,
  });
} catch (error) {
  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "failed",
    attemptedCount,
    insertedCount,
    errorMessage: error.message,
  });
  throw error;
}
