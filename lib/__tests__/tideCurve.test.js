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
    // The scrape stores tides forward from its own run, so "today before the
    // first mark" is a real gap. Extrapolating would draw a level we do not know.
    const points = tideCurve(MARKS, T0, T0 + 24 * HOUR);
    expect(points[0].time).toBe(MARKS[0].time);
    expect(points[points.length - 1].time).toBe(MARKS[2].time);
  });

  it("returns nothing when the window and the marks do not overlap", () => {
    // The case that hides the tide line on "today" after an evening scrape.
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
