import assert from "node:assert/strict";
import test from "node:test";
import { buildMlTrainingRow } from "../../lib/forecast-experiment/mlDataset.js";
import { localDayWindowMs } from "../../lib/forecast-experiment/time.js";

test("hourlyRideable labels require sustained rideability across consecutive hours", () => {
  const dateLocal = "2026-05-30";
  const { startAt } = localDayWindowMs(dateLocal);

  const row = buildMlTrainingRow({
    dateLocal,
    forecastPoints: [],
    marinaObservations: [
      { observedAt: startAt + 10 * 3_600_000 + 5 * 60_000, windSpeedKnots: 14, windGustKnots: 16, quality: "ok" },
      { observedAt: startAt + 10 * 3_600_000 + 20 * 60_000, windSpeedKnots: 13, windGustKnots: 15, quality: "ok" },
      { observedAt: startAt + 11 * 3_600_000 + 10 * 60_000, windSpeedKnots: 8, windGustKnots: 10, quality: "ok" },
      { observedAt: startAt + 14 * 3_600_000 + 10 * 60_000, windSpeedKnots: 14, windGustKnots: 18, quality: "ok" },
      { observedAt: startAt + 15 * 3_600_000 + 10 * 60_000, windSpeedKnots: 15, windGustKnots: 19, quality: "ok" },
    ],
    caboRasoObservations: [],
    thresholdKnots: 12,
  });

  assert.equal(row.hourlyRideable.h10Rideable, 0, "10am alone is not sustained when 11am drops");
  assert.equal(row.hourlyRideable.h14Rideable, 1, "2pm sustained when 3pm also rideable");
});
