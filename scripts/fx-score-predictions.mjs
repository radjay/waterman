import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";
import { FX_LOCATIONS } from "../lib/forecast-experiment/locations.js";
import {
  dateRangeFromDaysBack,
  observationsForDate,
  resolveLabelForScoring,
  scorePredictionDay,
  selectDayPrediction,
  summarizePredictionScores,
  windowBoundsForDates,
} from "../lib/forecast-experiment/predictionScoring.js";
import {
  DEFAULT_RIDEABILITY_PRESET,
  resolveRideabilityThreshold,
} from "../lib/forecast-experiment/rideabilityThresholds.js";

dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const workerRunId = await convex.mutation(api.forecastExperiment.startWorkerRun, {
  workerName: "fx-score-predictions",
});

let attemptedCount = 0;
let insertedCount = 0;

try {
  const now = Date.now();
  const daysBack = Number(process.env.FX_SCORE_DAYS_BACK || process.env.FX_SKILL_DAYS_BACK || "30");
  const thresholdKnots = resolveRideabilityThreshold({
    preset: process.env.FX_RIDEABILITY_PRESET || DEFAULT_RIDEABILITY_PRESET,
  });
  const season = process.env.FX_SCORE_SEASON || `rolling-${daysBack}d`;
  const scores = [];

  for (const location of FX_LOCATIONS.filter((item) => item.role !== "context")) {
    attemptedCount += 1;
    const datesLocal = dateRangeFromDaysBack(now, daysBack, location.timezone);
    const { startAt, endAt, startDateLocal, endDateLocal } = windowBoundsForDates(
      datesLocal,
      location.timezone
    );

    const labels = await convex.query(api.forecastExperiment.listLabelsForWindow, {
      locationSlug: location.slug,
      startDateLocal,
      endDateLocal,
    });
    const predictions = await convex.query(api.forecastExperiment.listPredictionsForWindow, {
      targetLocationSlug: location.slug,
      startDateLocal,
      endDateLocal,
    });
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
    const caboRasoObservations =
      location.slug === "cascais-bay"
        ? await convex.query(api.forecastExperiment.listObservationsForWindow, {
            locationSlug: "cabo-raso",
            startAt,
            endAt,
          })
        : [];

    const labelsByDate = new Map(labels.map((label) => [label.dateLocal, label]));
    const modelVersions = [...new Set(predictions.map((prediction) => prediction.modelVersion))];

    for (const modelVersion of modelVersions) {
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
        });
        if (!prediction) continue;

        dayScores.push(scorePredictionDay({ label, prediction }));
      }

      if (dayScores.length === 0) continue;

      const summary = summarizePredictionScores(dayScores);
      // Phase 5: include prediction mode so we can track nowcast vs day-ahead performance separately.
      // Most historical predictions will have mode in inputs (wired in 5.1/5.3). Fall back to null for older rows.
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
        mode: dayScores[0]?.predictionMode ?? null,   // day-ahead | nowcast | null (legacy)
      });
    }
  }

  if (scores.length > 0) {
    const result = await convex.mutation(api.forecastExperiment.savePredictionScores, { scores });
    insertedCount = result.inserted;
  }

  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "success",
    attemptedCount,
    insertedCount,
    metadata: { thresholdKnots, season, scoreCount: scores.length },
  });

  for (const score of scores) {
    console.log(
      [
        score.modelVersion,
        `${score.locationSlug}`,
        `MAE ${score.kickInMaeMinutes ?? "—"} min`,
        `hit ${score.rideableHitRate ?? "—"}`,
        `n=${score.sampleCount}`,
      ].join(" · ")
    );
  }
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
