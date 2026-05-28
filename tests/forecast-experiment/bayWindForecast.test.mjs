import assert from "node:assert/strict";
import test from "node:test";
import { applyCaboLagFloorToNowcast } from "../../lib/forecast-experiment/bayWindForecast.js";
import { localDayWindowMs } from "../../lib/forecast-experiment/time.js";

test("applyCaboLagFloorToNowcast cannot predict kick-in before Cabo lag", () => {
  const dateLocal = "2026-05-30";
  const { startAt } = localDayWindowMs(dateLocal);
  const caboKickIn = startAt + 11 * 3_600_000;
  const earlyMlKickIn = startAt + 10 * 3_600_000;
  const lagMinutes = 90;

  const adjusted = applyCaboLagFloorToNowcast(
    {
      forecastDateLocal: dateLocal,
      predictedKickInAt: earlyMlKickIn,
      probabilityTimeline: [{ expectedWindKnots: 14 }],
      inputs: {},
    },
    {
      thresholdKnots: 12,
      caboRasoObservations: [
        { observedAt: caboKickIn - 20 * 60_000, windSpeedKnots: 10, windGustKnots: 10 },
        { observedAt: caboKickIn, windSpeedKnots: 14, windGustKnots: 14 },
        { observedAt: caboKickIn + 20 * 60_000, windSpeedKnots: 15, windGustKnots: 15 },
      ],
    }
  );

  assert.ok(adjusted.predictedKickInAt >= earlyMlKickIn);
  assert.equal(adjusted.predictedKickInAt, adjusted.inputs.caboLagFloorMs);
  assert.equal(adjusted.inputs.caboLagMinutes, lagMinutes);
});
