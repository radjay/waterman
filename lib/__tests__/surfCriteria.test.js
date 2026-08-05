import { surfConfidenceLabel, surfCriteria } from "../surfCriteria";

const slot = (overrides = {}) => ({
  waveHeight: 1.5,
  wavePeriod: 12,
  waveDirection: 290,
  ...overrides,
});

const config = (overrides = {}) => ({
  minSwellHeight: 1,
  maxSwellHeight: 2.5,
  minPeriod: 10,
  swellDirectionFrom: 260,
  swellDirectionTo: 320,
  optimalTide: "low",
  ...overrides,
});

describe("surfCriteria", () => {
  it("matches a slot inside every configured range", () => {
    const rows = surfCriteria(slot(), config(), { state: "low" });
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.met === true)).toBe(true);
  });

  it("fails swell that is under or over the configured range", () => {
    const under = surfCriteria(slot({ waveHeight: 0.4 }), config(), null);
    const over = surfCriteria(slot({ waveHeight: 4 }), config(), null);
    expect(under.find((r) => r.label === "SWELL").met).toBe(false);
    expect(over.find((r) => r.label === "SWELL").met).toBe(false);
  });

  it("fails a period below the minimum", () => {
    const rows = surfCriteria(slot({ wavePeriod: 6 }), config(), null);
    expect(rows.find((r) => r.label === "PERIOD").met).toBe(false);
  });

  it("handles a wrap-around swell direction range", () => {
    const cfg = config({ swellDirectionFrom: 340, swellDirectionTo: 20 });
    expect(surfCriteria(slot({ waveDirection: 350 }), cfg, null).find((r) => r.label === "SWELL DIR").met).toBe(true);
    expect(surfCriteria(slot({ waveDirection: 10 }), cfg, null).find((r) => r.label === "SWELL DIR").met).toBe(true);
    expect(surfCriteria(slot({ waveDirection: 180 }), cfg, null).find((r) => r.label === "SWELL DIR").met).toBe(false);
  });

  it("reports an unspecified criterion as null, not as a failure", () => {
    // An unspecified criterion is not an unmet one — it renders track-coloured
    // rather than as a red mark against the spot.
    const rows = surfCriteria(slot(), config({ minPeriod: undefined }), null);
    expect(rows.find((r) => r.label === "PERIOD").met).toBeNull();
  });

  it("accepts either tide when the spot says both", () => {
    const cfg = config({ optimalTide: "both" });
    expect(surfCriteria(slot(), cfg, { state: "high" }).find((r) => r.label === "TIDE").met).toBe(true);
    expect(surfCriteria(slot(), cfg, { state: "low" }).find((r) => r.label === "TIDE").met).toBe(true);
  });

  it("omits rows for data the slot does not carry", () => {
    const rows = surfCriteria({ waveHeight: 1.5 }, config(), null);
    expect(rows.map((r) => r.label)).toEqual(["SWELL"]);
  });

  it("returns nothing without a slot or a config", () => {
    expect(surfCriteria(null, config(), null)).toEqual([]);
    expect(surfCriteria(slot(), null, null)).toEqual([]);
  });
});

describe("surfConfidenceLabel", () => {
  it("says high when everything specified lines up", () => {
    const { label } = surfConfidenceLabel(surfCriteria(slot(), config(), { state: "low" }));
    expect(label).toBe("High confidence");
  });

  it("drops to low when most criteria miss", () => {
    const rows = surfCriteria(
      slot({ waveHeight: 0.3, wavePeriod: 5, waveDirection: 120 }),
      config(),
      { state: "high" }
    );
    expect(surfConfidenceLabel(rows).label).toBe("Low confidence");
  });

  it("never claims model agreement, because surf has none to claim", () => {
    // The five models differ only in wind; wave data is identical across all
    // of them. A surf confidence line citing models would be a fabrication.
    const { reason } = surfConfidenceLabel(surfCriteria(slot(), config(), { state: "low" }));
    expect(reason).not.toMatch(/model/i);
    expect(reason).toMatch(/condition/i);
  });

  it("says unknown rather than guessing when the spot has no criteria set", () => {
    const rows = surfCriteria(slot(), { }, null);
    expect(surfConfidenceLabel(rows).label).toBe("Unknown");
  });

  it("ignores unspecified criteria when computing the ratio", () => {
    // 2 of 2 specified should read as high even though a third is unset.
    const rows = surfCriteria(
      slot(),
      config({ minPeriod: undefined, swellDirectionFrom: undefined, swellDirectionTo: undefined, optimalTide: undefined }),
      null
    );
    expect(surfConfidenceLabel(rows).label).toBe("High confidence");
  });
});
