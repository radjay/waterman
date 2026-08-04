import {
  BANDS,
  SPORT_DEFAULT_THRESHOLDS,
  WIND_MODELS,
  agreementFor,
  agreementSentence,
  groupByTimestamp,
  modelLabel,
  modelVote,
  thresholdFor,
} from "../agreement";

const slot = (speed, gust = speed + 4, direction = 330) => ({ speed, gust, direction });

const WING = { minSpeed: 15, minGust: 18, directionFrom: 315, directionTo: 45 };

describe("thresholdFor", () => {
  it("uses the spot config when it has real numbers", () => {
    const t = thresholdFor(WING, "wingfoil");
    expect(t.minSpeed).toBe(15);
    expect(t.isDefault).toBe(false);
  });

  it("falls back to the sport default when the pair has no config", () => {
    // spotConfigs coverage is known to be incomplete.
    const t = thresholdFor(null, "wingfoil");
    expect(t).toEqual({ ...SPORT_DEFAULT_THRESHOLDS.wingfoil, isDefault: true });
  });

  it("treats an all-zero config as missing rather than as 'anything goes'", () => {
    const t = thresholdFor({ minSpeed: 0, minGust: 0 }, "wingfoil");
    expect(t.isDefault).toBe(true);
    expect(t.minSpeed).toBe(15);
  });

  it("has no default for surfing, because swell suitability is spot-specific", () => {
    expect(thresholdFor(null, "surfing")).toBeNull();
  });
});

describe("modelVote", () => {
  it("passes a slot that clears speed, gust and direction", () => {
    expect(modelVote(slot(20, 25, 330), WING)).toBe(true);
  });

  it("fails on speed, gust or direction independently", () => {
    expect(modelVote(slot(10, 25, 330), WING)).toBe(false);
    expect(modelVote(slot(20, 12, 330), WING)).toBe(false);
    expect(modelVote(slot(20, 25, 180), WING)).toBe(false);
  });

  it("handles the wrap-around direction range", () => {
    // 315 -> 45 crosses north.
    expect(modelVote(slot(20, 25, 10), WING)).toBe(true);
    expect(modelVote(slot(20, 25, 350), WING)).toBe(true);
    expect(modelVote(slot(20, 25, 200), WING)).toBe(false);
  });

  it("returns null rather than voting when there is no usable threshold", () => {
    // Regression guard: `config.minSpeed || 0` would pass every slot and turn
    // the agreement bars into a permanent, meaningless "5 of 5".
    expect(modelVote(slot(1, 1, 0), { minSpeed: 0, minGust: 0 })).toBeNull();
    expect(modelVote(slot(20), null)).toBeNull();
    expect(modelVote(null, WING)).toBeNull();
  });

  it("treats missing wind fields as calm, not as passing", () => {
    expect(modelVote({ direction: 330 }, WING)).toBe(false);
  });
});

const modelSlots = (speeds) =>
  WIND_MODELS.map((model, i) => ({ model, slot: slot(speeds[i], speeds[i] + 5, 330) }));

describe("agreementFor", () => {
  it("calls it good when 4 of 5 agree", () => {
    const a = agreementFor(modelSlots([20, 20, 20, 20, 10]), WING);
    expect(a.agreed).toBe(4);
    expect(a.total).toBe(5);
    expect(a.band).toBe(BANDS.GOOD);
  });

  it("calls it good when all 5 agree", () => {
    expect(agreementFor(modelSlots([20, 20, 20, 20, 20]), WING).band).toBe(BANDS.GOOD);
  });

  it("calls it split at 2 and 3 of 5", () => {
    expect(agreementFor(modelSlots([20, 20, 10, 10, 10]), WING).band).toBe(BANDS.SPLIT);
    expect(agreementFor(modelSlots([20, 20, 20, 10, 10]), WING).band).toBe(BANDS.SPLIT);
  });

  it("calls it no at 0 and 1 of 5", () => {
    expect(agreementFor(modelSlots([10, 10, 10, 10, 10]), WING).band).toBe(BANDS.NO);
    expect(agreementFor(modelSlots([20, 10, 10, 10, 10]), WING).band).toBe(BANDS.NO);
  });

  it("reports UNKNOWN, never SPLIT, when there is no model data", () => {
    // Absence of evidence and evidence of disagreement are different answers.
    // The week strip gives split its own dashed band, so collapsing a lookup
    // miss into it would manufacture disagreement no model expressed.
    const a = agreementFor([], WING);
    expect(a.band).toBe(BANDS.UNKNOWN);
    expect(a.band).not.toBe(BANDS.SPLIT);
    expect(a.total).toBe(0);
  });

  it("reports UNKNOWN when no model has a usable threshold", () => {
    expect(agreementFor(modelSlots([20, 20, 20, 20, 20]), null).band).toBe(BANDS.UNKNOWN);
  });

  it("names the single dissenter when one model disagrees", () => {
    const a = agreementFor(modelSlots([20, 20, 20, 20, 10]), WING);
    expect(a.outlier).toBe("lew");
  });

  it("names the lone believer when only one model calls it on", () => {
    const a = agreementFor(modelSlots([20, 10, 10, 10, 10]), WING);
    expect(a.outlier).toBe("ecmwf");
  });

  it("names no outlier when the split is genuine", () => {
    expect(agreementFor(modelSlots([20, 20, 20, 10, 10]), WING).outlier).toBeNull();
  });

  it("scales the good threshold to however many models actually returned", () => {
    // 3 of 3 is good; 2 of 3 is not (ceil(0.8*3) = 3).
    const three = (speeds) =>
      speeds.map((s, i) => ({ model: WIND_MODELS[i], slot: slot(s, s + 5, 330) }));
    expect(agreementFor(three([20, 20, 20]), WING).band).toBe(BANDS.GOOD);
    expect(agreementFor(three([20, 20, 10]), WING).band).toBe(BANDS.SPLIT);
  });
});

describe("agreementSentence", () => {
  it("says nothing when there is no data", () => {
    expect(agreementSentence(agreementFor([], WING))).toBeNull();
  });

  it("names the outlier when one model disagrees", () => {
    const s = agreementSentence(agreementFor(modelSlots([20, 20, 20, 20, 10]), WING));
    expect(s).toContain("LEW");
  });

  it("reports full agreement plainly", () => {
    expect(agreementSentence(agreementFor(modelSlots([20, 20, 20, 20, 20]), WING))).toContain(
      "All 5"
    );
  });

  it("says split rather than picking a side", () => {
    expect(agreementSentence(agreementFor(modelSlots([20, 20, 20, 10, 10]), WING))).toContain(
      "split"
    );
  });
});

describe("modelLabel", () => {
  it("uses the real model names, not the mockup's AROME/HARMONIE", () => {
    expect(modelLabel("gfs27_long")).toBe("GFS");
    expect(modelLabel("iconeuro")).toBe("ICON-EU");
    expect(modelLabel("ecmwf")).toBe("ECMWF");
    expect(modelLabel("lew")).toBe("LEW");
  });

  it("does not claim to know AROME or HARMONIE", () => {
    // They are in the mockups but not in our data — arome silently returns GFS.
    expect(WIND_MODELS).not.toContain("arome");
    expect(WIND_MODELS).not.toContain("harmonie");
  });
});

describe("groupByTimestamp", () => {
  it("groups model rows by slot time", () => {
    const rows = [
      { model: "ecmwf", timestamp: 100, speed: 20 },
      { model: "lew", timestamp: 100, speed: 18 },
      { model: "ecmwf", timestamp: 200, speed: 12 },
    ];
    const map = groupByTimestamp(rows);
    expect(map.get(100)).toHaveLength(2);
    expect(map.get(200)).toHaveLength(1);
  });

  it("survives an empty or missing input", () => {
    expect(groupByTimestamp([]).size).toBe(0);
    expect(groupByTimestamp(undefined).size).toBe(0);
  });
});

describe("surfing never votes on wind", () => {
  it("returns no threshold for surfing even when the config carries wind fields", () => {
    // Some surf spots also store minSpeed/minGust. Without this guard they
    // would be voted on wind criteria and the result reported as surf
    // agreement — a wind answer wearing a surf label.
    const surfConfigWithWind = {
      minSpeed: 15,
      minGust: 18,
      minSwellHeight: 1,
      minPeriod: 10,
    };
    expect(thresholdFor(surfConfigWithWind, "surfing")).toBeNull();
  });

  it("still returns a threshold for the wind sports", () => {
    expect(thresholdFor(WING, "wingfoil")).not.toBeNull();
    expect(thresholdFor(WING, "kitesurfing")).not.toBeNull();
  });

  it("yields UNKNOWN agreement for surfing, never a wind-derived band", () => {
    const a = agreementFor(modelSlots([20, 20, 20, 20, 20]), thresholdFor(WING, "surfing"));
    expect(a.band).toBe(BANDS.UNKNOWN);
    expect(a.agreed).toBe(0);
  });
});
