import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  dedupeSlotsByTimestamp,
  filterSlotsOverlappingWindow,
} from "../../lib/convex/forecastSlotDedupe.js";

describe("dedupeSlotsByTimestamp", () => {
  it("keeps the slot from the most recent scrape for each timestamp", () => {
    const slots = [
      { timestamp: 1000, scrapeTimestamp: 100, speed: 10 },
      { timestamp: 1000, scrapeTimestamp: 200, speed: 12 },
      { timestamp: 2000, scrapeTimestamp: 150, speed: 8 },
    ];

    const result = dedupeSlotsByTimestamp(slots);
    assert.equal(result.length, 2);
    assert.equal(result[0].speed, 12);
    assert.equal(result[1].speed, 8);
  });
});

describe("filterSlotsOverlappingWindow", () => {
  it("includes slots whose 3h window overlaps the search range", () => {
    const slotDurationMs = 3 * 60 * 60 * 1000;
    const slots = [
      { timestamp: 0 },
      { timestamp: 2 * 60 * 60 * 1000 },
      { timestamp: 6 * 60 * 60 * 1000 },
    ];

    const result = filterSlotsOverlappingWindow(
      slots,
      2 * 60 * 60 * 1000,
      4 * 60 * 60 * 1000,
      slotDurationMs
    );

    assert.deepEqual(
      result.map((slot) => slot.timestamp),
      [0, 2 * 60 * 60 * 1000]
    );
  });
});
