import assert from "node:assert/strict";
import test from "node:test";
import { REGIME_NORTADA } from "../../lib/forecast-experiment/dayRegimes.js";
import { analyzeNortadaWindByMonth } from "../../lib/forecast-experiment/nortadaWindAnalysis.js";
import { localDayWindowMs } from "../../lib/forecast-experiment/time.js";

function obs(observedAt, speed, gust, directionDeg = 330) {
  return {
    observedAt,
    quality: "ok",
    windSpeedKnots: speed,
    windGustKnots: gust,
    windDirectionDeg: directionDeg,
  };
}

test("analyzeNortadaWindByMonth uses only readings above 10 kt in the active window", () => {
  const dateLocal = "2025-05-15";
  const { startAt } = localDayWindowMs(dateLocal);
  const observationsByStation = {
    "cabo-raso": {
      [dateLocal]: [
        obs(startAt + 10 * 3_600_000, 8, 9, 330),
        obs(startAt + 13 * 3_600_000, 14, 16, 330),
        obs(startAt + 14 * 3_600_000, 18, 20, 330),
      ],
    },
  };

  const analysis = analyzeNortadaWindByMonth({
    nortadaLabels: [{ dateLocal, dayRegime: REGIME_NORTADA }],
    observationsByStation,
    stations: ["cabo-raso"],
  });

  assert.deepEqual(analysis.byYearMonth["2025-05"], {
    days: 1,
    avgWindKnots: 17,
    avgPeakKnots: 19,
    maxPeakKnots: 19,
  });
});
