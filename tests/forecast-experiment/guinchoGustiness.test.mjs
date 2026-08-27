import assert from "node:assert/strict";
import test from "node:test";
import { computeGustinessSkill, gustinessRatio } from "../../lib/forecast-experiment/guinchoGustiness.js";

test("gustinessRatio is gust/speed, undefined when speed is 0 or missing", () => {
  assert.equal(gustinessRatio({ windSpeedKnots: 10, windGustKnots: 15 }), 1.5);
  assert.equal(gustinessRatio({ windSpeedKnots: 0, windGustKnots: 15 }), undefined);
  assert.equal(gustinessRatio({ windSpeedKnots: 10, windGustKnots: undefined }), undefined);
});

test("computeGustinessSkill reports MAE and bias of the ratio gap", () => {
  const pairs = [
    { observed: { windSpeedKnots: 10, windGustKnots: 15 }, forecast: { windSpeedKnots: 10, windGustKnots: 12 } }, // obs 1.5, fc 1.2 -> abs 0.3, signed -0.3
    { observed: { windSpeedKnots: 10, windGustKnots: 15 }, forecast: { windSpeedKnots: 10, windGustKnots: 18 } }, // obs 1.5, fc 1.8 -> abs 0.3, signed +0.3
  ];
  const result = computeGustinessSkill(pairs);
  assert.equal(result.gustinessHours, 2);
  assert.equal(result.gustinessMae, 0.3);
  assert.equal(result.gustinessBias, 0);
});

test("computeGustinessSkill skips pairs with no usable ratio", () => {
  const pairs = [{ observed: { windSpeedKnots: 0, windGustKnots: 15 }, forecast: { windSpeedKnots: 10, windGustKnots: 12 } }];
  const result = computeGustinessSkill(pairs);
  assert.equal(result.gustinessHours, 0);
  assert.equal(result.gustinessMae, undefined);
});
