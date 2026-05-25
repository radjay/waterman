import assert from "node:assert/strict";
import test from "node:test";
import { buildBaselinePrediction, bayLagMinutesFromCaboRaso } from "../../lib/forecast-experiment/prediction.js";

test("reduces confidence when models disagree", () => {
  const now = Date.UTC(2026, 6, 1, 10);
  const points = [
    point(now + 6 * 60 * 60_000, "gfs", 20, 24),
    point(now + 6 * 60 * 60_000, "ecmwf", 10, 12),
  ];
  const prediction = buildBaselinePrediction({
    targetLocationSlug: "cascais-bay",
    forecastDateLocal: "2026-07-01",
    generatedAt: now,
    points,
    caboRasoObservations: [],
    thresholdKnots: 12,
  });
  assert.equal(prediction.confidence < 0.7, true);
});

test("estimates shorter bay lag when Cabo Raso is already strong", () => {
  assert.equal(bayLagMinutesFromCaboRaso({ windSpeedKnots: 22, windGustKnots: 24, windDirectionDeg: 330 }), 45);
  assert.equal(bayLagMinutesFromCaboRaso({ windSpeedKnots: 14, windGustKnots: 14, windDirectionDeg: 330 }), 90);
});

function point(validTime, model, windSpeedKnots, windGustKnots) {
  return {
    provider: "open-meteo",
    model,
    validTime,
    windSpeedKnots,
    windGustKnots,
    windDirectionDeg: 330,
  };
}
