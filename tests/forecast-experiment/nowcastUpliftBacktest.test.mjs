import assert from "node:assert/strict";
import test from "node:test";
import {
  computeUpliftMinutes,
  hadStrongCaboBeforeHour,
  summarizeNowcastUplift,
} from "../../lib/forecast-experiment/nowcastUpliftBacktest.js";
import { localDayWindowMs } from "../../lib/forecast-experiment/time.js";

test("computeUpliftMinutes returns positive when nowcast is closer", () => {
  assert.equal(computeUpliftMinutes(90, 45), 45);
  assert.equal(computeUpliftMinutes(60, 80), -20);
  assert.equal(computeUpliftMinutes(null, 40), null);
});

test("hadStrongCaboBeforeHour detects sustained Cabo before noon", () => {
  const dateLocal = "2025-07-10";
  const { startAt } = localDayWindowMs(dateLocal);
  const caboObservations = [
    obs(startAt + 9 * 3_600_000, 11, 13),
    obs(startAt + 9 * 3_600_000 + 20 * 60_000, 12, 14),
  ];
  assert.equal(
    hadStrongCaboBeforeHour({ dateLocal, caboObservations, thresholdKnots: 12 }),
    true
  );
  assert.equal(
    hadStrongCaboBeforeHour({
      dateLocal,
      caboObservations: [obs(startAt + 9 * 3_600_000, 6, 8)],
      thresholdKnots: 12,
    }),
    false
  );
});

test("summarizeNowcastUplift passes when uplift and improved share meet bar", () => {
  const days = [
    {
      qualifies: true,
      hasForecastData: true,
      actual: { kickInAt: 1 },
      forecast: { kickInP50At: 1 },
      nowcast: { kickInP50At: 1 },
      forecastErrorMinutes: 80,
      nowcastErrorMinutes: 50,
      upliftMinutes: 30,
      nowcastImproved: true,
    },
    {
      qualifies: true,
      hasForecastData: true,
      actual: { kickInAt: 1 },
      forecast: { kickInP50At: 1 },
      nowcast: { kickInP50At: 1 },
      forecastErrorMinutes: 70,
      nowcastErrorMinutes: 40,
      upliftMinutes: 30,
      nowcastImproved: true,
    },
    {
      qualifies: true,
      hasForecastData: true,
      actual: { kickInAt: 1 },
      forecast: { kickInP50At: 1 },
      nowcast: { kickInP50At: 1 },
      forecastErrorMinutes: 60,
      nowcastErrorMinutes: 55,
      upliftMinutes: 5,
      nowcastImproved: true,
    },
    {
      qualifies: true,
      hasForecastData: true,
      actual: { kickInAt: 1 },
      forecast: { kickInP50At: 1 },
      nowcast: { kickInP50At: 1 },
      forecastErrorMinutes: 90,
      nowcastErrorMinutes: 70,
      upliftMinutes: 20,
      nowcastImproved: true,
    },
    {
      qualifies: true,
      hasForecastData: true,
      actual: { kickInAt: 1 },
      forecast: { kickInP50At: 1 },
      nowcast: { kickInP50At: 1 },
      forecastErrorMinutes: 100,
      nowcastErrorMinutes: 60,
      upliftMinutes: 40,
      nowcastImproved: true,
    },
  ];

  const summary = summarizeNowcastUplift(days);
  assert.equal(summary.comparableDayCount, 5);
  assert.equal(summary.meanUpliftMinutes, 25);
  assert.equal(summary.improvedShare, 1);
  assert.equal(summary.passesVerification, true);
});

function obs(observedAt, speed, gust) {
  return {
    observedAt,
    windSpeedKnots: speed,
    windGustKnots: gust,
    quality: "ok",
  };
}
