import { describe, it, expect } from "vitest";
import {
  buildDayChart,
  dayStartOf,
  nowPercent,
  scoreBand,
  topPct,
  waveScale,
  windScale,
} from "../dayChart";

/**
 * The shared clock.
 *
 * These are the rules three screens depend on agreeing about, so they are
 * pinned here rather than left to whichever chart happened to be looked at
 * last.
 */

// A summer day in Lisbon (WEST, UTC+1). The forecast grid is UTC, so slots land
// on 07:00 / 10:00 / 13:00 local — the exact case a hardcoded axis got wrong for
// the other half of the year.
const DAY = dayStartOf(Date.UTC(2026, 7, 7, 12, 0, 0));
const HOUR = 60 * 60 * 1000;

const slots = (hours) =>
  hours.map((h) => ({ timestamp: DAY + h * HOUR, score: 70, speed: 12, gust: 17 }));

describe("buildDayChart", () => {
  it("keeps only the slots inside the charted hours", () => {
    const chart = buildDayChart({
      slots: slots([1, 4, 7, 10, 13, 16, 19, 22]),
      dayStart: DAY,
      nowMs: DAY + 14 * HOUR,
    });
    expect(chart.marks).toEqual([7, 10, 13, 16, 19, 22]);
    expect(chart.columns).toHaveLength(6);
  });

  it("lays the columns out as equal sixths", () => {
    const chart = buildDayChart({ slots: slots([7, 10, 13, 16, 19, 22]), dayStart: DAY });
    expect(chart.columns[0].left).toBe(0);
    expect(chart.columns[3].left).toBeCloseTo(50);
    expect(chart.columns.every((c) => Math.abs(c.width - 100 / 6) < 1e-9)).toBe(true);
  });

  it("marks exactly one column as current, and the earlier ones as past", () => {
    const chart = buildDayChart({
      slots: slots([7, 10, 13, 16, 19, 22]),
      dayStart: DAY,
      nowMs: DAY + 14 * HOUR + 20 * 60 * 1000,
    });
    expect(chart.columns.filter((c) => c.isCurrent)).toHaveLength(1);
    expect(chart.columns.find((c) => c.isCurrent).hour).toBe(13);
    expect(chart.columns.filter((c) => c.isPast).map((c) => c.hour)).toEqual([7, 10]);
  });

  it("drops duplicate timestamps left by a re-scrape", () => {
    const doubled = [...slots([7, 10]), ...slots([10, 13])];
    const chart = buildDayChart({ slots: doubled, dayStart: DAY });
    expect(chart.marks).toEqual([7, 10, 13]);
  });

  it("still draws an axis for a day with nothing on it", () => {
    // "Nothing here" has to look like a day, not like a broken chart.
    const chart = buildDayChart({ slots: [], dayStart: DAY });
    expect(chart.hasSlots).toBe(false);
    expect(chart.marks).toEqual([7, 10, 13, 16, 19, 22]);
  });

  it("has no now line on a day that is not today", () => {
    const chart = buildDayChart({
      slots: slots([31, 34, 37]), // 07:00, 10:00, 13:00 tomorrow
      dayStart: DAY + 24 * HOUR,
      nowMs: DAY + 14 * HOUR,
    });
    expect(chart.nowPct).toBeNull();
    // …but the whole of a future day is forecast, so the wash still covers it.
    expect(chart.futureFrom).toBe(0);
  });

  it("washes nothing on a day that is already over", () => {
    const chart = buildDayChart({
      slots: slots([7, 10, 13, 16, 19, 22]),
      dayStart: DAY,
      nowMs: DAY + 30 * HOUR,
    });
    expect(chart.futureFrom).toBeNull();
  });
});

describe("nowPercent", () => {
  it("sits on the continuous scale, never snapped to a slot boundary", () => {
    // 10:00 on a 07–22 axis is a fifth of the way across, which is INSIDE the
    // 10:00 column (16.7–33.3%) rather than on the seam before it.
    expect(nowPercent(DAY + 10 * HOUR, 7, 22)).toBeCloseTo(20);
    expect(nowPercent(DAY + 14 * HOUR + 30 * 60 * 1000, 7, 22)).toBeCloseTo(50);
  });

  it("clamps to the right edge inside the final slot", () => {
    // The 22:00 slot runs to 01:00, so 22:40 is on the chart but off the axis.
    expect(nowPercent(DAY + 22 * HOUR + 40 * 60 * 1000, 7, 22)).toBe(100);
  });

  it("is null before the day starts and after the last slot ends", () => {
    expect(nowPercent(DAY + 5 * HOUR, 7, 22)).toBeNull();
    expect(nowPercent(DAY + 25.5 * HOUR, 7, 22)).toBeNull();
  });
});

describe("scales", () => {
  it("keeps the wind ceiling at 30kt for a normal day", () => {
    expect(windScale([9, 14, 21]).max).toBe(30);
  });

  it("puts 5kt-step gridlines on a normal wind day", () => {
    // Dense enough to read 5 / 10 / 15 / 20 / 25; never only 15 and 25.
    const scale = windScale([9, 14, 21]);
    expect(scale.lines.map((l) => l.value)).toEqual([5, 10, 15, 20, 25]);
    expect(scale.lines.every((l) => l.label.endsWith("kt"))).toBe(true);
  });

  it("thins wind gridlines further when maxLines is lowered for short bands", () => {
    // Tall Now keeps 5 lines (5/10/15/20/25); short Report/Live pass maxLines: 3
    // so the same 30kt day collapses to 5 / 15 / 25.
    const tall = windScale([9, 14, 21]);
    expect(tall.lines.map((l) => l.value)).toEqual([5, 10, 15, 20, 25]);
    const short = windScale([9, 14, 21], { maxLines: 3 });
    expect(short.lines.map((l) => l.value)).toEqual([5, 15, 25]);
    expect(short.lines.length).toBeLessThanOrEqual(3);
  });

  it("thins wind gridlines when a denser 5kt set would crowd", () => {
    // A stretched day (max 50) would be 5..45 — nine lines. Spacing doubles
    // while keeping the first tick at 5kt: 5 / 15 / 25 / 35 / 45.
    const scale = windScale([12, 48]);
    expect(scale.max).toBeGreaterThanOrEqual(50);
    expect(scale.lines[0].value).toBe(5);
    expect(scale.lines.length).toBeLessThanOrEqual(5);
    expect(scale.lines.every((l) => l.value < scale.max)).toBe(true);
  });

  it("thins wave gridlines when maxLines is lowered for short bands", () => {
    const tall = waveScale([1.8, 2.0]);
    expect(tall.lines.length).toBeGreaterThan(2);
    const short = waveScale([1.8, 2.0], { maxLines: 2 });
    expect(short.lines.length).toBeLessThanOrEqual(2);
    expect(short.lines[0].value).toBe(0.5);
  });

  it("stretches rather than clipping a big day", () => {
    // A bar drawn at the ceiling would understate 40 knots as "the same as 30".
    const scale = windScale([12, 38]);
    expect(scale.max).toBeGreaterThan(38);
    expect(scale.lines.every((l) => l.value < scale.max)).toBe(true);
  });

  it("always leaves headroom above the swell peak", () => {
    // Regression: a 0.98 m peak against a 1 m ceiling drew the line along the
    // very top of the box, which reads as "off the scale".
    const scale = waveScale([0.9, 0.98]);
    expect(scale.max).toBeGreaterThan(1);
    expect(topPct(0.98, scale.max)).toBeGreaterThan(10);
  });

  it("puts 0.5m-step gridlines on the wave band", () => {
    // A single half-scale tick (e.g. 1.3m) is not enough — Guincho-sized days
    // need 0.5 / 1 / 1.5 … so the swell line is readable.
    const scale = waveScale([1.8, 2.0]);
    expect(scale.lines.map((l) => l.value)).toEqual(
      expect.arrayContaining([0.5, 1, 1.5])
    );
    expect(scale.lines.every((l) => l.label.endsWith("m"))).toBe(true);
    expect(scale.lines.every((l) => l.value < scale.max)).toBe(true);
  });

  it("puts the top of the scale at 0% and the bottom at 100%", () => {
    expect(topPct(30, 30)).toBe(0);
    expect(topPct(0, 30)).toBe(100);
    expect(topPct(15, 30)).toBe(50);
  });
});

describe("scoreBand", () => {
  it("matches the four fills the bars and dials share", () => {
    expect(scoreBand(90)).toBe("epic");
    expect(scoreBand(80)).toBe("great");
    expect(scoreBand(65)).toBe("good");
    expect(scoreBand(40)).toBe("marginal");
    expect(scoreBand(null)).toBeNull();
  });
});
