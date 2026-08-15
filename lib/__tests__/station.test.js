import { describe, it, expect } from "vitest";
import { attachForecast, averageWindow, buildStationCard } from "../station";

const NOW = 1785861800000;
const MINUTE = 60 * 1000;

const AT_SPOT = {
  kind: "at-spot",
  station: { name: "Marina de Cascais" },
  distanceKm: 0.1,
  bearingLabel: null,
};

const NEARBY = {
  kind: "nearby",
  station: { name: "Cabo Raso" },
  distanceKm: 2.93,
  bearingLabel: "SSW",
};

const reading = (minutesAgo, speed) => ({
  time: NOW - minutesAgo * MINUTE,
  speed,
  gust: speed + 2,
  direction: 315,
});

describe("buildStationCard", () => {
  it("returns null without readings", () => {
    expect(
      buildStationCard({ readings: [], forecastSlot: null, proximity: AT_SPOT, nowMs: NOW })
    ).toBeNull();
  });

  // Matches LiveWindIndicator.js:68 — hiding beats showing an old number.
  it("returns null when the newest reading is over an hour old", () => {
    expect(
      buildStationCard({
        readings: [reading(61, 18)],
        forecastSlot: null,
        proximity: AT_SPOT,
        nowMs: NOW,
      })
    ).toBeNull();
  });

  it("reports the newest reading", () => {
    const card = buildStationCard({
      readings: [reading(10, 14), reading(2, 18)],
      forecastSlot: null,
      proximity: AT_SPOT,
      nowMs: NOW,
    });

    expect(card.speed).toBe(18);
    expect(card.gust).toBe(20);
    // 315 stored, displayed as 315+180 = SE. Same convention as the forecast
    // (getDisplayWindDirection): the redesign prints the station reading right
    // beside the forecast columns, and rendering the raw bearing here made the
    // two disagree by 180° about the same wind.
    expect(card.directionLabel).toBe("SE");
    expect(card.agoLabel).toBe("2 MIN AGO");
  });

  it("computes the delta against forecast for an at-spot station", () => {
    const card = buildStationCard({
      readings: [reading(2, 18)],
      forecastSlot: { speed: 15 },
      proximity: AT_SPOT,
      nowMs: NOW,
    });

    expect(card.delta).toBe(3);
    // Joined with agoLabel in the card as "N MIN AGO @ THE SPOT".
    expect(card.caption).toBe("THE SPOT");
  });

  // The reason proximity exists: a sensor 2.9 km away on a headland is not
  // measuring this spot's forecast error, and delta feeds deriveVerdict.
  it("suppresses the delta for a nearby station and attributes the reading", () => {
    const card = buildStationCard({
      readings: [reading(2, 18)],
      forecastSlot: { speed: 15 },
      proximity: NEARBY,
      nowMs: NOW,
    });

    expect(card.delta).toBeNull();
    expect(card.caption).toBe("CABO RASO · 2.9 KM SSW");
  });

  it("buckets the trailing 6 hours oldest first and drops older readings", () => {
    const card = buildStationCard({
      // 7h ago is outside the window; 5h / 40m / 2m stay in.
      readings: [reading(7 * 60, 5), reading(5 * 60, 10), reading(40, 20), reading(2, 18)],
      forecastSlot: null,
      proximity: AT_SPOT,
      nowMs: NOW,
    });

    expect(card.history.map((p) => p.speed)).toEqual([10, 20, 18]);
    // Gust is averaged into the same buckets (fixture gust = speed + 2).
    expect(card.history.map((p) => p.gust)).toEqual([12, 22, 20]);
    expect(card.history.every((p) => Number.isFinite(p.time))).toBe(true);
  });

  it("rolling-averages every point over the last three readings", () => {
    const smoothed = averageWindow(
      [
        { time: 1, speed: 10, gust: 12 },
        { time: 2, speed: 20, gust: 22 },
        { time: 3, speed: 18, gust: 20 },
        { time: 4, speed: 12, gust: 14 },
      ],
      3
    );
    // i=0: [10] → 10; i=1: [10,20] → 15; i=2: [10,20,18] → 16; i=3: [20,18,12] → 16.7
    expect(smoothed.map((p) => p.speed)).toEqual([10, 15, 16, 16.7]);
    expect(smoothed.map((p) => p.gust)).toEqual([12, 17, 18, 18.7]);
    expect(smoothed.map((p) => p.time)).toEqual([1, 2, 3, 4]);
  });

  it("attaches the covering forecast slot speed as a step series", () => {
    const SLOT = 3 * 60 * 60 * 1000;
    const t0 = NOW - 4 * 60 * 60 * 1000;
    const history = [
      { time: t0 + 30 * 60 * 1000, speed: 10, gust: 12 },
      { time: t0 + SLOT + 30 * 60 * 1000, speed: 14, gust: 16 },
    ];
    const withFc = attachForecast(history, [
      { timestamp: t0, speed: 11 },
      { timestamp: t0 + SLOT, speed: 15 },
    ]);
    expect(withFc.map((p) => p.forecast)).toEqual([11, 15]);
  });

  it("paints forecast onto history when forecastSlots are provided", () => {
    const t0 = NOW - 2 * 60 * 60 * 1000;
    const card = buildStationCard({
      readings: [reading(2, 18)],
      forecastSlot: { timestamp: t0, speed: 15 },
      forecastSlots: [
        { timestamp: t0 - 3 * 60 * 60 * 1000, speed: 12 },
        { timestamp: t0, speed: 15 },
      ],
      proximity: AT_SPOT,
      nowMs: NOW,
    });
    expect(card.history.some((p) => p.forecast === 15)).toBe(true);
  });

  it("labels an unmapped nearby station without inventing a distance", () => {
    const card = buildStationCard({
      readings: [reading(2, 18)],
      forecastSlot: { speed: 15 },
      proximity: { kind: "nearby", station: null, distanceKm: null, bearingLabel: null },
      nowMs: NOW,
    });

    expect(card.delta).toBeNull();
    expect(card.caption).toBe("NEARBY STATION");
  });
});
