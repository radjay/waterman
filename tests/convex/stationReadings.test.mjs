import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dedupeReadingsByTime } from "../../lib/convex/stationReadings.js";

describe("dedupeReadingsByTime", () => {
  it("keeps the first reading for each timestamp", () => {
    const result = dedupeReadingsByTime([
      { time: 2000, speed: 12 },
      { time: 1000, speed: 10 },
      { time: 2000, speed: 99 },
    ]);

    assert.equal(result.length, 2);
    assert.deepEqual(result.map((r) => r.time), [1000, 2000]);
    assert.equal(result[1].speed, 12);
  });

  it("drops readings without a usable time", () => {
    const result = dedupeReadingsByTime([
      { time: 1000, speed: 10 },
      { time: null, speed: 5 },
      { speed: 7 },
    ]);

    assert.deepEqual(result.map((r) => r.time), [1000]);
  });

  it("returns an empty array for empty or missing input", () => {
    assert.deepEqual(dedupeReadingsByTime([]), []);
    assert.deepEqual(dedupeReadingsByTime(undefined), []);
  });
});
