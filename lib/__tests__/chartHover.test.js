import { describe, expect, it } from "vitest";
import { columnHoverText, slotHourLabel, stationInSlot } from "../../components/chart/chartHover";

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
