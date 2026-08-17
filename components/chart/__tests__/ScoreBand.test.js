import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreBand, slotVerdictText } from "../ScoreBand";

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

describe("ScoreBand slotVerdict layout", () => {
  const chart = {
    columns: [
      { left: 0, width: 50, slot: { timestamp: 1, score: 40, reasoning: "Light." } },
      { left: 50, width: 50, slot: { timestamp: 2, score: 70, reasoning: "Better." } },
    ],
  };

  it("keeps verdict columns absolutely placed on the track", () => {
    const { container } = render(
      <ScoreBand chart={chart} height={40} slotVerdict />
    );
    const columns = container.querySelectorAll("[role='tooltip']");
    expect(columns.length).toBe(2);
    const wrappers = [...container.querySelectorAll(".absolute")].filter((el) =>
      el.className.includes("inset-y-0")
    );
    expect(wrappers.length).toBe(2);
    expect(wrappers.every((el) => !el.className.split(/\s+/).includes("relative"))).toBe(
      true
    );
    expect(screen.getByLabelText(/Score 40:/)).toBeTruthy();
    expect(screen.getByLabelText(/Score 70:/)).toBeTruthy();
  });
});
