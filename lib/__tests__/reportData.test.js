import { configForSpot, slotsForSpot, spotsWithSlots } from "../reportData";

/**
 * Regression tests for the getReportData response shape.
 *
 * The screens originally read `report.slotsBySpot` and a top-level
 * `report.scoresMap` — names that do not exist. Every lookup returned
 * undefined, so all three new screens rendered "nothing on" against a database
 * holding 405 real slots. That is indistinguishable from a genuinely flat day,
 * which is the exact RAD-59 failure mode these screens exist to avoid, and it
 * only surfaced when running against the real deployment.
 *
 * The fixture below mirrors the real response, so a future shape change breaks
 * a test rather than silently emptying the app.
 */
const report = {
  mostRecentScrapeTimestamp: 1785823264143,
  spots: [
    { _id: "spotA", name: "Praia do Guincho" },
    { _id: "spotB", name: "Marina de Cascais" },
  ],
  data: {
    spotA: {
      slots: [
        { timestamp: 3000, speed: 20, gust: 25, direction: 330 },
        { timestamp: 1000, speed: 12, gust: 15, direction: 320 },
      ],
      // Per spot, NOT global. This is the part that was got wrong.
      scoresMap: {
        "1000_wingfoil": { score: 44 },
        "3000_wingfoil": { score: 88 },
        "3000_surfing": { score: 20 },
      },
      configs: { wingfoil: { minSpeed: 15, minGust: 18 } },
      tides: [],
    },
    spotB: {
      slots: [{ timestamp: 1000, speed: 5, gust: 7, direction: 200 }],
      scoresMap: {},
      configs: {},
      tides: [],
    },
  },
};

describe("slotsForSpot", () => {
  it("reads slots from data[spotId], not a top-level key", () => {
    expect(slotsForSpot(report, "spotA", "wingfoil")).toHaveLength(2);
  });

  it("attaches the score from the SPOT's own scoresMap", () => {
    const slots = slotsForSpot(report, "spotA", "wingfoil");
    expect(slots.find((s) => s.timestamp === 3000).score).toBe(88);
    expect(slots.find((s) => s.timestamp === 1000).score).toBe(44);
  });

  it("keys scores by sport, so switching sport changes the score", () => {
    const surf = slotsForSpot(report, "spotA", "surfing");
    expect(surf.find((s) => s.timestamp === 3000).score).toBe(20);
  });

  it("sorts ascending by timestamp regardless of input order", () => {
    const slots = slotsForSpot(report, "spotA", "wingfoil");
    expect(slots.map((s) => s.timestamp)).toEqual([1000, 3000]);
  });

  it("uses null for an unscored slot rather than 0", () => {
    // 0 would read as a real score of zero and paint a dial.
    const slots = slotsForSpot(report, "spotB", "wingfoil");
    expect(slots[0].score).toBeNull();
  });

  it("returns [] for an unknown spot or a malformed response", () => {
    expect(slotsForSpot(report, "nope", "wingfoil")).toEqual([]);
    expect(slotsForSpot({}, "spotA", "wingfoil")).toEqual([]);
    expect(slotsForSpot(undefined, "spotA", "wingfoil")).toEqual([]);
  });
});

describe("configForSpot", () => {
  it("reads the sport's config from data[spotId].configs", () => {
    expect(configForSpot(report, "spotA", "wingfoil").minSpeed).toBe(15);
  });

  it("returns null when the pair has no config", () => {
    // Coverage is known to be incomplete; callers fall back to a sport default.
    expect(configForSpot(report, "spotB", "wingfoil")).toBeNull();
    expect(configForSpot(report, "spotA", "surfing")).toBeNull();
  });
});

describe("spotsWithSlots", () => {
  it("pairs every spot with its slots and config", () => {
    const rows = spotsWithSlots(report, "wingfoil");
    expect(rows).toHaveLength(2);
    expect(rows[0].spot.name).toBe("Praia do Guincho");
    expect(rows[0].slots).toHaveLength(2);
    expect(rows[0].config.minSpeed).toBe(15);
  });

  it("finds real scores — the bug was that every lookup came back empty", () => {
    const rows = spotsWithSlots(report, "wingfoil");
    const scored = rows.flatMap((r) => r.slots).filter((s) => s.score !== null);
    expect(scored.length).toBeGreaterThan(0);
  });

  it("survives a response with no spots", () => {
    expect(spotsWithSlots({ spots: [], data: {} }, "wingfoil")).toEqual([]);
    expect(spotsWithSlots(undefined, "wingfoil")).toEqual([]);
  });
});
