import { describe, expect, it } from "vitest";
import {
  clockLabel,
  columnHoverCard,
  columnHoverText,
  hoverCardText,
  resolveChartHover,
  slotHourLabel,
  stationHoverCard,
  stationHoverText,
  stationInSlot,
  windHoverRows,
} from "../../components/chart/chartHover";
import { buildDayChart, timePctOnChart } from "../dayChart";

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

describe("windHoverRows", () => {
  it("folds gusts into Live / Forecast lines as (N*)", () => {
    const rows = windHoverRows({
      stationSpeed: 1,
      stationGust: 3,
      forecastSpeed: 3,
      forecastGust: 6,
    });
    expect(rows.map((r) => r.text)).toEqual([
      "Live 1kt (3*)",
      "Forecast 3kt (6*)",
    ]);
    expect(rows.map((r) => r.tone)).toEqual(["accent", "muted"]);
  });

  it("omits the gust parenthetical when gust is missing", () => {
    expect(
      windHoverRows({ stationSpeed: 1, forecastSpeed: 3 }).map((r) => r.text)
    ).toEqual(["Live 1kt", "Forecast 3kt"]);
  });

  it("omits Live entirely when there is no station reading", () => {
    expect(
      windHoverRows({ forecastSpeed: 3, forecastGust: 6 }).map((r) => r.text)
    ).toEqual(["Forecast 3kt (6*)"]);
  });
});

describe("columnHoverCard", () => {
  const column = {
    hour: 10,
    slot: { timestamp: T0, speed: 12, gust: 16 },
  };

  it("stacks Live and Forecast when both exist", () => {
    const station = {
      history: [{ time: T0 + 15 * 60 * 1000, speed: 6, gust: 9 }],
    };
    const card = columnHoverCard(column, station, T0 + HOUR);
    expect(card.time).toBe("10am");
    expect(card.rows.map((r) => r.text)).toEqual([
      "Live 6kt (9*)",
      "Forecast 12kt (16*)",
    ]);
    expect(hoverCardText(card)).toBe(
      "10am · Live 6kt (9*) · Forecast 12kt (16*)"
    );
  });

  it("omits the Live line when there is no reading", () => {
    const card = columnHoverCard(column, null, T0 + HOUR);
    expect(card.time).toBe("10am");
    expect(card.rows.map((r) => r.text)).toEqual(["Forecast 12kt (16*)"]);
    expect(columnHoverText(column, null, T0 + HOUR)).toBe(
      "10am · Forecast 12kt (16*)"
    );
  });
});

describe("stationHoverCard", () => {
  it("leads with the sample clock, not the slot hour", () => {
    // 15:42 Lisbon in WEST (UTC+1) on 2026-08-15.
    const at1542 = Date.UTC(2026, 7, 15, 14, 42, 0);
    const card = stationHoverCard({
      time: at1542,
      speed: 6,
      gust: 9,
      forecast: 12,
      forecastGust: 16,
    });
    expect(card.time).toBe("15:42");
    expect(card.rows[0].text).toBe("Live 6kt (9*)");
    expect(stationHoverText({
      time: at1542,
      speed: 6,
      gust: 9,
      forecast: 12,
      forecastGust: 16,
    })).toBe("15:42 · Live 6kt (9*) · Forecast 12kt (16*)");
  });

  it("omits Forecast when none is attached", () => {
    const at1542 = Date.UTC(2026, 7, 15, 14, 42, 0);
    const card = stationHoverCard({ time: at1542, speed: 6, gust: 9 });
    expect(card.rows.map((r) => r.text)).toEqual(["Live 6kt (9*)"]);
  });
});

describe("clockLabel", () => {
  it("formats Lisbon wall time as HH:mm", () => {
    expect(clockLabel(Date.UTC(2026, 7, 15, 14, 42, 0))).toBe("15:42");
  });
});

describe("resolveChartHover", () => {
  // Explicit Lisbon WEST (UTC+1) instants — avoid dayStartOf(), which parses
  // "local midnight" in the host TZ and breaks under UTC CI.
  const DAY = Date.UTC(2026, 7, 14, 23, 0, 0); // 2026-08-15 00:00 Lisbon
  const slots = [7, 10, 13, 16, 19, 22].map((h) => ({
    timestamp: DAY + h * HOUR,
    speed: 12,
    gust: 16,
    score: 70,
  }));
  // 15:42 Lisbon — inside the 13:00 column's 3h window, not on a slot boundary.
  const at1542 = Date.UTC(2026, 7, 15, 14, 42, 0);
  const nowMs = at1542 + 5 * 60 * 1000;
  const chart = buildDayChart({ slots, dayStart: DAY, nowMs });
  const station = {
    history: [{ time: at1542, speed: 6, gust: 9, forecast: 12, forecastGust: 16 }],
  };

  it("prefers a nearby station sample over the 3h column", () => {
    // Midpoint of the 13:00 column (~14:30 on equal sixths) is far from 15:42;
    // hover near the sample's x instead.
    const samplePct = timePctOnChart(chart, at1542);
    const hit = resolveChartHover({ chart, station, xPct: samplePct, nowMs });
    expect(hit.kind).toBe("station");
    expect(hit.card.time).toBe("15:42");
    expect(hit.card.rows[0].text).toBe("Live 6kt (9*)");
    expect(hit.text).toMatch(/^15:42/);
    expect(hit.text).not.toMatch(/1pm/);
    expect(hit.marks.station).toEqual({ xPct: samplePct, speed: 6, gust: 9 });
    expect(hit.marks.column).toBeUndefined();
  });

  it("falls back to the forecast column away from station points", () => {
    // Left half of the 10:00 column — no station sample there.
    const col = chart.columns[1];
    const xPct = col.left + col.width * 0.25;
    const hit = resolveChartHover({ chart, station, xPct, nowMs });
    expect(hit.kind).toBe("column");
    expect(hit.card.time).toBe("10am");
    expect(hit.card.rows.some((r) => r.text.startsWith("Forecast"))).toBe(true);
    expect(hit.marks.column).toEqual({
      left: col.left,
      width: col.width,
      speed: 12,
      gust: 16,
    });
    expect(hit.marks.station).toBeUndefined();
  });

  it("marks the in-slot station sample on a column hit that shows it in the tip", () => {
    const col = chart.columns[2]; // 13:00 — covers 15:42
    const xPct = col.left + col.width * 0.15;
    const hit = resolveChartHover({ chart, station, xPct, nowMs });
    expect(hit.kind).toBe("column");
    expect(hit.card.rows.some((r) => r.text === "Live 6kt (9*)")).toBe(true);
    expect(hit.marks.column.speed).toBe(12);
    expect(hit.marks.station.speed).toBe(6);
    expect(hit.marks.station.gust).toBe(9);
    expect(hit.marks.station.xPct).toBeCloseTo(timePctOnChart(chart, at1542), 5);
  });
});
