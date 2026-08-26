import { api } from "../../../convex/_generated/api.js";
import { FX_LOCATIONS } from "../locations.js";
import { localDateKey, localDayWindowMs } from "../time.js";
import { buildDailyLabel } from "../labels.js";
import { buildDayRegimeTag } from "../dayRegimes.js";

export async function runBuildLabels({ query, mutation, daysBack = 7 }) {
  const workerRunId = await mutation(api.forecastExperiment.startWorkerRun, {
    workerName: "fx-build-labels",
  });

  let insertedCount = 0;
  let attemptedCount = 0;

  try {
    const now = Date.now();
    for (let offset = 0; offset <= daysBack; offset += 1) {
      const dayMs = now - offset * 24 * 60 * 60_000;
      for (const location of FX_LOCATIONS.filter((item) => item.role !== "context")) {
        const dateLocal = localDateKey(dayMs, location.timezone);
        const { startAt: dayStart, endAt: dayEnd } = localDayWindowMs(dateLocal, location.timezone);
        const startAt = dayStart - 2 * 60 * 60_000;
        const endAt = dayEnd + 2 * 60 * 60_000;
        attemptedCount += 1;
        const observations = await query(api.forecastExperiment.listObservationsForWindow, {
          locationSlug: location.slug,
          startAt,
          endAt,
        });
        const reports = await query(api.forecastExperiment.listReportsForWindow, {
          locationSlug: location.slug,
          startAt,
          endAt,
        });
        const caboRasoObservations =
          location.slug === "cascais-bay"
            ? await query(api.forecastExperiment.listObservationsForWindow, {
                locationSlug: "cabo-raso",
                startAt,
                endAt,
              })
            : [];
        const guinchoObservations =
          location.slug === "cascais-bay"
            ? await query(api.forecastExperiment.listObservationsForWindow, {
                locationSlug: "guincho",
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
        const savePayload =
          location.slug === "cascais-bay"
            ? {
                ...label,
                ...buildDayRegimeTag({
                  label,
                  caboObservations: caboRasoObservations,
                  marinaObservations: observations,
                  guinchoObservations,
                  thresholdKnots: location.defaultRideableWindKnots,
                  timezone: location.timezone,
                }),
              }
            : label;
        await mutation(api.forecastExperiment.saveDailyLabel, savePayload);
        insertedCount += 1;
      }
    }
    await mutation(api.forecastExperiment.finishWorkerRun, {
      workerRunId,
      status: "success",
      attemptedCount,
      insertedCount,
    });
    return { attemptedCount, insertedCount };
  } catch (error) {
    await mutation(api.forecastExperiment.finishWorkerRun, {
      workerRunId,
      status: "failed",
      attemptedCount,
      insertedCount,
      errorMessage: error.message,
    });
    throw error;
  }
}
