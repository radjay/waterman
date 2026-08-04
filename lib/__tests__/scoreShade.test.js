import { LEGEND_TIERS, scoreColour, scoreTier, windowGradient } from "../scoreShade";

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

describe("scoreColour", () => {
  it("steps by tier so the legend labels mean something", () => {
    expect(scoreColour(92)).not.toBe(scoreColour(84));
    expect(scoreColour(84)).not.toBe(scoreColour(74));
    expect(scoreColour(74)).not.toBe(scoreColour(64));
  });

  it("separates epic from great by lightness, not opacity", () => {
    // Past ~85% opacity every step looks like the same bright accent.
    expect(scoreColour(92)).toContain("color-mix");
    expect(scoreColour(84)).not.toContain("color-mix");
  });

  it("mixes epic toward ink, so it intensifies in BOTH themes", () => {
    // ink is near-white in Nightglass and near-black in Dayglass.
    expect(scoreColour(92)).toContain("var(--wm-ink)");
  });

  it("uses the accent-2 hue below 60", () => {
    expect(scoreColour(45)).toContain("var(--wm-marginal)");
  });

  it("never hardcodes a colour, or Dayglass inherits the Nightglass cyan", () => {
    for (const s of [95, 84, 74, 64, 30]) {
      expect(scoreColour(s)).not.toMatch(/#[0-9a-f]{3,8}/i);
    }
  });
});

const H = 60 * 60 * 1000;
const win = (scores, start = 0) => ({
  start,
  end: start + scores.length * 3 * H,
  score: Math.max(...scores),
  slots: scores.map((score, i) => ({ timestamp: start + i * 3 * H, score })),
});

describe("windowGradient", () => {
  it("is a left-to-right gradient", () => {
    expect(windowGradient(win([92]))).toMatch(/^linear-gradient\(90deg/);
  });

  it("ramps ACROSS the slots, so a band climbs good -> great -> epic", () => {
    // The whole point: a flat per-window tier hid the shape of the afternoon.
    const g = windowGradient(win([72, 84, 94]));
    expect(g).toContain(scoreColour(72));
    expect(g).toContain(scoreColour(84));
    expect(g).toContain(scoreColour(94));
    expect(g.indexOf(scoreColour(72))).toBeLessThan(g.indexOf(scoreColour(94)));
  });

  it("comes back down again when the window fades", () => {
    const g = windowGradient(win([72, 94, 72]));
    const first = g.indexOf(scoreColour(72));
    const peak = g.indexOf(scoreColour(94));
    const last = g.lastIndexOf(scoreColour(72));
    expect(first).toBeLessThan(peak);
    expect(peak).toBeLessThan(last);
  });

  it("pins the first and last stops so the band does not fade at its own edges", () => {
    const g = windowGradient(win([72, 84, 94]));
    expect(g).toContain("0.0%");
    expect(g).toContain("100.0%");
  });

  it("gives every slot a PLATEAU, so a tier occupies area rather than a point", () => {
    // With one stop per slot centre, an epic hour between two great ones existed
    // only at a single interpolation point. Measured on screen it reached
    // rgb(118,231,240) against a pure accent of rgb(110,231,240) — invisible.
    const g = windowGradient(win([70, 95, 70]));
    const peak = scoreColour(95);

    // color-mix() contains commas, so the gradient cannot be split on ", ".
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pcts = [...g.matchAll(new RegExp(`${escape(peak)}\\s+([\\d.]+)%`, "g"))].map((m) =>
      Number(m[1])
    );

    expect(pcts).toHaveLength(2);
    expect(pcts[1] - pcts[0]).toBeGreaterThan(10);
  });

  it("still produces a valid gradient for a one-slot window", () => {
    const g = windowGradient(win([92]));
    expect(g.split(",").length).toBeGreaterThanOrEqual(2);
  });

  it("accepts a bare score for legend swatches", () => {
    expect(windowGradient(92)).toContain(scoreColour(92));
    expect(windowGradient(0, { marginal: true })).toContain("var(--wm-marginal)");
  });

  it("survives a malformed window rather than throwing", () => {
    expect(() => windowGradient({ start: 0, end: 0, slots: [] })).not.toThrow();
    expect(() => windowGradient(null)).not.toThrow();
  });

  it("paints sub-60 slots inside a window in the accent-2 hue", () => {
    const g = windowGradient(win([80, 45]));
    expect(g).toContain("var(--wm-marginal)");
  });
});

describe("LEGEND_TIERS", () => {
  it("shows only the tiers worth naming, best first", () => {
    expect(LEGEND_TIERS.map((t) => t.label)).toEqual(["EPIC", "GREAT", "GOOD"]);
  });
});
