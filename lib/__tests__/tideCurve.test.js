import { describe, it, expect } from "vitest";
import { nextTide, tideCurve } from "../tideCurve";

const T0 = Date.UTC(2026, 7, 7, 0, 0, 0);
const HOUR = 60 * 60 * 1000;

const MARKS = [
  { time: T0 + 4 * HOUR, height: 1.9, type: "high" },
  { time: T0 + 10 * HOUR, height: 0.4, type: "low" },
  { time: T0 + 16 * HOUR, height: 2.1, type: "high" },
];

describe("tideCurve", () => {
  it("passes exactly through every mark", () => {
    const points = tideCurve(MARKS, T0, T0 + 24 * HOUR);
    for (const mark of MARKS) {
      const at = points.find((p) => p.time === mark.time);
      expect(at, `mark at ${mark.time}`).toBeTruthy();
      expect(at.height).toBeCloseTo(mark.height, 6);
    }
  });

  it("never overshoots the pair it sits between", () => {
    // The whole reason for a cosine rather than a spline: a spline through four
    // points a day invents water that is not there.
    const points = tideCurve(MARKS, T0, T0 + 24 * HOUR);
    const between = points.filter((p) => p.time > MARKS[0].time && p.time < MARKS[1].time);
    expect(between.every((p) => p.height <= 1.9 && p.height >= 0.4)).toBe(true);
  });

  it("is monotonic between two marks — the tide does not turn mid-segment", () => {
    const points = tideCurve(MARKS, MARKS[0].time, MARKS[1].time);
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i].height).toBeLessThanOrEqual(points[i - 1].height + 1e-9);
    }
  });

  it("draws nothing outside the marks", () => {
    // Extrapolating past the first/last mark would invent a level we do not
    // know. The scrape keeps ~18h of past extremes so the day chart has a
    // morning mark to land on; this curve still refuses to invent beyond them.
    const points = tideCurve(MARKS, T0, T0 + 24 * HOUR);
    expect(points[0].time).toBe(MARKS[0].time);
    expect(points[points.length - 1].time).toBe(MARKS[2].time);
  });

  it("starts inside the day when the first mark is before the chart window", () => {
    // Day chart is 07→22. A high at 05:00 must still anchor the cosine so the
    // dashed line begins at 07:00 — not at the next extreme mid-morning.
    // Height at 07:00 is interpolated between real marks; nothing is invented.
    const dayStart = T0 + 7 * HOUR;
    const dayEnd = T0 + 22 * HOUR;
    const points = tideCurve(MARKS, dayStart, dayEnd);
    expect(points[0].time).toBe(dayStart);
    expect(points[0].height).toBeCloseTo(
      // midway phase from 04:00→10:00 at 07:00 is 3/6 of the cosine ease
      MARKS[0].height +
        (MARKS[1].height - MARKS[0].height) *
          (1 - Math.cos((3 / 6) * Math.PI)) / 2,
      6
    );
    expect(points[0].height).toBeLessThan(MARKS[0].height);
    expect(points[0].height).toBeGreaterThan(MARKS[1].height);
  });

  it("returns nothing when the window and the marks do not overlap", () => {
    expect(tideCurve(MARKS, T0 + 18 * HOUR, T0 + 22 * HOUR)).toEqual([]);
  });

  it("returns nothing from fewer than two marks — one is a level, not a curve", () => {
    expect(tideCurve([MARKS[0]], T0, T0 + 24 * HOUR)).toEqual([]);
    expect(tideCurve([], T0, T0 + 24 * HOUR)).toEqual([]);
    expect(tideCurve(null, T0, T0 + 24 * HOUR)).toEqual([]);
  });

  it("ignores marks with no height", () => {
    const points = tideCurve([...MARKS, { time: T0 + 20 * HOUR }], T0, T0 + 24 * HOUR);
    expect(points[points.length - 1].time).toBe(MARKS[2].time);
  });
});

describe("nextTide", () => {
  it("returns the soonest mark at or after the given time", () => {
    expect(nextTide(MARKS, T0 + 5 * HOUR).time).toBe(MARKS[1].time);
    expect(nextTide(MARKS, T0 + 20 * HOUR)).toBeNull();
  });
});
