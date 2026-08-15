import { BANDS } from "../agreement";
import { VERDICT, deriveVerdict, pickNowSpot, relativeDay, verdictReason } from "../verdict";

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

describe("deriveVerdict — GO LATER", () => {
  const base = { agreement: null, stationDelta: null };

  it("says GO LATER when now is short of the bar but the day gets there", () => {
    // The verdict that changes what a rider does: a 72 with a 90 coming is not
    // the same decision as a 72 that is as good as today gets.
    expect(deriveVerdict({ ...base, score: 72, laterPeak: 90 })).toBe(VERDICT.GO_LATER);
    expect(deriveVerdict({ ...base, score: 30, laterPeak: 88 })).toBe(VERDICT.GO_LATER);
  });

  it("still says GO when now already clears the bar", () => {
    // A better afternoon does not make a good right-now into a wait.
    expect(deriveVerdict({ ...base, score: 80, laterPeak: 95 })).toBe(VERDICT.GO);
  });

  it("does not promise later on a day that never gets strong", () => {
    expect(deriveVerdict({ ...base, score: 65, laterPeak: 70 })).toBe(VERDICT.MARGINAL);
    expect(deriveVerdict({ ...base, score: 30, laterPeak: 55 })).toBe(VERDICT.NO);
  });

  it("never says GO LATER when the rest of the day is not in scope", () => {
    // Omitting laterPeak has to leave the old behaviour exactly as it was.
    expect(deriveVerdict({ ...base, score: 72 })).toBe(VERDICT.MARGINAL);
    expect(deriveVerdict({ ...base, score: 30 })).toBe(VERDICT.NO);
  });
});

describe("verdictReason", () => {
  const tz = "Europe/Lisbon";

  it("says how long it holds on a GO, without repeating the spot", () => {
    // The spot is in the headline now ("GO @ Guincho"); repeating it here said
    // the same thing twice.
    const reason = verdictReason({
      verdict: VERDICT.GO,
      holdsUntil: Date.UTC(2026, 7, 4, 14, 0),
      timeZone: tz,
    });
    expect(reason).toContain("Holding until");
    expect(reason).not.toMatch(/GUINCHO/i);
  });

  it("explains a MARGINAL caused by model spread", () => {
    const reason = verdictReason({
      verdict: VERDICT.MARGINAL,
      agreement: { agreed: 3, total: 5, band: BANDS.SPLIT },
      timeZone: tz,
    });
    expect(reason).toContain("Models split");
    expect(reason).toContain("3 of 5");
  });

  it("explains a MARGINAL caused by the station over-reading", () => {
    const reason = verdictReason({
      verdict: VERDICT.MARGINAL,
      stationDelta: 3,
      timeZone: tz,
    });
    expect(reason).toContain("running 3 kn over forecast");
  });

  it("says right-now is not it, and leaves the alternatives to the list below", () => {
    const reason = verdictReason({
      verdict: VERDICT.NO,
      nextWindowStart: Date.UTC(2026, 7, 6, 11, 0),
      timeZone: tz,
    });
    expect(reason).toBe("Nothing on right now.");
  });

  it("distinguishes a quiet moment from a dead week", () => {
    expect(verdictReason({ verdict: VERDICT.NO, timeZone: tz })).toBe("Nothing on this week.");
  });

  it("renders times in the spot's timezone, not the viewer's", () => {
    // 14:00 UTC is 15:00 in Lisbon during summer time.
    const reason = verdictReason({
      verdict: VERDICT.GO,
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

describe("relativeDay", () => {
  const tz = "Europe/Lisbon";
  const now = Date.UTC(2026, 7, 4, 10, 0); // Tuesday

  it("says today rather than naming the weekday", () => {
    // "Next window Tuesday" on a Tuesday afternoon reads as next week.
    expect(relativeDay(Date.UTC(2026, 7, 4, 16, 0), tz, now)).toBe("today");
  });

  it("says tomorrow for the next day", () => {
    expect(relativeDay(Date.UTC(2026, 7, 5, 9, 0), tz, now)).toBe("tomorrow");
  });

  it("names the weekday further out", () => {
    expect(relativeDay(Date.UTC(2026, 7, 6, 9, 0), tz, now)).toBe("Thursday");
  });

  it("compares calendar days in the spot's timezone, not UTC", () => {
    // 23:30 UTC on the 4th is 00:30 on the 5th in Lisbon — tomorrow, not today.
    expect(relativeDay(Date.UTC(2026, 7, 4, 23, 30), tz, now)).toBe("tomorrow");
  });
});
