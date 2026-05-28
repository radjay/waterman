import assert from "node:assert/strict";
import test from "node:test";
import { bucketLeadHours, meanAbsoluteError, brierScore, onsetErrorMinutes } from "../../lib/forecast-experiment/skill.js";

test("buckets lead hours", () => {
  assert.equal(bucketLeadHours(5), "0-6");
  assert.equal(bucketLeadHours(18), "12-24");
  assert.equal(bucketLeadHours(49), "48-72");
});

test("computes wind speed MAE", () => {
  assert.equal(meanAbsoluteError([10, 12], [12, 11]), 1.5);
});

test("computes brier score", () => {
  assert.equal(brierScore([0.8, 0.2], [1, 0]), 0.04);
});

test("computes onset error in minutes", () => {
  const actual = Date.UTC(2026, 6, 1, 16);
  const predicted = Date.UTC(2026, 6, 1, 17);
  assert.equal(onsetErrorMinutes(actual, predicted), 60);
});
