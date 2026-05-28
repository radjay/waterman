import assert from "node:assert/strict";
import test from "node:test";
import { buildBaselinePrediction, bayLagMinutesFromCaboRaso } from "../../lib/forecast-experiment/prediction.js";
import { resolveChartKickInAtMs, resolveKickInHistory, resolveStoredKickInAtMs } from "../../lib/forecast-experiment/predictionFields.js";

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

test("buildBaselinePrediction ignores null-ingested 0/0 forecast gaps", () => {
  const now = Date.UTC(2026, 6, 1, 10);
  const prediction = buildBaselinePrediction({
    targetLocationSlug: "cascais-bay",
    forecastDateLocal: "2026-07-01",
    generatedAt: now,
    points: [
      point(now + 6 * 60 * 60_000, "ecmwf", 0, 0),
      point(now + 6 * 60 * 60_000, "gfs", 16, 18),
    ],
    caboRasoObservations: [],
    thresholdKnots: 12,
  });
  assert.equal(prediction.inputs.pointCount, 1);
  assert.ok(prediction.predictedKickInAt);
});

test("estimates shorter bay lag when Cabo Raso is already strong", () => {
  assert.equal(bayLagMinutesFromCaboRaso({ windSpeedKnots: 22, windGustKnots: 24, windDirectionDeg: 330 }), 45);
  assert.equal(bayLagMinutesFromCaboRaso({ windSpeedKnots: 14, windGustKnots: 14, windDirectionDeg: 330 }), 90);
});

test("resolveStoredKickInAtMs keeps earliest stored kick-in for backtest anchor", () => {
  const early = Date.parse("2026-05-27T13:09:00Z");
  const later = Date.parse("2026-05-27T14:09:00Z");
  assert.equal(
    resolveStoredKickInAtMs(
      [
        { forecastDateLocal: "2026-05-27", predictedKickInAt: later },
        { forecastDateLocal: "2026-05-27", predictedKickInAt: early },
      ],
      "2026-05-27"
    ),
    early
  );
});

test("resolveChartKickInAtMs prefers stored kick-in over live", () => {
  const stored = Date.parse("2026-05-27T13:09:00Z");
  const live = Date.parse("2026-05-27T14:30:00Z");
  assert.equal(
    resolveChartKickInAtMs({
      liveKickInMs: live,
      storedPredictions: [{ forecastDateLocal: "2026-05-27", predictedKickInAt: stored }],
      dateLocal: "2026-05-27",
    }),
    stored
  );
});

test("resolveKickInHistory returns earliest and latest stored kick-ins", () => {
  const early = Date.parse("2026-05-27T13:09:00Z");
  const late = Date.parse("2026-05-27T14:09:00Z");
  const history = resolveKickInHistory({
    liveKickInMs: null,
    storedPredictions: [
      {
        forecastDateLocal: "2026-05-27",
        generatedAt: 1,
        predictedKickInAt: early,
      },
      {
        forecastDateLocal: "2026-05-27",
        generatedAt: 2,
        predictedKickInAt: late,
      },
    ],
    dateLocal: "2026-05-27",
  });

  assert.equal(history.earliestKickInAtMs, early);
  assert.equal(history.latestKickInAtMs, late);
  assert.equal(history.showBoth, true);
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
