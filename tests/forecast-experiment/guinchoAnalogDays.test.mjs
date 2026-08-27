import assert from "node:assert/strict";
import test from "node:test";
import { fingerprintDay, findAnalogDays } from "../../lib/forecast-experiment/guinchoAnalogDays.js";

function fc(model, leadDay, validTime, dir) {
  return [
    `${model}:${leadDay}:${validTime}`,
    { windSpeedKnots: 16, windGustKnots: 20, effectiveWindKnots: 18, windDirectionDeg: dir },
  ];
}

test("fingerprintDay keys by regime, season, and each model's go/no-go call", () => {
  const dayHours = [{ validTime: 100 }, { validTime: 101 }, { validTime: 102 }, { validTime: 103 }];
  const forecastIndex = new Map([
    ...dayHours.flatMap((h) => [
      fc("ecmwf-ifs025", 1, h.validTime, 340),
      fc("icon-eu", 1, h.validTime, 340),
      fc("icon-global", 1, h.validTime, 340),
      fc("gfs-global", 1, h.validTime, 340),
    ]),
  ]);
  const fingerprint = fingerprintDay("2025-08-15", dayHours, forecastIndex, 1);
  assert.equal(fingerprint.regime, "nortada");
  assert.equal(fingerprint.season, "maySep");
  assert.deepEqual(fingerprint.calls, [1, 1, 1, 1]); // all four models called it (16+20)/2=18 >= 12
});

test("findAnalogDays returns exact-key matches first, falls back once thinned below k", () => {
  const target = { dateLocal: "2025-08-15", regime: "nortada", season: "maySep", key: "nortada:maySep:1111" };
  const exactMatches = Array.from({ length: 3 }, (_, i) => ({
    dateLocal: `2025-07-0${i + 1}`,
    regime: "nortada",
    season: "maySep",
    key: "nortada:maySep:1111",
  }));
  const fallbackMatches = Array.from({ length: 5 }, (_, i) => ({
    dateLocal: `2025-06-0${i + 1}`,
    regime: "nortada",
    season: "maySep",
    key: "nortada:maySep:1110",
  }));
  const analogs = findAnalogDays(target, [...exactMatches, ...fallbackMatches], { k: 6 });
  assert.equal(analogs.length, 6);
  assert.equal(analogs.slice(0, 3).every((day) => day.key === target.key), true);
});
