import { BANDS } from "../agreement";
import { VERDICT, deriveVerdict, pickNowSpot, verdictReason } from "../verdict";

const agreement = (agreed, total = 5, band = BANDS.GOOD) => ({ agreed, total, band });

describe("deriveVerdict", () => {
  it("says GO on a strong score with the models behind it", () => {
    expect(deriveVerdict({ score: 92, agreement: agreement(5) })).toBe(VERDICT.GO);
    expect(deriveVerdict({ score: 75, agreement: agreement(4) })).toBe(VERDICT.GO);
  });

  it("downgrades a strong score to MARGINAL when the models are split", () => {
    // Refusing to promise a GO the evidence does not support is the whole
    // point of surfacing model spread.
    expect(deriveVerdict({ score: 92, agreement: agreement(3, 5, BANDS.SPLIT) })).toBe(
      VERDICT.MARGINAL
    );
  });

  it("still says GO on a strong score when there is no model data at all", () => {
    // No data is not disagreement; it should not veto an otherwise good score.
    expect(deriveVerdict({ score: 92, agreement: null })).toBe(VERDICT.GO);
    expect(
      deriveVerdict({ score: 92, agreement: { agreed: 0, total: 0, band: BANDS.UNKNOWN } })
    ).toBe(VERDICT.GO);
  });

  it("says MARGINAL in the 60-74 band", () => {
    expect(deriveVerdict({ score: 60, agreement: agreement(5) })).toBe(VERDICT.MARGINAL);
    expect(deriveVerdict({ score: 74, agreement: agreement(5) })).toBe(VERDICT.MARGINAL);
  });

  it("lets the station rescue a middling forecast", () => {
    expect(deriveVerdict({ score: 55, agreement: agreement(3), stationDelta: 3 })).toBe(
      VERDICT.MARGINAL
    );
  });

  it("does not let the station rescue a genuinely dead forecast", () => {
    expect(deriveVerdict({ score: 30, agreement: agreement(1), stationDelta: 5 })).toBe(
      VERDICT.NO
    );
  });

  it("says NO on a flat day", () => {
    expect(deriveVerdict({ score: 41, agreement: agreement(0) })).toBe(VERDICT.NO);
    expect(deriveVerdict({ score: null, agreement: null })).toBe(VERDICT.NO);
  });

  it("treats a missing station delta as neutral rather than as zero evidence", () => {
    expect(deriveVerdict({ score: 55, agreement: agreement(3), stationDelta: null })).toBe(
      VERDICT.NO
    );
    expect(deriveVerdict({ score: 55, agreement: agreement(3) })).toBe(VERDICT.NO);
  });
});

describe("verdictReason", () => {
  const tz = "Europe/Lisbon";

  it("names the spot and how long it holds on a GO", () => {
    const reason = verdictReason({
      verdict: VERDICT.GO,
      spotName: "Guincho",
      holdsUntil: Date.UTC(2026, 7, 4, 14, 0),
      timeZone: tz,
    });
    expect(reason).toContain("GUINCHO");
    expect(reason).toContain("HOLDING UNTIL");
  });

  it("explains a MARGINAL caused by model spread", () => {
    const reason = verdictReason({
      verdict: VERDICT.MARGINAL,
      spotName: "Guincho",
      agreement: { agreed: 3, total: 5, band: BANDS.SPLIT },
      timeZone: tz,
    });
    expect(reason).toContain("MODELS SPLIT");
    expect(reason).toContain("3 OF 5");
  });

  it("explains a MARGINAL caused by the station over-reading", () => {
    const reason = verdictReason({
      verdict: VERDICT.MARGINAL,
      spotName: "Guincho",
      stationDelta: 3,
      timeZone: tz,
    });
    expect(reason).toContain("STATION RUNNING 3 KN OVER");
  });

  it("pivots a NO toward the next window", () => {
    const reason = verdictReason({
      verdict: VERDICT.NO,
      spotName: "Guincho",
      nextWindowStart: Date.UTC(2026, 7, 6, 11, 0),
      timeZone: tz,
    });
    expect(reason).toContain("NEXT WINDOW");
    expect(reason).toContain("THURSDAY");
  });

  it("says so plainly when there is nothing at all", () => {
    expect(verdictReason({ verdict: VERDICT.NO, spotName: "Guincho", timeZone: tz })).toBe(
      "NOTHING ON THIS WEEK"
    );
  });

  it("renders times in the spot's timezone, not the viewer's", () => {
    // 14:00 UTC is 15:00 in Lisbon during summer time.
    const reason = verdictReason({
      verdict: VERDICT.GO,
      spotName: "Guincho",
      holdsUntil: Date.UTC(2026, 7, 4, 14, 0),
      timeZone: tz,
    });
    expect(reason).toContain("15:00");
  });
});

describe("pickNowSpot", () => {
  it("picks the best-scoring candidate", () => {
    const spot = pickNowSpot([
      { spot: { name: "Guincho" }, score: 92 },
      { spot: { name: "Lagoa" }, score: 71 },
    ]);
    expect(spot.spot.name).toBe("Guincho");
  });

  it("returns null when there are no candidates", () => {
    expect(pickNowSpot([])).toBeNull();
    expect(pickNowSpot(undefined)).toBeNull();
  });

  it("still picks something when every score is missing", () => {
    // A spot with no score is better than showing the rider nothing at all.
    const spot = pickNowSpot([{ spot: { name: "A" }, score: null }]);
    expect(spot.spot.name).toBe("A");
  });
});
