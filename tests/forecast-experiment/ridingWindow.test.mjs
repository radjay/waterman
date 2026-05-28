import assert from "node:assert/strict";
import test from "node:test";
import {
  isWithinRidingWindow,
  resolveKickInInRidingWindow,
  ridingWindowBounds,
  timelineSustainedKickIn,
} from "../../lib/forecast-experiment/ridingWindow.js";
import { localDayWindowMs } from "../../lib/forecast-experiment/time.js";

test("resolveKickInInRidingWindow rejects early regressor before sustained timeline", () => {
  const dateLocal = "2026-05-30";
  const { startAt } = localDayWindowMs(dateLocal);
  const kickIn = resolveKickInInRidingWindow({
    dateLocal,
    kickInMinutes: 10 * 60 + 39,
    kickInThreshold: 0.5,
    sessionAllowed: true,
    probabilityTimeline: [
      { time: startAt + 14 * 3_600_000, rideableProbability: 0.7 },
      { time: startAt + 15 * 3_600_000, rideableProbability: 0.85 },
    ],
  });

  assert.equal(kickIn, startAt + 14 * 3_600_000);
});

test("resolveKickInInRidingWindow prefers in-window regressor when after sustained timeline", () => {
  const dateLocal = "2026-05-30";
  const { startAt } = localDayWindowMs(dateLocal);
  const kickIn = resolveKickInInRidingWindow({
    dateLocal,
    kickInMinutes: 12 * 60 + 39,
    kickInThreshold: 0.5,
    sessionAllowed: true,
    probabilityTimeline: [
      { time: startAt + 10 * 3_600_000, rideableProbability: 0.7 },
    ],
  });

  assert.equal(kickIn, startAt + 12 * 3_600_000 + 39 * 60_000);
});

test("resolveKickInInRidingWindow ignores regressor before 8am and uses timeline", () => {
  const dateLocal = "2026-05-30";
  const { startAt } = localDayWindowMs(dateLocal);
  const kickIn = resolveKickInInRidingWindow({
    dateLocal,
    kickInMinutes: 5 * 60 + 3,
    kickInThreshold: 0.5,
    sessionAllowed: true,
    probabilityTimeline: [
      { time: startAt + 10 * 3_600_000, rideableProbability: 0.7 },
    ],
  });

  assert.equal(kickIn, startAt + 10 * 3_600_000);
});

test("resolveKickInInRidingWindow rejects kick-in after 8pm", () => {
  const dateLocal = "2026-05-30";
  const { startAt, windowEnd } = ridingWindowBounds(dateLocal);
  const kickIn = resolveKickInInRidingWindow({
    dateLocal,
    kickInMinutes: 21 * 60,
    kickInThreshold: 0.5,
    sessionAllowed: true,
    probabilityTimeline: [],
  });

  assert.equal(kickIn, undefined);
  assert.equal(windowEnd, startAt + 20 * 3_600_000);
});

test("timelineSustainedKickIn requires two consecutive rideable hours", () => {
  const dateLocal = "2026-05-30";
  const { startAt, windowStart, windowEnd } = ridingWindowBounds(dateLocal);
  const timeline = [
    { time: startAt + 10 * 3_600_000, rideableProbability: 0.7 },
    { time: startAt + 11 * 3_600_000, rideableProbability: 0.4 },
    { time: startAt + 14 * 3_600_000, rideableProbability: 0.8 },
    { time: startAt + 15 * 3_600_000, rideableProbability: 0.85 },
  ];
  assert.equal(timelineSustainedKickIn(timeline, windowStart, windowEnd, 0.5), startAt + 14 * 3_600_000);
});

test("isWithinRidingWindow accepts 8am through 8pm Lisbon", () => {
  const dateLocal = "2026-05-30";
  const { startAt } = localDayWindowMs(dateLocal);
  assert.equal(isWithinRidingWindow(startAt + 8 * 3_600_000, dateLocal), true);
  assert.equal(isWithinRidingWindow(startAt + 20 * 3_600_000, dateLocal), true);
  assert.equal(isWithinRidingWindow(startAt + 7 * 3_600_000, dateLocal), false);
  assert.equal(isWithinRidingWindow(startAt + 21 * 3_600_000, dateLocal), false);
});
