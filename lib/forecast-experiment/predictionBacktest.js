import { filterDatesToSeasonRanges, resolveAnalysisSeason } from "./analysisSeasons.js";
import {
  buildDayBacktest,
  summarizeWeekBacktest,
} from "./backtest.js";
import { loadBayWindCoefficients } from "./loadBayWindCoefficients.js";
import { loadBayWindMlModel } from "./loadBayWindMlModel.js";
import { inferAnalysisWindow } from "./modelSkillAnalysis.js";
import {
  PREDICTION_MODEL_V1,
  PREDICTION_MODEL_V2,
  PREDICTION_MODEL_V3,
  PREDICTION_MODEL_V4,
} from "./predictionBacktestConstants.js";
import { resolvePredictionBacktestConfig } from "./predictionBacktestConfig.js";
import { fetchForecastExperimentWindow } from "./runModelSkillAnalysis.js";
import {
  RIDEABILITY_THRESHOLD_PRESETS,
  resolveRideabilityThreshold,
} from "./rideabilityThresholds.js";
import { localDayWindowMs } from "./time.js";

const DEFAULT_LOCATION = "cascais-bay";

export {
  PREDICTION_MODEL_V1,
  PREDICTION_MODEL_V2,
  PREDICTION_MODEL_V3,
  PREDICTION_MODEL_V4,
} from "./predictionBacktestConstants.js";

export function backtestPredictionVersion({
  datesLocal,
  observations,
  caboRasoObservations,
  forecastPoints,
  buildPrediction,
  predictionOptions = {},
  thresholdKnots,
  preset,
  forecastModel,
}) {
  return datesLocal.map((dateLocal) =>
    buildDayBacktest({
      dateLocal,
      marinaObservations: observations,
      caboRasoObservations,
      forecastPoints,
      buildPrediction,
      predictionOptions,
      thresholdKnots,
      preset,
      forecastModel,
    })
  );
}

function countRideabilityAnomalies(days) {
  let falsePositiveCount = 0;
  let falseNegativeCount = 0;
  let truePositiveCount = 0;

  for (const day of days) {
    if (!day.hasForecastData) continue;
    const observedRideable = day.actual.kickInAt != null;
    const forecastRideable = day.predicted?.kickInP50At != null;
    if (forecastRideable && observedRideable) truePositiveCount += 1;
    else if (forecastRideable && !observedRideable) falsePositiveCount += 1;
    else if (observedRideable && !forecastRideable) falseNegativeCount += 1;
  }

  const precision =
    truePositiveCount + falsePositiveCount > 0
      ? truePositiveCount / (truePositiveCount + falsePositiveCount)
      : undefined;
  const recall =
    truePositiveCount + falseNegativeCount > 0
      ? truePositiveCount / (truePositiveCount + falseNegativeCount)
      : undefined;
  const f1 =
    Number.isFinite(precision) && Number.isFinite(recall) && precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : undefined;

  return {
    falsePositiveCount,
    falseNegativeCount,
    rideablePrecision: roundMetric(precision),
    rideableRecall: roundMetric(recall),
    rideableF1: roundMetric(f1),
  };
}

function roundMetric(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : undefined;
}

export function summarizePredictionBacktest(days) {
  const summary = summarizeWeekBacktest(days);
  const anomalies = countRideabilityAnomalies(days);
  return {
    ...summary,
    falsePositiveCount: anomalies.falsePositiveCount,
    falseNegativeCount: anomalies.falseNegativeCount,
    rideablePrecision: anomalies.rideablePrecision,
    rideableRecall: anomalies.rideableRecall,
    rideableF1: anomalies.rideableF1,
  };
}

export async function runPredictionSeasonBacktest(
  convex,
  {
    locationSlug = DEFAULT_LOCATION,
    seasonId,
    modelVersion = PREDICTION_MODEL_V1,
    thresholdKnots,
    preset,
  }
) {
  const season = resolveAnalysisSeason(seasonId);
  const resolvedThreshold = resolveRideabilityThreshold({ thresholdKnots, preset });
  const coefficients = await loadBayWindCoefficients();
  const mlModel =
    modelVersion === PREDICTION_MODEL_V3 || modelVersion === PREDICTION_MODEL_V4
      ? loadBayWindMlModel()
      : undefined;
  const { buildPrediction, predictionOptions, forecastModel, modelVersionLabel } =
    resolvePredictionBacktestConfig(modelVersion, { coefficients, mlModel });

  let marinaObservations = [];
  let caboRasoObservations = [];
  let forecastPoints = [];

  for (const range of season.ranges) {
    const { startAt } = localDayWindowMs(range.startDateLocal);
    const { endAt } = localDayWindowMs(range.endDateLocal);

    marinaObservations.push(
      ...(await fetchForecastExperimentWindow(convex, {
        locationSlug,
        kind: "observations",
        startAt,
        endAt,
      }))
    );

    caboRasoObservations.push(
      ...(await fetchForecastExperimentWindow(convex, {
        locationSlug: "cabo-raso",
        kind: "observations",
        startAt,
        endAt,
      }))
    );

    forecastPoints.push(
      ...(await fetchForecastExperimentWindow(convex, {
        locationSlug,
        kind: "forecast",
        startAt: startAt + 6 * 3_600_000,
        endAt,
      }))
    );
  }

  const window = inferAnalysisWindow({ observations: marinaObservations, forecastPoints });
  if (!window) {
    return { ok: false, error: "No overlapping observation and forecast data found" };
  }

  const datesLocal = filterDatesToSeasonRanges(window.datesLocal, season.ranges);
  if (datesLocal.length === 0) {
    return { ok: false, error: "No dates in season overlap window" };
  }

  const days = backtestPredictionVersion({
    datesLocal,
    observations: marinaObservations,
    caboRasoObservations,
    forecastPoints,
    buildPrediction,
    predictionOptions,
    thresholdKnots: resolvedThreshold,
    forecastModel,
  });

  const summary = summarizePredictionBacktest(days);

  return {
    ok: true,
    locationSlug,
    seasonId: season.id,
    seasonLabel: season.label,
    modelVersion,
    modelVersionLabel,
    thresholdKnots: resolvedThreshold,
    preset: preset ?? null,
    window: {
      startDateLocal: window.startDateLocal,
      endDateLocal: window.endDateLocal,
      daysInRange: datesLocal.length,
    },
    summary,
    days,
  };
}

export async function runPredictionVersionComparison(
  convex,
  { seasonId, thresholdKnots, preset }
) {
  const v1 = await runPredictionSeasonBacktest(convex, {
    seasonId,
    modelVersion: PREDICTION_MODEL_V1,
    thresholdKnots,
    preset,
  });
  if (!v1.ok) return v1;

  const v2 = await runPredictionSeasonBacktest(convex, {
    seasonId,
    modelVersion: PREDICTION_MODEL_V2,
    thresholdKnots,
    preset,
  });
  if (!v2.ok) return v2;

  const v3 = await runPredictionSeasonBacktest(convex, {
    seasonId,
    modelVersion: PREDICTION_MODEL_V3,
    thresholdKnots,
    preset,
  });
  if (!v3.ok) return v3;

  const v4 = await runPredictionSeasonBacktest(convex, {
    seasonId,
    modelVersion: PREDICTION_MODEL_V4,
    thresholdKnots,
    preset,
  });
  if (!v4.ok) return v4;

  return {
    ok: true,
    seasonId: v1.seasonId,
    seasonLabel: v1.seasonLabel,
    thresholdKnots: v1.thresholdKnots,
    preset: v1.preset,
    window: v1.window,
    v1: {
      modelVersion: PREDICTION_MODEL_V1,
      modelVersionLabel: v1.modelVersionLabel,
      summary: v1.summary,
    },
    v2: {
      modelVersion: PREDICTION_MODEL_V2,
      modelVersionLabel: v2.modelVersionLabel,
      summary: v2.summary,
    },
    v3: {
      modelVersion: PREDICTION_MODEL_V3,
      modelVersionLabel: v3.modelVersionLabel,
      summary: v3.summary,
    },
    v4: {
      modelVersion: PREDICTION_MODEL_V4,
      modelVersionLabel: v4.modelVersionLabel,
      summary: v4.summary,
    },
  };
}

export async function runPredictionOverviewAllPresets(convex, { seasonId }) {
  const presets = Object.keys(RIDEABILITY_THRESHOLD_PRESETS);
  const comparisons = [];

  for (const preset of presets) {
    const result = await runPredictionVersionComparison(convex, { seasonId, preset });
    comparisons.push({ preset, result });
    if (!result.ok) {
      return { ok: false, error: result.error ?? "Overview failed for preset" };
    }
  }

  const first = comparisons[0].result;
  return {
    ok: true,
    seasonId: first.seasonId,
    seasonLabel: first.seasonLabel,
    window: first.window,
    byPreset: Object.fromEntries(
      comparisons.map(({ preset, result }) => [
        preset,
        {
          thresholdKnots: result.thresholdKnots,
          v1: result.v1,
          v2: result.v2,
          v3: result.v3,
          v4: result.v4,
        },
      ])
    ),
  };
}
