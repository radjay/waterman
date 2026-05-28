import assert from "node:assert/strict";
import test from "node:test";
import {
  ML_FEATURE_NAMES,
  buildMlFeatureVector,
  featureVectorByName,
} from "../../lib/forecast-experiment/mlFeatures.js";
import { localDayWindowMs } from "../../lib/forecast-experiment/time.js";

test("buildMlFeatureVector includes model spread features", () => {
  const dateLocal = "2026-05-30";
  const { startAt } = localDayWindowMs(dateLocal);
  const points = [
    {
      model: "icon-eu",
      validTime: startAt + 7 * 3_600_000,
      windSpeedKnots: 8,
      windGustKnots: 10,
      windDirectionDeg: 320,
      quality: "ok",
    },
    {
      model: "icon-global",
      validTime: startAt + 7 * 3_600_000,
      windSpeedKnots: 18,
      windGustKnots: 22,
      windDirectionDeg: 320,
      quality: "ok",
    },
    {
      model: "gfs-global",
      validTime: startAt + 7 * 3_600_000,
      windSpeedKnots: 7,
      windGustKnots: 9,
      windDirectionDeg: 310,
      quality: "ok",
    },
  ];

  const vector = buildMlFeatureVector({
    dateLocal,
    forecastPoints: points,
    caboRasoObservations: [],
    thresholdKnots: 12,
  });
  const named = featureVectorByName(vector);

  assert.ok(ML_FEATURE_NAMES.includes("spread_icon13_icon7_h7"));
  assert.equal(named.spread_icon13_icon7_h7, named.icon13_h7_effective - named.icon7_h7_effective);
  assert.equal(named.spread_gfs_icon7_h7, named.gfs_h7_effective - named.icon7_h7_effective);
});
