import assert from "node:assert/strict";
import test from "node:test";
import { localDayWindowMs } from "../../lib/forecast-experiment/time.js";
import {
  describeBayDay,
  describeCaboLine,
  formatLisbonDate,
  rideVerdict,
  verdictDot,
} from "../../lib/forecast-experiment/userFacingCopy.js";

test("formatLisbonDate returns Today and Tomorrow", () => {
  const ref = Date.parse("2026-05-27T12:00:00Z");
  assert.equal(formatLisbonDate("2026-05-27", ref), "Today");
  assert.equal(formatLisbonDate("2026-05-28", ref), "Tomorrow");
});

test("describeBayDay uses Strong headline when ICON7 peak is 25+ kt", () => {
  const morning = Date.parse("2026-05-30T08:00:00Z");
  const { startAt } = localDayWindowMs("2026-05-30");
  const copy = describeBayDay(
    {
      forecastDateLocal: "2026-05-30",
      predictedKickInAt: startAt + 10 * 3_600_000,
      confidence: 0.78,
      inputs: {
        sessionProbability: 0.6,
        sessionThreshold: 0.55,
        kickInThreshold: 0.5,
        predictedKickInMinutes: 10 * 60,
      },
      probabilityTimeline: [
        { time: startAt + 10 * 3_600_000, rideableProbability: 0.7 },
      ],
    },
    { referenceMs: morning, peakForecastKnots: 30 }
  );

  assert.equal(copy.verdict, "go");
  assert.equal(copy.headline, "Strong");
  assert.match(copy.kickInTime, /^60% · /);
});

test("describeBayDay shows future kick-in during the day", () => {
  const morning = Date.parse("2026-05-27T08:00:00Z");
  const copy = describeBayDay(
    {
      forecastDateLocal: "2026-05-27",
      predictedKickInAt: Date.parse("2026-05-27T13:49:00Z"),
      confidence: 0.78,
      inputs: { sessionProbability: 0.6, sessionThreshold: 0.55, kickInThreshold: 0.5 },
      probabilityTimeline: [
        { time: Date.parse("2026-05-27T13:49:00Z"), rideableProbability: 0.7 },
      ],
    },
    { isLive: true, referenceMs: morning }
  );

  assert.equal(copy.headline, "Likely later");
  assert.equal(copy.likelihoodPct, 60);
  assert.match(copy.kickInTime, /^60% · /);
  assert.ok(copy.kickInTimePlain);
});

test("describeBayDay marks done for today after riding hours", () => {
  const night = Date.parse("2026-05-27T21:49:00Z");
  const copy = describeBayDay(
    {
      forecastDateLocal: "2026-05-27",
      predictedKickInAt: Date.parse("2026-05-27T13:49:00Z"),
      confidence: 0.78,
      inputs: { sessionProbability: 1 },
    },
    { isLive: true, referenceMs: night }
  );

  assert.equal(copy.headline, "Done for today");
  assert.equal(copy.kickInTime, null);
});

test("describeBayDay marks flat days", () => {
  const morning = Date.parse("2026-05-28T08:00:00Z");
  const copy = describeBayDay(
    {
      forecastDateLocal: "2026-05-28",
      confidence: 0.4,
      inputs: { sessionProbability: 0.11 },
    },
    { referenceMs: morning }
  );

  assert.equal(copy.verdict, "skip");
  assert.equal(copy.headline, "Flat");
});

test("describeCaboLine formats wind", () => {
  assert.match(
    describeCaboLine({
      windSpeedKnots: 8,
      windGustKnots: 12,
      windDirectionDeg: 135,
    }),
    /^Cabo \d+ kt/
  );
});

test("rideVerdict and verdictDot align", () => {
  assert.equal(rideVerdict({ predictedKickInAt: 1, confidence: 0.7, sessionProbability: 0.6 }), "go");
  assert.equal(verdictDot("go"), "bg-emerald-500");
});
