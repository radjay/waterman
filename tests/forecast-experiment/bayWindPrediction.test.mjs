import assert from "node:assert/strict";
import test from "node:test";
import { buildBayWindPredictionV2 } from "../../lib/forecast-experiment/bayWindPrediction.js";
import { localDayWindowMs } from "../../lib/forecast-experiment/time.js";

test("strong nortada afternoon forecast yields afternoon kick-in with confidence", () => {
  const dateLocal = "2026-07-15";
  const { startAt } = localDayWindowMs(dateLocal);
  const generatedAt = startAt + 7 * 3_600_000;
  const points = [];
  for (let hour = 6; hour <= 20; hour += 1) {
    const speed = hour < 13 ? 8 : 18;
    points.push(forecastPoint(startAt - 12 * 3_600_000, startAt + hour * 3_600_000, speed, speed + 2, 330));
  }

  const prediction = buildBayWindPredictionV2({
    targetLocationSlug: "cascais-bay",
    forecastDateLocal: dateLocal,
    generatedAt,
    points,
    caboRasoObservations: [],
    thresholdKnots: 12,
  });

  assert.ok(prediction.kickInP50At);
  assert.ok(prediction.kickInP50At >= startAt + 13 * 3_600_000);
  assert.ok(prediction.confidence > 0.5);
  assert.equal(prediction.modelVersion, "bay-wind-v2");
});

test("nowcast with strong Cabo nortada caps kick-in at cabo time plus lag", () => {
  const dateLocal = "2026-07-15";
  const { startAt } = localDayWindowMs(dateLocal);
  const generatedAt = startAt + 10 * 3_600_000;
  const caboKickInAt = startAt + 9 * 3_600_000;
  const points = [];
  for (let hour = 6; hour <= 20; hour += 1) {
    const speed = hour < 15 ? 10 : 20;
    points.push(forecastPoint(startAt - 12 * 3_600_000, startAt + hour * 3_600_000, speed, speed + 2, 330));
  }

  const prediction = buildBayWindPredictionV2({
    targetLocationSlug: "cascais-bay",
    forecastDateLocal: dateLocal,
    generatedAt,
    points,
    caboRasoObservations: [
      caboObs(caboKickInAt - 15 * 60_000, 16, 18, 330),
      caboObs(caboKickInAt, 18, 20, 330),
      caboObs(caboKickInAt + 15 * 60_000, 19, 21, 330),
    ],
    thresholdKnots: 12,
    mode: "nowcast",
  });

  const lagMinutes = prediction.inputs.caboLagMinutes ?? 90;
  const maxKickIn = caboKickInAt + lagMinutes * 60_000;
  assert.ok(prediction.kickInP50At);
  assert.ok(prediction.kickInP50At <= maxKickIn);
});

test("weak non-nortada forecast yields no kick-in", () => {
  const dateLocal = "2026-07-15";
  const { startAt } = localDayWindowMs(dateLocal);
  const generatedAt = startAt + 7 * 3_600_000;
  const points = [];
  for (let hour = 6; hour <= 20; hour += 1) {
    points.push(forecastPoint(startAt - 12 * 3_600_000, startAt + hour * 3_600_000, 6, 8, 180));
  }

  const prediction = buildBayWindPredictionV2({
    targetLocationSlug: "cascais-bay",
    forecastDateLocal: dateLocal,
    generatedAt,
    points,
    caboRasoObservations: [],
    thresholdKnots: 12,
  });

  assert.equal(prediction.kickInP50At, undefined);
});

function forecastPoint(runStartedAt, validTime, windSpeedKnots, windGustKnots, windDirectionDeg) {
  return {
    provider: "open-meteo",
    model: "icon-eu-previous-day1",
    runStartedAt,
    validTime,
    windSpeedKnots,
    windGustKnots,
    windDirectionDeg,
  };
}

function caboObs(observedAt, windSpeedKnots, windGustKnots, windDirectionDeg) {
  return {
    observedAt,
    windSpeedKnots,
    windGustKnots,
    windDirectionDeg,
    quality: "ok",
  };
}
