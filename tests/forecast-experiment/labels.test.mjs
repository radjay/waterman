import assert from "node:assert/strict";
import test from "node:test";
import { buildDailyLabel } from "../../lib/forecast-experiment/labels.js";

const base = Date.UTC(2026, 6, 1, 12);

test("finds kick-in after sustained effective wind threshold crossing", () => {
  const observations = [
    obs(base + 0 * 15 * 60_000, 8, 10),
    obs(base + 1 * 15 * 60_000, 12, 12),
    obs(base + 2 * 15 * 60_000, 15, 15),
    obs(base + 3 * 15 * 60_000, 16, 18),
    obs(base + 4 * 15 * 60_000, 17, 19),
  ];
  const label = buildDailyLabel({
    locationSlug: "cabo-raso",
    dateLocal: "2026-07-01",
    observations,
    reports: [],
    thresholdKnots: 12,
  });
  assert.equal(label.actualKickInAt, base + 1 * 15 * 60_000);
  assert.equal(label.labelStatus, "observed");
});

test("uses reports when station data is absent", () => {
  const reports = [
    { observedAt: base, status: "not_in", confidence: 0.6 },
    { observedAt: base + 60 * 60_000, status: "rideable", confidence: 0.6 },
  ];
  const label = buildDailyLabel({
    locationSlug: "cascais-bay",
    dateLocal: "2026-07-01",
    observations: [],
    reports,
    thresholdKnots: 12,
  });
  assert.equal(label.actualKickInAt, base + 60 * 60_000);
  assert.equal(label.labelStatus, "report-assisted");
});

test("infers bay kick-in from cabo raso lag", () => {
  const caboRasoObservations = [
    obs(base, 10, 10),
    obs(base + 15 * 60_000, 14, 16),
    obs(base + 30 * 60_000, 16, 18),
  ];
  const label = buildDailyLabel({
    locationSlug: "cascais-bay",
    dateLocal: "2026-07-01",
    observations: [],
    reports: [],
    caboRasoObservations,
    thresholdKnots: 12,
  });
  assert.equal(label.labelStatus, "lag-inferred");
  assert.ok(label.actualKickInAt > base);
});

function obs(observedAt, windSpeedKnots, windGustKnots) {
  return {
    observedAt,
    windSpeedKnots,
    windGustKnots,
    windDirectionDeg: 330,
    quality: "ok",
  };
}
