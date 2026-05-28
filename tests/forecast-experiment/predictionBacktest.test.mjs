import assert from "node:assert/strict";
import test from "node:test";
import { buildBayWindPredictionV2 } from "../../lib/forecast-experiment/bayWindPrediction.js";
import {
  PREDICTION_MODEL_V1,
  PREDICTION_MODEL_V2,
  resolvePredictionBacktestConfig,
} from "../../lib/forecast-experiment/predictionBacktestConfig.js";
import {
  backtestPredictionVersion,
  summarizePredictionBacktest,
} from "../../lib/forecast-experiment/predictionBacktest.js";
import { buildBaselinePrediction } from "../../lib/forecast-experiment/prediction.js";
import { localDayWindowMs } from "../../lib/forecast-experiment/time.js";

test("v2 kick-in is closer to actual than v1 on synthetic nortada day", () => {
  const dateLocal = "2025-07-15";
  const { startAt } = localDayWindowMs(dateLocal);
  const actualKickInAt = startAt + 13 * 3_600_000 + 30 * 60_000;
  const marinaObservations = [
    obs(actualKickInAt - 15 * 60_000, 11, 12),
    obs(actualKickInAt, 13, 15),
    obs(actualKickInAt + 15 * 60_000, 14, 16),
    obs(actualKickInAt + 30 * 60_000, 15, 17),
  ];

  const forecastPoints = [];
  for (let hour = 6; hour <= 20; hour += 1) {
    const validTime = startAt + hour * 3_600_000;
    const iconSpeed = hour < 13 ? 10 : 14;
    const gfsSpeed = hour < 15 ? 8 : 12;
    forecastPoints.push(
      forecastPoint("icon-eu-previous-day1", startAt - 12 * 3_600_000, validTime, iconSpeed, iconSpeed, 330),
      forecastPoint("gfs-global-previous-day1", startAt - 12 * 3_600_000, validTime, gfsSpeed, gfsSpeed, 330)
    );
  }

  const common = {
    datesLocal: [dateLocal],
    observations: marinaObservations,
    caboRasoObservations: [],
    forecastPoints,
    thresholdKnots: 12,
  };

  const v1Config = resolvePredictionBacktestConfig(PREDICTION_MODEL_V1);
  const v2Config = resolvePredictionBacktestConfig(PREDICTION_MODEL_V2);

  const v1Days = backtestPredictionVersion({
    ...common,
    buildPrediction: v1Config.buildPrediction,
    predictionOptions: v1Config.predictionOptions,
    forecastModel: v1Config.forecastModel,
  });
  const v2Days = backtestPredictionVersion({
    ...common,
    buildPrediction: v2Config.buildPrediction,
    predictionOptions: v2Config.predictionOptions,
    forecastModel: v2Config.forecastModel,
  });

  const v1Error = Math.abs(v1Days[0].errorMinutes ?? Number.POSITIVE_INFINITY);
  const v2Error = Math.abs(v2Days[0].errorMinutes ?? Number.POSITIVE_INFINITY);

  assert.ok(v2Days[0].predicted?.predictedKickInAt);
  assert.ok(v1Days[0].predicted?.predictedKickInAt);
  assert.ok(v2Error < v1Error);
});

test("summarizePredictionBacktest includes false positive and negative counts", () => {
  const summary = summarizePredictionBacktest([
    {
      actual: { kickInAt: 1 },
      predicted: { predictedKickInAt: 1 },
      errorMinutes: 0,
      hasForecastData: true,
    },
    {
      actual: {},
      predicted: { predictedKickInAt: 2 },
      hasForecastData: true,
    },
    {
      actual: { kickInAt: 3 },
      predicted: null,
      hasForecastData: true,
    },
    {
      actual: {},
      predicted: null,
      hasForecastData: false,
    },
  ]);

  assert.equal(summary.daysComparable, 1);
  assert.equal(summary.falsePositiveCount, 1);
  assert.equal(summary.falseNegativeCount, 1);
  assert.equal(summary.rideablePrecision, 0.5);
  assert.equal(summary.rideableRecall, 0.5);
  assert.equal(summary.rideableF1, 0.5);
});

test("backtestPredictionVersion accepts custom buildPrediction", () => {
  const dateLocal = "2025-07-15";
  const { startAt } = localDayWindowMs(dateLocal);
  const forecastPoints = [
    forecastPoint("icon-eu-previous-day1", startAt - 12 * 3_600_000, startAt + 14 * 3_600_000, 16, 18, 330),
  ];

  const days = backtestPredictionVersion({
    datesLocal: [dateLocal],
    observations: [],
    caboRasoObservations: [],
    forecastPoints,
    buildPrediction: buildBaselinePrediction,
    forecastModel: "icon-eu-previous-day1",
    thresholdKnots: 12,
  });

  assert.equal(days.length, 1);
  assert.ok(days[0].hasForecastData);
});

function forecastPoint(model, runStartedAt, validTime, windSpeedKnots, windGustKnots, windDirectionDeg) {
  return {
    provider: "open-meteo",
    model,
    runStartedAt,
    validTime,
    windSpeedKnots,
    windGustKnots,
    windDirectionDeg,
  };
}

function obs(observedAt, windSpeedKnots, windGustKnots) {
  return {
    observedAt,
    windSpeedKnots,
    windGustKnots,
    windDirectionDeg: 330,
    quality: "ok",
  };
}
