import { api } from "../../../convex/_generated/api.js";
import { buildBayWindPredictionV2 } from "../bayWindPrediction.js";
import { buildBayWindPredictionV3 } from "../bayWindPredictionMl.js";
import { buildBayWindPredictionV4 } from "../bayWindPredictionV4.js";
import { FX_LOCATIONS } from "../locations.js";
import { buildBaselinePrediction } from "../prediction.js";
import {
  DEFAULT_RIDEABILITY_PRESET,
  resolveRideabilityThreshold,
} from "../rideabilityThresholds.js";
import { localDateKey } from "../time.js";

const CABO_OBS_WINDOW_MS = 6 * 60 * 60_000;
const FORECAST_HORIZON_MS = 36 * 60 * 60_000;
const TARGET_SLUG = "cascais-bay";

export function resolvePredictionLayers(raw = "both") {
  return {
    dayAhead: raw === "both" || raw === "day-ahead",
    nowcast: raw === "both" || raw === "nowcast",
  };
}

function attachMode(prediction, mode) {
  return {
    ...prediction,
    mode,
    inputs: {
      ...prediction.inputs,
      mode,
    },
  };
}

export function getNowcastRerunRecommendation({
  mode,
  forecastDateLocal,
  caboRasoObservations,
  generatedAt,
}) {
  if (mode !== "nowcast" || !caboRasoObservations?.length) return null;
  const todayKey = localDateKey(generatedAt, "Europe/Lisbon");
  if (forecastDateLocal === todayKey) {
    return {
      nextRunInMinutes: 15,
      reason: "Phase 5 nowcast: fresh Cabo for today - tighten window with frequent re-runs",
    };
  }
  return null;
}

export function assertBundledMlModel(mlModel, label) {
  if (!mlModel || typeof mlModel !== "object" || !mlModel.kickInRegressor) {
    throw new Error(`Bundled ${label} is missing kickInRegressor`);
  }
}

export async function runGeneratePredictions({
  query,
  mutation,
  mlModel,
  nowcastMlModel,
  coefficients,
  layers = "both",
  predictionVersion = "v3.5",
  preset = DEFAULT_RIDEABILITY_PRESET,
}) {
  assertBundledMlModel(mlModel, "bay-wind ML model");
  assertBundledMlModel(nowcastMlModel, "bay-wind nowcast ML model");

  const workerRunId = await mutation(api.forecastExperiment.startWorkerRun, {
    workerName: "fx-generate-predictions",
  });

  let insertedCount = 0;

  try {
    const generatedAt = Date.now();
    const target = FX_LOCATIONS.find((location) => location.slug === TARGET_SLUG);
    const forecastDateLocal = localDateKey(generatedAt, target.timezone);
    const thresholdKnots = resolveRideabilityThreshold({ preset });
    const resolvedLayers = resolvePredictionLayers(layers);

    const points = await query(api.forecastExperiment.listRecentForecastPoints, {
      locationSlug: TARGET_SLUG,
      startAt: generatedAt,
      endAt: generatedAt + FORECAST_HORIZON_MS,
    });
    const caboRasoObservations = await query(api.forecastExperiment.listLatestObservations, {
      locationSlug: "cabo-raso",
      sinceAt: generatedAt - CABO_OBS_WINDOW_MS,
    });

    const predictions = [];

    if (predictionVersion === "v1") {
      predictions.push(
        buildBaselinePrediction({
          targetLocationSlug: TARGET_SLUG,
          forecastDateLocal,
          generatedAt,
          points,
          caboRasoObservations,
          thresholdKnots,
        })
      );
    } else if (predictionVersion === "v4") {
      const mode = caboRasoObservations.length > 0 ? "nowcast" : "day-ahead";
      predictions.push(
        buildBayWindPredictionV4({
          targetLocationSlug: TARGET_SLUG,
          forecastDateLocal,
          generatedAt,
          points,
          caboRasoObservations,
          thresholdKnots,
          preset,
          coefficients,
          mlModel,
          mode,
        })
      );
    } else if (predictionVersion === "v3" || predictionVersion === "v3.5") {
      const sharedArgs = {
        targetLocationSlug: TARGET_SLUG,
        forecastDateLocal,
        generatedAt,
        points,
        thresholdKnots,
        preset,
        model: mlModel,
        nowcastModel: nowcastMlModel,
      };

      if (resolvedLayers.dayAhead) {
        predictions.push(
          attachMode(
            buildBayWindPredictionV3({
              ...sharedArgs,
              caboRasoObservations: [],
              conservative: true,
              mode: "day-ahead",
            }),
            "day-ahead"
          )
        );
      }

      if (resolvedLayers.nowcast && caboRasoObservations.length > 0) {
        predictions.push(
          attachMode(
            buildBayWindPredictionV3({
              ...sharedArgs,
              caboRasoObservations,
              conservative: false,
              mode: "nowcast",
            }),
            "nowcast"
          )
        );
      }
    } else {
      const mode = caboRasoObservations.length > 0 ? "nowcast" : "day-ahead";
      predictions.push(
        buildBayWindPredictionV2({
          targetLocationSlug: TARGET_SLUG,
          forecastDateLocal,
          generatedAt,
          points,
          caboRasoObservations,
          thresholdKnots,
          preset,
          coefficients,
          mode,
        })
      );
    }

    for (const prediction of predictions) {
      await mutation(api.forecastExperiment.savePrediction, prediction);
      insertedCount += 1;
    }

    await mutation(api.forecastExperiment.finishWorkerRun, {
      workerRunId,
      status: "success",
      attemptedCount: predictions.length,
      insertedCount,
      metadata: {
        predictionVersion,
        preset,
        thresholdKnots,
        layers: resolvedLayers,
        modes: predictions.map((prediction) => prediction.mode ?? prediction.inputs?.mode),
        modelVersion: predictions[0]?.modelVersion,
        rerunRecommendation: getNowcastRerunRecommendation({
          mode: "nowcast",
          forecastDateLocal,
          caboRasoObservations,
          generatedAt,
        }),
      },
    });
    return { insertedCount };
  } catch (error) {
    await mutation(api.forecastExperiment.finishWorkerRun, {
      workerRunId,
      status: "failed",
      attemptedCount: 1,
      insertedCount,
      errorMessage: error.message,
    });
    throw error;
  }
}
