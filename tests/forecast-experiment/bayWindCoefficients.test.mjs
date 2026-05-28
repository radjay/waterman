import assert from "node:assert/strict";
import test from "node:test";
import {
  applyForecastBias,
  estimateBayLagMinutes,
  DEFAULT_BAY_WIND_COEFFICIENTS,
  hourBucket,
} from "../../lib/forecast-experiment/bayWindCoefficients.js";

test("hourBucket maps local hours to analysis buckets", () => {
  assert.equal(hourBucket(8), "6-11");
  assert.equal(hourBucket(14), "12-17");
  assert.equal(hourBucket(19), "18-21");
});

test("applyForecastBias subtracts nortada afternoon bias", () => {
  const corrected = applyForecastBias({
    forecastEffectiveKnots: 15,
    hourLocal: 14,
    regime: "nortada",
    coefficients: DEFAULT_BAY_WIND_COEFFICIENTS,
  });
  assert.ok(corrected < 15);
});

test("estimateBayLagMinutes increases with stronger cabo wind", () => {
  const weak = estimateBayLagMinutes({ caboEffectiveKnots: 13, forecastPeakKnots: 14 });
  const strong = estimateBayLagMinutes({ caboEffectiveKnots: 22, forecastPeakKnots: 24 });
  assert.ok(strong <= weak);
});
