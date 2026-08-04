import { conditionSummary, primaryMetric } from "../conditions";

const slot = (overrides = {}) => ({
  speed: 22,
  gust: 27,
  direction: 150, // displays as NNW (+180)
  waveHeight: 1.42,
  wavePeriod: 11.4,
  waveDirection: 110, // displays as WNW-ish (+180)
  ...overrides,
});

describe("primaryMetric — wind sports", () => {
  it("leads with wind speed for wingfoil and kitesurfing", () => {
    for (const sport of ["wingfoil", "kitesurfing"]) {
      const m = primaryMetric(slot(), sport);
      expect(m.value).toBe(22);
      expect(m.unit).toBe("kn");
    }
  });

  it("shows the gust as the secondary figure", () => {
    expect(primaryMetric(slot(), "wingfoil").secondary).toBe("(27*)");
  });

  it("uses the WIND direction, displayed as where it comes from", () => {
    const m = primaryMetric(slot({ direction: 150 }), "wingfoil");
    expect(m.directionLabel).toBe("NNW");
    expect(m.directionDegrees).toBe(150);
  });

  it("adds no wind tertiary line — wind is already the headline", () => {
    expect(primaryMetric(slot(), "wingfoil").tertiary).toBeNull();
  });
});

describe("primaryMetric — surfing", () => {
  it("leads with SWELL HEIGHT, not wind speed", () => {
    // The bug this guards: a surfer asking "can I go" was shown "22 kn", a
    // number that says nothing about whether there are waves.
    const m = primaryMetric(slot(), "surfing");
    expect(m.value).toBe(1.4);
    expect(m.unit).toBe("m");
    expect(m.value).not.toBe(22);
  });

  it("reads as '0.5 m' then 'E swell @ 5 s', not '0.5 m E'", () => {
    // The compass point directly after the metre looked like a unit.
    const m = primaryMetric(slot(), "surfing");
    expect(m.directionLabel).toBeNull();
    expect(m.secondary).toMatch(/swell @ \d+ s$/);
  });

  it("uses the SWELL direction, not the wind direction", () => {
    const m = primaryMetric(slot({ direction: 150, waveDirection: 300 }), "surfing");
    expect(m.directionDegrees).toBe(300);
    expect(m.directionDegrees).not.toBe(150);
    expect(m.secondary).toContain("E swell");
  });

  it("keeps wind as supporting context, because onshore wind ruins a good swell", () => {
    expect(primaryMetric(slot(), "surfing").tertiary).toMatch(/^wind 22 kn/);
  });

  it("returns nothing when there is no swell data, rather than falling back to wind", () => {
    // Falling back would show a wind number under a swell label.
    expect(primaryMetric(slot({ waveHeight: null }), "surfing")).toBeNull();
    expect(primaryMetric(slot({ waveHeight: 0 }), "surfing")).toBeNull();
    expect(primaryMetric({ speed: 22, direction: 150 }, "surfing")).toBeNull();
  });

  it("still reports wind for a wind sport on the same slot", () => {
    const flat = slot({ waveHeight: 0 });
    expect(primaryMetric(flat, "surfing")).toBeNull();
    expect(primaryMetric(flat, "wingfoil").value).toBe(22);
  });
});

describe("conditionSummary", () => {
  it("summarises wind sports in knots", () => {
    expect(conditionSummary(slot(), "wingfoil")).toBe("22 kn NNW");
  });

  it("summarises surfing in metres and seconds", () => {
    expect(conditionSummary(slot(), "surfing")).toMatch(/^1\.4 m .* swell @ 11 s$/);
  });

  it("omits the gust from the summary, which is for lists", () => {
    expect(conditionSummary(slot(), "wingfoil")).not.toContain("*");
  });

  it("returns null rather than a misleading string when data is missing", () => {
    expect(conditionSummary(null, "wingfoil")).toBeNull();
    expect(conditionSummary(slot({ waveHeight: null }), "surfing")).toBeNull();
  });
});
