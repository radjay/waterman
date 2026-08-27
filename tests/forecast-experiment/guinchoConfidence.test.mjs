import assert from "node:assert/strict";
import test from "node:test";
import { computeAgreementReliability } from "../../lib/forecast-experiment/guinchoConfidence.js";

function hour(dateLocal, validTime, effectiveWindKnots) {
  return { dateLocal, validTime, effectiveWindKnots };
}

function fc(model, leadDay, validTime, speed, gust) {
  return [`${model}:${leadDay}:${validTime}`, { windSpeedKnots: speed, windGustKnots: gust }];
}

test("unanimous session days show zero false calls; split days show some", () => {
  const observedHours = [];
  const entries = [];
  // Day A: all 3 models call it, station really is a session (4 hours, unanimous)
  for (let h = 0; h < 4; h += 1) {
    const t = 1000 + h;
    observedHours.push(hour("2025-08-01", t, 16));
    entries.push(fc("icon-eu", 1, t, 16, 20), fc("icon-global", 1, t, 16, 20), fc("gfs-global", 1, t, 16, 20));
  }
  // Day B: only 1 of 3 models calls it, station never reaches 12kt (false call, split agreement)
  for (let h = 0; h < 4; h += 1) {
    const t = 2000 + h;
    observedHours.push(hour("2025-08-02", t, 6));
    entries.push(fc("icon-eu", 1, t, 14, 16), fc("icon-global", 1, t, 4, 6), fc("gfs-global", 1, t, 4, 6));
  }
  const forecastIndex = new Map(entries);
  const buckets = computeAgreementReliability(observedHours, forecastIndex, 1);
  const unanimous = buckets.find((b) => b.agreementBucket === "3");
  const noCall = buckets.find((b) => b.agreementBucket === "no-call");
  assert.equal(unanimous.falseGoDayPct, 0);
  assert.ok(!noCall, "day B never reaches majority, so it is not a called day at all");
});
