import assert from "node:assert/strict";
import test from "node:test";
import {
  buildForecastCurveVector,
  estimateRegimeFromForecastCurve,
  rankAnalogNeighbors,
  weightedCurveDistance,
} from "../../lib/forecast-experiment/analogKickIn.js";
import { localDayWindowMs } from "../../lib/forecast-experiment/time.js";

test("weightedCurveDistance is zero for identical curves", () => {
  const curve = Array.from({ length: 13 * 3 }, (_, index) => (index % 5) + 8);
  assert.equal(weightedCurveDistance(curve, curve), 0);
});

test("weightedCurveDistance prefers ICON7 shape matches", () => {
  const target = [
    ...Array(13).fill(8),
    ...Array(13).fill(20),
    ...Array(13).fill(6),
  ];
  const icon7Match = [
    ...Array(13).fill(8),
    ...Array(13).fill(18),
    ...Array(13).fill(6),
  ];
  const icon7Mismatch = [
    ...Array(13).fill(14),
    ...Array(13).fill(18),
    ...Array(13).fill(6),
  ];
  assert.ok(weightedCurveDistance(target, icon7Match) < weightedCurveDistance(target, icon7Mismatch));
});

test("rankAnalogNeighbors returns closest historical days first", () => {
  const baseCurve = Array.from({ length: 13 * 3 }, () => 10);
  const index = [
    { dateLocal: "2024-06-01", month: 6, regime: "other", curveVector: baseCurve.map((v) => v + 5) },
    { dateLocal: "2024-06-02", month: 6, regime: "other", curveVector: baseCurve.map((v) => v + 1) },
    { dateLocal: "2024-06-03", month: 6, regime: "other", curveVector: baseCurve.map((v) => v + 0.5) },
  ];
  const target = { dateLocal: "2025-06-10", month: 6, curveVector: baseCurve };
  const neighbors = rankAnalogNeighbors(target, index, { k: 2 });
  assert.equal(neighbors[0].dateLocal, "2024-06-03");
  assert.equal(neighbors[1].dateLocal, "2024-06-02");
});

test("estimateRegimeFromForecastCurve detects flat vs sea-breeze pattern", () => {
  const flat = Array.from({ length: 13 * 3 }, () => 6);
  const seaBreeze = [
    ...Array.from({ length: 4 * 3 }, () => 7),
    ...Array.from({ length: 9 * 3 }, () => 16),
  ];
  assert.equal(estimateRegimeFromForecastCurve(flat), "flat");
  assert.equal(estimateRegimeFromForecastCurve(seaBreeze), "sea-breeze");
});

test("buildForecastCurveVector aggregates multi-model hourly points", () => {
  const dateLocal = "2026-05-30";
  const { startAt } = localDayWindowMs(dateLocal);
  const generatedAt = startAt - 12 * 3_600_000;
  const points = [
    {
      model: "icon-eu-previous-day1",
      validTime: startAt + 10 * 3_600_000,
      runStartedAt: generatedAt,
      windSpeedKnots: 12,
      windGustKnots: 15,
      quality: "ok",
    },
  ];
  const curve = buildForecastCurveVector(points, dateLocal, startAt + 7 * 3_600_000);
  assert.equal(curve.length, 13 * 3);
  const hourTenIcon7Index = (10 - 8) * 3;
  assert.equal(curve[hourTenIcon7Index], 13.5);
});

test("buildAnalogBayWindPrediction medians kick-in minutes not absolute timestamps", async () => {
  const { buildAnalogBayWindPrediction } = await import("../../lib/forecast-experiment/analogKickIn.js");
  const { localDayWindowMs } = await import("../../lib/forecast-experiment/time.js");
  const curve = Array.from({ length: 13 * 3 }, () => 12);
  const { startAt: start2024 } = localDayWindowMs("2024-07-10");
  const { startAt: start2025 } = localDayWindowMs("2025-07-10");
  const generatedAt = start2025 - 12 * 3_600_000;
  const points = [];
  for (let hour = 8; hour <= 20; hour += 1) {
    for (const model of ["icon-eu-previous-day1", "icon-global-previous-day1", "gfs-global-previous-day1"]) {
      points.push({
        model,
        validTime: start2025 + hour * 3_600_000,
        runStartedAt: generatedAt,
        windSpeedKnots: 12,
        windGustKnots: 12,
        quality: "ok",
      });
    }
  }
  const index = [
    {
      dateLocal: "2024-07-01",
      month: 7,
      regime: "other",
      curveVector: curve,
      actualKickInMinutes: 14 * 60,
    },
    {
      dateLocal: "2024-07-02",
      month: 7,
      regime: "other",
      curveVector: curve,
      actualKickInMinutes: 16 * 60,
    },
    {
      dateLocal: "2024-07-03",
      month: 7,
      regime: "other",
      curveVector: curve,
      actualKickInMinutes: 15 * 60,
    },
  ];
  const prediction = buildAnalogBayWindPrediction({
    targetLocationSlug: "cascais-bay",
    forecastDateLocal: "2025-07-10",
    generatedAt: start2025 + 7 * 3_600_000,
    points,
    thresholdKnots: 12,
    analogIndex: index,
    k: 3,
    sessionThreshold: 0.5,
  });
  assert.equal(prediction.predictedKickInAt, start2025 + 15 * 60 * 60_000);
  assert.notEqual(prediction.predictedKickInAt, start2024 + 15 * 60 * 60_000);
});
