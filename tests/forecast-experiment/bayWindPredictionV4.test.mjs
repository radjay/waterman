import assert from "node:assert/strict";
import test from "node:test";
import { buildBayWindPredictionV4, DEFAULT_V4_ENSEMBLE_OPTIONS } from "../../lib/forecast-experiment/bayWindPredictionV4.js";
import { DEFAULT_BAY_WIND_ML_MODEL } from "../../lib/forecast-experiment/bayWindMlModelDefaults.js";
import { localDayWindowMs } from "../../lib/forecast-experiment/time.js";

test("v4 gates kick-in when v2 and v3 both say no", () => {
  const dateLocal = "2026-01-15";
  const { startAt } = localDayWindowMs(dateLocal);
  const generatedAt = startAt + 7 * 3_600_000;
  const points = buildWeakPoints(startAt, generatedAt);

  const prediction = buildBayWindPredictionV4({
    targetLocationSlug: "cascais-bay",
    forecastDateLocal: dateLocal,
    generatedAt,
    points,
    caboRasoObservations: [],
    thresholdKnots: 12,
    mlModel: DEFAULT_BAY_WIND_ML_MODEL,
  });

  assert.equal(prediction.modelVersion, "bay-wind-v4-ensemble");
  assert.equal(prediction.predictedKickInAt, undefined);
});

test("v4 blends v2 and v3 kick-in when both predict rideable", () => {
  const dateLocal = "2026-07-15";
  const { startAt } = localDayWindowMs(dateLocal);
  const generatedAt = startAt + 7 * 3_600_000;
  const points = buildStrongPoints(startAt, generatedAt);

  const prediction = buildBayWindPredictionV4({
    targetLocationSlug: "cascais-bay",
    forecastDateLocal: dateLocal,
    generatedAt,
    points,
    caboRasoObservations: [],
    thresholdKnots: 12,
    mlModel: DEFAULT_BAY_WIND_ML_MODEL,
    ensembleOptions: {
      ...DEFAULT_V4_ENSEMBLE_OPTIONS,
      v3ConfidenceFloor: 0.3,
      v3SessionFloor: 0.3,
    },
  });

  assert.ok(prediction.predictedKickInAt);
  assert.equal(prediction.inputs.blend, "both");
  assert.ok(prediction.confidence >= 0.5);
});

function buildWeakPoints(startAt, runStartedAt) {
  const models = ["gfs-global-previous-day1", "icon-global-previous-day1", "icon-eu-previous-day1"];
  const points = [];
  for (const model of models) {
    for (let hour = 6; hour <= 20; hour += 1) {
      points.push({
        model,
        runStartedAt,
        validTime: startAt + hour * 3_600_000,
        windSpeedKnots: 4,
        windGustKnots: 5,
        windDirectionDeg: 180,
      });
    }
  }
  return points;
}

function buildStrongPoints(startAt, runStartedAt) {
  const models = ["gfs-global-previous-day1", "icon-global-previous-day1", "icon-eu-previous-day1"];
  const points = [];
  for (const model of models) {
    for (let hour = 6; hour <= 20; hour += 1) {
      const speed = hour < 14 ? 8 : 18;
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
