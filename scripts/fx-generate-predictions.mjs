import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";
import { buildBayWindPredictionV2 } from "../lib/forecast-experiment/bayWindPrediction.js";
import { buildBayWindPredictionV3 } from "../lib/forecast-experiment/bayWindPredictionMl.js";
import { buildBayWindPredictionV4 } from "../lib/forecast-experiment/bayWindPredictionV4.js";
import { loadBayWindCoefficients } from "../lib/forecast-experiment/loadBayWindCoefficients.js";
import { loadBayWindMlModel, loadBayWindNowcastMlModel } from "../lib/forecast-experiment/loadBayWindMlModel.js";
import { FX_LOCATIONS } from "../lib/forecast-experiment/locations.js";
import { buildBaselinePrediction } from "../lib/forecast-experiment/prediction.js";
import {
  DEFAULT_RIDEABILITY_PRESET,
  resolveRideabilityThreshold,
} from "../lib/forecast-experiment/rideabilityThresholds.js";
import { localDateKey } from "../lib/forecast-experiment/time.js";

dotenv.config({ path: ".env.local" });

const CABO_OBS_WINDOW_MS = 6 * 60 * 60_000;
const FORECAST_HORIZON_MS = 36 * 60 * 60_000;
const TARGET_SLUG = "cascais-bay";

// Phase 5 5.2 frequent re-run stub for "today" nowcast refinement.
// When we are in nowcast mode with fresh Cabo for the current local day,
// recommend more frequent follow-up runs (e.g. 15 min) so the window tightens
// as live data arrives. The Render cron / future scheduler can consume this.
function getNowcastRerunRecommendation({ mode, forecastDateLocal, caboRasoObservations, generatedAt }) {
  if (mode !== 'nowcast' || !caboRasoObservations?.length) return null;
  const todayKey = localDateKey(generatedAt, 'Europe/Lisbon');
  if (forecastDateLocal === todayKey) {
    return {
      nextRunInMinutes: 15,
      reason: 'Phase 5 nowcast: fresh Cabo for today - tighten window with frequent re-runs',
    };
  }
  return null;
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const workerRunId = await convex.mutation(api.forecastExperiment.startWorkerRun, {
  workerName: "fx-generate-predictions",
});

let insertedCount = 0;

try {
  const generatedAt = Date.now();
  const target = FX_LOCATIONS.find((location) => location.slug === TARGET_SLUG);
  const forecastDateLocal = localDateKey(generatedAt, target.timezone);
  const preset = process.env.FX_RIDEABILITY_PRESET ?? DEFAULT_RIDEABILITY_PRESET;
  const thresholdKnots = resolveRideabilityThreshold({ preset });
  // Phase 2 pragmatic path: v3.5 is now the default for the Forecast layer
  // (day-ahead / multi-day kick-in predictions). It uses the committed full-data
  // model with a conservative operating point for planning horizons
  // (see getConservativeForecastCalibration in bayWindPredictionMl.js).
  //
  // Rollback: set FX_PREDICTION_VERSION=v2 explicitly.
  // Future Nowcast work (Phase 5) can use a different/more aggressive calibration
  // or a dedicated nowcast path.
  const predictionVersion = process.env.FX_PREDICTION_VERSION ?? "v3.5";
  const coefficients = await loadBayWindCoefficients();
  const mlModel = loadBayWindMlModel();
  const nowcastMlModel = loadBayWindNowcastMlModel();

  const points = await convex.query(api.forecastExperiment.listRecentForecastPoints, {
    locationSlug: TARGET_SLUG,
    startAt: generatedAt,
    endAt: generatedAt + FORECAST_HORIZON_MS,
  });
  const caboRasoObservations = await convex.query(api.forecastExperiment.listLatestObservations, {
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
    // Phase 2 pragmatic path: v3.5 for Forecast layer with conservative operating point for day-ahead.
    const mode = caboRasoObservations.length > 0 ? "nowcast" : "day-ahead";
    predictions.push(
      buildBayWindPredictionV3({
        targetLocationSlug: TARGET_SLUG,
        forecastDateLocal,
        generatedAt,
        points,
        caboRasoObservations,
        thresholdKnots,
        preset,
        model: mlModel,
        nowcastModel: nowcastMlModel,
        conservative: mode === "day-ahead",
        mode,
      })
    );

    // Phase 5 5.2 (frequent re-run for "today"): This fire (019e672670f4) notes that for true same-day Nowcast
    // with fresh Cabo, the worker/cron needs more frequent (or event-driven) invocations for the current day
    // rather than the current 10-min schedule. The mode + dynamic Cabo plumbing is already complete;
    // this is the next wiring step for continuous refinement.
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
    await convex.mutation(api.forecastExperiment.savePrediction, prediction);
    insertedCount += 1;
  }

  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "success",
    attemptedCount: predictions.length,
    insertedCount,
    metadata: {
      predictionVersion,
      preset,
      thresholdKnots,
      mode: predictions[0]?.inputs?.mode,
      modelVersion: predictions[0]?.modelVersion,
      rerunRecommendation: getNowcastRerunRecommendation({
        mode: predictions[0]?.inputs?.mode,
        forecastDateLocal,
        caboRasoObservations,
        generatedAt,
      }),
    },
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
