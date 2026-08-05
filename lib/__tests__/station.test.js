import { describe, it, expect } from "vitest";
import { buildStationCard } from "../station";

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
    expect(card.directionLabel).toBe("NW");
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
    expect(card.caption).toBe("AT THE SPOT");
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

  it("buckets the trailing 90 minutes oldest first and drops older readings", () => {
    const card = buildStationCard({
      readings: [reading(120, 5), reading(80, 10), reading(40, 20), reading(2, 18)],
      forecastSlot: null,
      proximity: AT_SPOT,
      nowMs: NOW,
    });

    expect(card.history.map((p) => p.speed)).toEqual([10, 20, 18]);
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
