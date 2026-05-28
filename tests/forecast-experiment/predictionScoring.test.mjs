import assert from "node:assert/strict";
import test from "node:test";
import {
  isRideableLabel,
  isPredictedRideable,
  predictionModesForModel,
  resolvePredictionMode,
  scorePredictionDay,
  selectDayPrediction,
  summarizePredictionScores,
} from "../../lib/forecast-experiment/predictionScoring.js";

test("isRideableLabel accepts report-assisted weak labels", () => {
  assert.equal(
    isRideableLabel({
      labelStatus: "report-assisted",
      actualKickInAt: 1_700_000_000_000,
    }),
    true
  );
});

test("scorePredictionDay computes kick-in error and rideable miss", () => {
  const result = scorePredictionDay({
    label: {
      labelStatus: "observed",
      actualKickInAt: 1_700_000_000_000,
      sourceConfidence: 0.95,
    },
    prediction: {
      predictedKickInAt: 1_700_000_060_000,
    },
  });

  assert.equal(result.comparable, true);
  assert.equal(result.kickInErrorMinutes, 1);
  assert.equal(result.falseNegative, false);
  assert.equal(result.falsePositive, false);
});

test("selectDayPrediction picks earliest generated row for the day", () => {
  const selected = selectDayPrediction(
    [
      {
        forecastDateLocal: "2025-05-01",
        modelVersion: "bay-wind-v2",
        thresholdKnots: 12,
        generatedAt: 200,
      },
      {
        forecastDateLocal: "2025-05-01",
        modelVersion: "bay-wind-v2",
        thresholdKnots: 12,
        generatedAt: 100,
      },
    ],
    {
      forecastDateLocal: "2025-05-01",
      modelVersion: "bay-wind-v2",
      thresholdKnots: 12,
    }
  );

  assert.equal(selected.generatedAt, 100);
});

test("selectDayPrediction filters by mode and prefers latest nowcast", () => {
  const predictions = [
    {
      forecastDateLocal: "2025-05-01",
      modelVersion: "bay-wind-v3.5-ml",
      thresholdKnots: 12,
      generatedAt: 100,
      mode: "day-ahead",
    },
    {
      forecastDateLocal: "2025-05-01",
      modelVersion: "bay-wind-v3.5-ml",
      thresholdKnots: 12,
      generatedAt: 200,
      mode: "nowcast",
    },
    {
      forecastDateLocal: "2025-05-01",
      modelVersion: "bay-wind-v3.5-ml",
      thresholdKnots: 12,
      generatedAt: 300,
      mode: "nowcast",
    },
  ];

  const dayAhead = selectDayPrediction(predictions, {
    forecastDateLocal: "2025-05-01",
    modelVersion: "bay-wind-v3.5-ml",
    thresholdKnots: 12,
    mode: "day-ahead",
  });
  const nowcast = selectDayPrediction(predictions, {
    forecastDateLocal: "2025-05-01",
    modelVersion: "bay-wind-v3.5-ml",
    thresholdKnots: 12,
    mode: "nowcast",
    preferLatest: true,
  });

  assert.equal(dayAhead.generatedAt, 100);
  assert.equal(nowcast.generatedAt, 300);
});

test("predictionModesForModel returns distinct stored modes", () => {
  const modes = predictionModesForModel(
    [
      { modelVersion: "bay-wind-v3.5-ml", mode: "day-ahead" },
      { modelVersion: "bay-wind-v3.5-ml", mode: "nowcast" },
      { modelVersion: "bay-wind-v2", inputs: { mode: "day-ahead" } },
    ],
    "bay-wind-v3.5-ml"
  );

  assert.deepEqual(modes.sort(), ["day-ahead", "nowcast"]);
});

test("resolvePredictionMode prefers top-level mode", () => {
  assert.equal(resolvePredictionMode({ mode: "nowcast", inputs: { mode: "day-ahead" } }), "nowcast");
});

test("summarizePredictionScores aggregates MAE and false negatives", () => {
  const summary = summarizePredictionScores([
    {
      comparable: true,
      actualRideable: true,
      predictedRideable: true,
      kickInErrorMinutes: -30,
      labelStatus: "observed",
      falsePositive: false,
      falseNegative: false,
    },
    {
      comparable: false,
      actualRideable: true,
      predictedRideable: false,
      kickInErrorMinutes: undefined,
      labelStatus: "observed",
      falsePositive: false,
      falseNegative: true,
    },
  ]);

  assert.equal(summary.daysComparable, 1);
  assert.equal(summary.kickInMaeMinutes, 30);
  assert.equal(summary.falseNegativeCount, 1);
});
