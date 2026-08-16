import { describe, expect, it } from "vitest";
import { slotVerdictText } from "../ScoreBand";

describe("slotVerdictText", () => {
  it("prefers the scorer's reasoning", () => {
    expect(
      slotVerdictText({ score: 88, reasoning: "  Peak window — steady NNW.  " })
    ).toBe("Peak window — steady NNW.");
  });

  it("falls back when reasoning is missing", () => {
    expect(slotVerdictText({ score: 64 })).toBe(
      "Score 64. No AI verdict for this timeslot."
    );
  });

  it("handles a slot with neither score nor reasoning", () => {
    expect(slotVerdictText({})).toBe("No verdict for this timeslot.");
  });
});
