import { api } from "../../../convex/_generated/api.js";
import { FX_LOCATIONS } from "../locations.js";
import {
  dateRangeFromDaysBack,
  observationsForDate,
  predictionModesForModel,
  resolveLabelForScoring,
  scorePredictionDay,
  selectDayPrediction,
  summarizePredictionScores,
  windowBoundsForDates,
} from "../predictionScoring.js";
import {
  DEFAULT_RIDEABILITY_PRESET,
  resolveRideabilityThreshold,
} from "../rideabilityThresholds.js";

export async function runScorePredictions({
  query,
  mutation,
  daysBack = 30,
  preset = DEFAULT_RIDEABILITY_PRESET,
}) {
  const workerRunId = await mutation(api.forecastExperiment.startWorkerRun, {
    workerName: "fx-score-predictions",
  });

  let attemptedCount = 0;
  let insertedCount = 0;

  try {
    const now = Date.now();
    const thresholdKnots = resolveRideabilityThreshold({ preset });
    const season = `rolling-${daysBack}d`;
    const scores = [];

    for (const location of FX_LOCATIONS.filter((item) => item.role !== "context")) {
      attemptedCount += 1;
      const datesLocal = dateRangeFromDaysBack(now, daysBack, location.timezone);
      const { startAt, endAt, startDateLocal, endDateLocal } = windowBoundsForDates(
        datesLocal,
        location.timezone
      );

      const labels = await query(api.forecastExperiment.listLabelsForWindow, {
        locationSlug: location.slug,
        startDateLocal,
        endDateLocal,
      });
      const predictions = await query(api.forecastExperiment.listPredictionsForWindow, {
        targetLocationSlug: location.slug,
        startDateLocal,
        endDateLocal,
      });
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

      const labelsByDate = new Map(labels.map((label) => [label.dateLocal, label]));
      const modelVersions = [...new Set(predictions.map((prediction) => prediction.modelVersion))];

      for (const modelVersion of modelVersions) {
        for (const mode of predictionModesForModel(predictions, modelVersion)) {
          const dayScores = [];

          for (const dateLocal of datesLocal) {
            const storedLabel = labelsByDate.get(dateLocal);
            if (!storedLabel) continue;

            const dayObservations = observationsForDate(observations, dateLocal, location.timezone);
            const dayReports = observationsForDate(reports, dateLocal, location.timezone);
            const dayCaboObservations = observationsForDate(
              caboRasoObservations,
              dateLocal,
              location.timezone
            );
            const label = resolveLabelForScoring({
              label: storedLabel,
              observations: dayObservations,
              reports: dayReports,
              caboRasoObservations: dayCaboObservations,
              thresholdKnots,
            });

            const prediction = selectDayPrediction(predictions, {
              forecastDateLocal: dateLocal,
              modelVersion,
              thresholdKnots,
              mode: mode ?? undefined,
              preferLatest: mode === "nowcast",
            });
            if (!prediction) continue;

            dayScores.push(scorePredictionDay({ label, prediction }));
          }

          if (dayScores.length === 0) continue;

          const summary = summarizePredictionScores(dayScores);
          scores.push({
            modelVersion,
            locationSlug: location.slug,
            sport: "wingfoil",
            season,
            thresholdKnots,
            sampleCount: summary.daysScored,
            kickInMaeMinutes: summary.kickInMaeMinutes,
            rideableHitRate: summary.rideableHitRate,
            rideableBrier: summary.rideableBrier,
            falsePositiveCount: summary.falsePositiveCount,
            falseNegativeCount: summary.falseNegativeCount,
            mode: mode ?? dayScores[0]?.predictionMode ?? null,
          });
        }
      }
    }

    if (scores.length > 0) {
      const result = await mutation(api.forecastExperiment.savePredictionScores, { scores });
      insertedCount = result.inserted;
    }

    await mutation(api.forecastExperiment.finishWorkerRun, {
      workerRunId,
      status: "success",
      attemptedCount,
      insertedCount,
      metadata: { thresholdKnots, season, scoreCount: scores.length },
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
