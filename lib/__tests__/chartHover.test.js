import { describe, expect, it } from "vitest";
import {
  clockLabel,
  columnHoverText,
  resolveChartHover,
  slotHourLabel,
  stationHoverText,
  stationInSlot,
} from "../../components/chart/chartHover";
import { buildDayChart, dayStartOf } from "../dayChart";

const HOUR = 60 * 60 * 1000;
const T0 = Date.UTC(2026, 7, 15, 9, 0, 0); // 10:00 Lisbon (WEST)

describe("slotHourLabel", () => {
  it("uses am/pm without a leading zero", () => {
    expect(slotHourLabel(7)).toBe("7am");
    expect(slotHourLabel(10)).toBe("10am");
    expect(slotHourLabel(12)).toBe("12pm");
    expect(slotHourLabel(16)).toBe("4pm");
    expect(slotHourLabel(0)).toBe("12am");
  });
});

describe("stationInSlot", () => {
  it("returns the latest reading inside the slot and at or before now", () => {
    const history = [
      { time: T0 + 10 * 60 * 1000, speed: 5, gust: 8 },
      { time: T0 + 40 * 60 * 1000, speed: 6, gust: 9 },
      { time: T0 + 2 * HOUR, speed: 20, gust: 25 },
    ];
    const found = stationInSlot(history, T0, T0 + 50 * 60 * 1000);
    expect(found.speed).toBe(6);
    expect(found.gust).toBe(9);
  });

  it("returns null for a future slot with no readings yet", () => {
    expect(stationInSlot([{ time: T0, speed: 6 }], T0 + HOUR, T0)).toBeNull();
  });
});

describe("columnHoverText", () => {
  const column = {
    hour: 10,
    slot: { timestamp: T0, speed: 12, gust: 16 },
  };

  it("formats forecast and station when both exist", () => {
    const station = {
      history: [{ time: T0 + 15 * 60 * 1000, speed: 6, gust: 9 }],
    };
    expect(columnHoverText(column, station, T0 + HOUR)).toBe(
      "10am forecast: 12kt (16*)  station: 6kt (9*)"
    );
  });

  it("omits the station half when there is no reading", () => {
    expect(columnHoverText(column, null, T0 + HOUR)).toBe("10am forecast: 12kt (16*)");
    expect(columnHoverText(column, { history: [] }, T0 + HOUR)).toBe(
      "10am forecast: 12kt (16*)"
    );
  });
});

describe("stationHoverText", () => {
  it("leads with the sample clock, not the slot hour", () => {
    // 15:42 Lisbon in WEST (UTC+1) on 2026-08-15.
    const at1542 = Date.UTC(2026, 7, 15, 14, 42, 0);
    expect(
      stationHoverText({
        time: at1542,
        speed: 6,
        gust: 9,
        forecast: 12,
        forecastGust: 16,
      })
    ).toBe("15:42 station: 6kt (9*)  forecast: 12kt (16*)");
  });

  it("omits forecast when none is attached", () => {
    const at1542 = Date.UTC(2026, 7, 15, 14, 42, 0);
    expect(stationHoverText({ time: at1542, speed: 6, gust: 9 })).toBe(
      "15:42 station: 6kt (9*)"
    );
  });
});

describe("clockLabel", () => {
  it("formats Lisbon wall time as HH:mm", () => {
    expect(clockLabel(Date.UTC(2026, 7, 15, 14, 42, 0))).toBe("15:42");
  });
});

describe("resolveChartHover", () => {
  const DAY = dayStartOf(Date.UTC(2026, 7, 15, 12, 0, 0));
  const slots = [7, 10, 13, 16, 19, 22].map((h) => ({
    timestamp: DAY + h * HOUR,
    speed: 12,
    gust: 16,
    score: 70,
  }));
  // ~15:42 local (WEST): inside the 13:00 column, not on a slot boundary.
  const at1542 = DAY + 15 * HOUR + 42 * 60 * 1000;
  const nowMs = at1542 + 5 * 60 * 1000;
  const chart = buildDayChart({ slots, dayStart: DAY, nowMs });
  const station = {
    history: [{ time: at1542, speed: 6, gust: 9, forecast: 12, forecastGust: 16 }],
  };

  it("prefers a nearby station sample over the 3h column", () => {
    // Midpoint of the 13:00 column (~14:30 on equal sixths) is far from 15:42;
    // hover near the sample's x instead.
    const samplePct =
      ((at1542 - slots[0].timestamp) / (slots[5].timestamp - slots[0].timestamp)) * 100;
    const hit = resolveChartHover({ chart, station, xPct: samplePct, nowMs });
    expect(hit.kind).toBe("station");
    expect(hit.text).toMatch(/^15:42 station: 6kt \(9\*\)/);
    expect(hit.text).not.toMatch(/1pm/);
  });

  it("falls back to the forecast column away from station points", () => {
    // Left half of the 10:00 column — no station sample there.
    const col = chart.columns[1];
    const xPct = col.left + col.width * 0.25;
    const hit = resolveChartHover({ chart, station, xPct, nowMs });
    expect(hit.kind).toBe("column");
    expect(hit.text).toMatch(/^10am forecast:/);
  });
});
