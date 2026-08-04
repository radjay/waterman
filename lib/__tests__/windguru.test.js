import { describe, it, expect } from "vitest";
import { parseCurrentReading } from "../windguru";

const OBSERVED_UNIXTIME = 1785861742;
const NOW = OBSERVED_UNIXTIME * 1000 + 60_000;

const LIVE = {
  wind_avg: 4,
  wind_max: 4.5,
  wind_min: null,
  wind_direction: 49,
  temperature: 24.77778,
  mslp: 1020.69855,
  rh: 75,
  datetime: "2026-08-04 17:42:22 WEST",
  unixtime: OBSERVED_UNIXTIME,
};

// A live station reporting calm omits the wind fields entirely.
const CALM = {
  wind_direction: 12,
  temperature: 22,
  datetime: "2026-08-04 17:42:22 WEST",
  unixtime: OBSERVED_UNIXTIME,
};

// Station 15435, dead. No unixtime, no wind fields, no temperature.
const DEAD = { datetime: "2026-08-04 17:43:00 WEST" };

describe("parseCurrentReading", () => {
  it("extracts a live reading", () => {
    expect(parseCurrentReading(LIVE, { nowMs: NOW })).toEqual({
      time: OBSERVED_UNIXTIME * 1000,
      speed: 4,
      gust: 4.5,
      direction: 49,
      tempC: 24.8,
    });
  });

  // The whole point of the guard: a dead station must yield nothing, not a
  // fresh-timestamped zero. Dedupe cannot catch a zero whose time is new
  // on every poll.
  it("returns null for a dead station that omits unixtime", () => {
    expect(parseCurrentReading(DEAD, { nowMs: NOW })).toBeNull();
  });

  it("returns a real zero for a live station reporting calm", () => {
    const reading = parseCurrentReading(CALM, { nowMs: NOW });
    expect(reading).not.toBeNull();
    expect(reading.speed).toBe(0);
    expect(reading.time).toBe(OBSERVED_UNIXTIME * 1000);
  });

  it("rejects a reading more than 24 hours old", () => {
    expect(parseCurrentReading(LIVE, { nowMs: NOW + 25 * 60 * 60 * 1000 })).toBeNull();
  });

  it("rejects a reading from the future", () => {
    expect(parseCurrentReading(LIVE, { nowMs: NOW - 10 * 60 * 1000 })).toBeNull();
  });

  it("returns null for junk", () => {
    expect(parseCurrentReading(null, { nowMs: NOW })).toBeNull();
    expect(parseCurrentReading({}, { nowMs: NOW })).toBeNull();
    expect(parseCurrentReading({ unixtime: 0 }, { nowMs: NOW })).toBeNull();
  });
});
