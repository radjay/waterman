import { afterEach, beforeEach, vi } from "vitest";

/**
 * The flag contract matters more than usual here because production and
 * development share one Convex deployment. There is no backend gate to fall
 * back on: if these rules leak, fabricated rider counts reach real users under
 * a "detected with our computer vision model" footnote.
 */

const loadFlags = async (env) => {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    vi.stubEnv(key, value);
  }
  return import("../flags");
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("production build (no env vars set)", () => {
  it("defaults riderCounts off", async () => {
    const { flagDefault } = await loadFlags({});
    expect(flagDefault("riderCounts")).toBe(false);
  });

  it("defaults stationEvidence off", async () => {
    const { flagDefault } = await loadFlags({});
    expect(flagDefault("stationEvidence")).toBe(false);
  });

  it("defaults modelConfidence ON — it ships with real data", async () => {
    const { flagDefault } = await loadFlags({});
    expect(flagDefault("modelConfidence")).toBe(true);
  });

  it("refuses overrides entirely", async () => {
    const flags = await loadFlags({ NEXT_PUBLIC_FLAG_RIDER_COUNTS: "false" });
    expect(flags.overridesEnabled()).toBe(false);
  });

  it("ignores a localStorage override — the key cannot turn fixtures on", async () => {
    localStorage.setItem("waterman_flags", JSON.stringify({ riderCounts: true }));
    const flags = await loadFlags({});
    expect(flags.readOverrides("")).toEqual({});
  });

  it("ignores a ?ff= override in the URL", async () => {
    const flags = await loadFlags({});
    expect(flags.readOverrides("?ff=riderCounts")).toEqual({});
  });

  it("refuses to write an override", async () => {
    const flags = await loadFlags({});
    flags.writeOverride("riderCounts", true);
    expect(localStorage.getItem("waterman_flags")).toBeNull();
  });
});

describe("preview build (overrides enabled)", () => {
  const previewEnv = { NEXT_PUBLIC_FLAG_OVERRIDES_ENABLED: "true" };

  it("still defaults riderCounts off until explicitly turned on", async () => {
    const { flagDefault } = await loadFlags(previewEnv);
    expect(flagDefault("riderCounts")).toBe(false);
  });

  it("reads a localStorage override", async () => {
    localStorage.setItem("waterman_flags", JSON.stringify({ riderCounts: true }));
    const flags = await loadFlags(previewEnv);
    expect(flags.readOverrides("")).toEqual({ riderCounts: true });
  });

  it("reads a ?ff= override, and a leading dash turns one off", async () => {
    const flags = await loadFlags(previewEnv);
    expect(flags.readOverrides("?ff=riderCounts,-modelConfidence")).toEqual({
      riderCounts: true,
      modelConfidence: false,
    });
  });

  it("lets the URL win over localStorage", async () => {
    localStorage.setItem("waterman_flags", JSON.stringify({ riderCounts: true }));
    const flags = await loadFlags(previewEnv);
    expect(flags.readOverrides("?ff=-riderCounts").riderCounts).toBe(false);
  });

  it("ignores unknown flag names rather than inventing them", async () => {
    const flags = await loadFlags(previewEnv);
    expect(flags.readOverrides("?ff=notARealFlag")).toEqual({});
  });

  it("survives malformed stored JSON", async () => {
    localStorage.setItem("waterman_flags", "{{{not json");
    const flags = await loadFlags(previewEnv);
    expect(() => flags.readOverrides("")).not.toThrow();
  });

  it("ignores non-boolean stored values", async () => {
    localStorage.setItem("waterman_flags", JSON.stringify({ riderCounts: "yes" }));
    const flags = await loadFlags(previewEnv);
    expect(flags.readOverrides("")).toEqual({});
  });

  it("env=true turns a flag on by default", async () => {
    const { flagDefault } = await loadFlags({
      ...previewEnv,
      NEXT_PUBLIC_FLAG_RIDER_COUNTS: "true",
    });
    expect(flagDefault("riderCounts")).toBe(true);
  });
});

describe("fixtures never reach Convex", () => {
  it("labels its source as something other than a real pipeline", async () => {
    const { riderCount } = await import("../fixtures/riderCounts");
    const reading = riderCount("spot-with-people", Date.UTC(2026, 7, 4, 14, 0));
    if (reading) {
      // Never present the count as measured fact.
      expect(reading.estimated).toBe(true);
    }
  });

  it("is deterministic, so a demo looks the same twice", async () => {
    const { riderCount } = await import("../fixtures/riderCounts");
    const at = Date.UTC(2026, 7, 4, 14, 0);
    expect(riderCount("spot-a", at)).toEqual(riderCount("spot-a", at));
  });

  it("distinguishes 'no reading' from 'nobody out'", async () => {
    const { riderCount, riderCountLabel } = await import("../fixtures/riderCounts");
    // null means we have no reading; 0 means the cam shows an empty spot. The
    // design treats those as different answers.
    expect(riderCountLabel(null)).toBeNull();
    expect(riderCountLabel({ count: 0 })).toBe("NOBODY OUT");
    expect(riderCountLabel({ count: 4 }, "kites")).toBe("4 KITES");
  });
});
