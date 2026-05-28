import assert from "node:assert/strict";
import test from "node:test";
import { marinaForecastKickInFromHourly } from "../../lib/forecast-experiment/dayWindChartData.js";
import { localDayWindowMs } from "../../lib/forecast-experiment/time.js";

test("marinaForecastKickInFromHourly finds first riding-window hour above threshold", () => {
  const dateLocal = "2026-05-27";
  const { startAt } = localDayWindowMs(dateLocal);
  const hourly = Array.from({ length: 16 }, (_, index) => {
    const hourLocal = 6 + index;
    const peak = hourLocal < 13 ? 8 : 14;
    return {
      hourLocal,
      validTime: startAt + hourLocal * 3_600_000,
      windSpeedKnots: peak - 1,
      windGustKnots: peak,
    };
  });

  const kickIn = marinaForecastKickInFromHourly(hourly, dateLocal, 12);
  assert.equal(kickIn, startAt + 13 * 3_600_000);
});
