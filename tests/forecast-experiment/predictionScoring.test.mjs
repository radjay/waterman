import assert from "node:assert/strict";
import test from "node:test";
import {
  isRideableLabel,
  isPredictedRideable,
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
      kickInP50At: 1_700_000_060_000,
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
