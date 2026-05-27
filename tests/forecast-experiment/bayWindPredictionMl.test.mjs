import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBayWindPredictionV3,
  predictBinaryLightGbmJson,
  predictKickInMinutes,
  predictLightGbmJson,
} from "../../lib/forecast-experiment/bayWindPredictionMl.js";
import { buildMlFeatureVector } from "../../lib/forecast-experiment/mlFeatures.js";
import { DEFAULT_BAY_WIND_ML_MODEL } from "../../lib/forecast-experiment/bayWindMlModelDefaults.js";
import { localDayWindowMs } from "../../lib/forecast-experiment/time.js";

test("predictLightGbmJson traverses a simple tree", () => {
  const model = {
    tree_info: [
      {
        tree_structure: {
          split_feature: "thresholdKnots",
          threshold: 12,
          left_child: { leaf_value: 100 },
          right_child: { leaf_value: 200 },
        },
      },
    ],
  };
  assert.equal(predictLightGbmJson(model, { thresholdKnots: 10 }), 100);
  assert.equal(predictLightGbmJson(model, { thresholdKnots: 15 }), 200);
});

test("predictBinaryLightGbmJson returns probability in 0-1", () => {
  const probability = predictBinaryLightGbmJson(DEFAULT_BAY_WIND_ML_MODEL.hourlyRideableClassifiers.h14, {
    icon7_h14_effective: 16,
    thresholdKnots: 12,
  });
  assert.ok(probability > 0.5);
  assert.ok(probability <= 1);
});

test("buildBayWindPredictionV3 gates kick-in when session probability is below threshold", () => {
  const dateLocal = "2026-07-15";
  const { startAt } = localDayWindowMs(dateLocal);
  const generatedAt = startAt + 7 * 3_600_000;
  const points = buildMultiModelPoints(startAt, generatedAt, 8);

  const calibratedModel = {
    ...DEFAULT_BAY_WIND_ML_MODEL,
    version: 2,
    rideableDayClassifier: DEFAULT_BAY_WIND_ML_MODEL.hourlyRideableClassifiers.h14,
    calibration: {
      holdoutYear: 2025,
      byThresholdKnots: {
        12: {
          sessionThreshold: 0.99,
          kickInThreshold: 0.6,
          probabilityDamping: 0.85,
        },
      },
    },
  };

  const prediction = buildBayWindPredictionV3({
    targetLocationSlug: "cascais-bay",
    forecastDateLocal: dateLocal,
    generatedAt,
    points,
    caboRasoObservations: [],
    thresholdKnots: 12,
    model: calibratedModel,
  });

  assert.equal(prediction.modelVersion, "bay-wind-v3.5-ml");
  assert.equal(prediction.kickInP50At, undefined);
  assert.ok(prediction.summary.includes("unlikely"));
});

test("buildBayWindPredictionV3 returns bay-wind-v3-ml with kick-in from synthetic model", () => {
  const dateLocal = "2026-07-15";
  const { startAt } = localDayWindowMs(dateLocal);
  const generatedAt = startAt + 7 * 3_600_000;
  const points = buildMultiModelPoints(startAt, generatedAt);

  const prediction = buildBayWindPredictionV3({
    targetLocationSlug: "cascais-bay",
    forecastDateLocal: dateLocal,
    generatedAt,
    points,
    caboRasoObservations: [],
    thresholdKnots: 12,
    model: DEFAULT_BAY_WIND_ML_MODEL,
  });

  assert.equal(prediction.modelVersion, "bay-wind-v3-ml");
  assert.ok(prediction.kickInP50At);
  assert.ok(prediction.probabilityTimeline.length > 0);
  assert.equal(prediction.thresholdKnots, 12);
});

test("predictKickInMinutes uses icon7 afternoon wind in synthetic model", () => {
  const dateLocal = "2026-07-15";
  const { startAt } = localDayWindowMs(dateLocal);
  const generatedAt = startAt + 7 * 3_600_000;
  const strongPoints = buildMultiModelPoints(startAt, generatedAt, 18);
  const weakPoints = buildMultiModelPoints(startAt, generatedAt, 8);

  const strongVector = buildMlFeatureVector({
    dateLocal,
    forecastPoints: strongPoints,
    caboRasoObservations: [],
    thresholdKnots: 12,
  });
  const weakVector = buildMlFeatureVector({
    dateLocal,
    forecastPoints: weakPoints,
    caboRasoObservations: [],
    thresholdKnots: 12,
  });

  const strongKickIn = predictKickInMinutes(DEFAULT_BAY_WIND_ML_MODEL, strongVector);
  const weakKickIn = predictKickInMinutes(DEFAULT_BAY_WIND_ML_MODEL, weakVector);
  assert.ok(strongKickIn < weakKickIn);
});

function buildMultiModelPoints(startAt, runStartedAt, afternoonSpeed = 18) {
  const models = [
    "gfs-global-previous-day1",
    "icon-global-previous-day1",
    "icon-eu-previous-day1",
  ];
  const points = [];
  for (const model of models) {
    for (let hour = 6; hour <= 20; hour += 1) {
      const speed = hour < 14 ? 8 : afternoonSpeed;
      points.push({
        model,
        runStartedAt,
        validTime: startAt + hour * 3_600_000,
        windSpeedKnots: speed,
        windGustKnots: speed + 2,
        windDirectionDeg: 330,
      });
    }
  }
  return points;
}
