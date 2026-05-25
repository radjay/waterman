import assert from "node:assert/strict";
import test from "node:test";
import {
  kmhToKnots,
  msToKnots,
  normalizeDegrees,
  degreesToCompass8,
  circularDirectionError,
  effectiveWindKnots,
  isUsableForecastPoint,
  parseNumericKnots,
} from "../../lib/forecast-experiment/units.js";

test("converts wind speeds to knots", () => {
  assert.equal(kmhToKnots(18.52), 10);
  assert.equal(msToKnots(5.144), 10);
});

test("normalizes degrees and labels compass directions", () => {
  assert.equal(normalizeDegrees(-10), 350);
  assert.equal(normalizeDegrees(370), 10);
  assert.equal(degreesToCompass8(350), "N");
  assert.equal(degreesToCompass8(315), "NW");
});

test("computes circular direction error", () => {
  assert.equal(circularDirectionError(350, 10), 20);
  assert.equal(circularDirectionError(90, 270), 180);
});

test("computes effective wind from speed and gust", () => {
  assert.equal(effectiveWindKnots({ windSpeedKnots: 10, windGustKnots: 14 }), 12);
  assert.equal(effectiveWindKnots({ windSpeedKnots: 10 }), 10);
});

test("parseNumericKnots ignores null and undefined", () => {
  assert.equal(parseNumericKnots(null), undefined);
  assert.equal(parseNumericKnots(undefined), undefined);
  assert.equal(parseNumericKnots(12.4), 12.4);
});

test("isUsableForecastPoint rejects null-ingested gaps", () => {
  assert.equal(isUsableForecastPoint({ windSpeedKnots: 0, windGustKnots: 0 }), false);
  assert.equal(isUsableForecastPoint({ windSpeedKnots: 10, windGustKnots: 14 }), true);
  assert.equal(isUsableForecastPoint({ windSpeedKnots: 0, windGustKnots: 12 }), true);
});
