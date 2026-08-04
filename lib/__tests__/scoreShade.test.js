import { LEGEND_TIERS, scoreTier, windowGradient } from "../scoreShade";

describe("scoreTier", () => {
  it("names the tiers at their boundaries", () => {
    expect(scoreTier(90).id).toBe("epic");
    expect(scoreTier(95).id).toBe("epic");
    expect(scoreTier(89).id).toBe("great");
    expect(scoreTier(80).id).toBe("great");
    expect(scoreTier(79).id).toBe("good");
    expect(scoreTier(70).id).toBe("good");
    expect(scoreTier(69).id).toBe("fair");
    expect(scoreTier(60).id).toBe("fair");
    expect(scoreTier(59).id).toBe("marginal");
  });

  it("returns null for a missing score rather than guessing a tier", () => {
    expect(scoreTier(null)).toBeNull();
    expect(scoreTier(undefined)).toBeNull();
  });
});

describe("windowGradient", () => {
  it("is a left-to-right gradient, so a band reads as a slope", () => {
    expect(windowGradient(92)).toMatch(/^linear-gradient\(90deg/);
  });

  it("intensifies with the tier", () => {
    // Compare the opening alpha of each ramp.
    const alpha = (s) => Number(windowGradient(s).match(/\/ ([\d.]+)\)/)[1]);
    expect(alpha(92)).toBeGreaterThan(alpha(84));
    expect(alpha(84)).toBeGreaterThan(alpha(74));
    expect(alpha(74)).toBeGreaterThan(alpha(64));
  });

  it("uses the accent channel triple, so both themes shade from their own accent", () => {
    // A hardcoded colour here would give Dayglass the Nightglass cyan.
    expect(windowGradient(92)).toContain("var(--wm-accent)");
    expect(windowGradient(92)).not.toMatch(/#[0-9a-f]{6}/i);
  });

  it("uses the accent-2 hue for marginal, not a dimmer accent", () => {
    const g = windowGradient(0, { marginal: true });
    expect(g).toContain("var(--wm-marginal)");
    expect(g).not.toContain("var(--wm-accent)");
  });

  it("treats a sub-60 score as marginal even without the flag", () => {
    expect(windowGradient(45)).toContain("var(--wm-marginal)");
  });

  it("falls back to marginal rather than throwing on a missing score", () => {
    expect(() => windowGradient(null)).not.toThrow();
    expect(windowGradient(null)).toContain("var(--wm-marginal)");
  });
});

describe("LEGEND_TIERS", () => {
  it("shows only the tiers worth naming, best first", () => {
    expect(LEGEND_TIERS.map((t) => t.label)).toEqual(["EPIC", "GREAT", "GOOD"]);
  });
});
