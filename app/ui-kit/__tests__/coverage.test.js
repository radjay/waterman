import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * The kit only earns "compose from this" if it is complete.
 *
 * It fell out of sync once already — Badge, ScoreDial's real usage, every Now
 * and Next composite, and the whole Cams surface existed for weeks without the
 * kit knowing. This test makes that a build failure rather than something
 * noticed during a design review.
 *
 * The rule is deliberately weak on HOW a component appears: rendered, listed as
 * legacy, documented as too stateful to render, or named as unreferenced are all
 * fine. What is not fine is a shared component the kit has never heard of.
 */
const ROOT = join(import.meta.dirname, "..", "..", "..");
const KIT = readFileSync(join(ROOT, "app", "ui-kit", "page.js"), "utf8");

/** Directories whose contents are shared vocabulary rather than one screen's internals. */
const SHARED_DIRS = [
  "ui",
  "chart",
  "spot",
  "live",
  "now",
  "next",
  "confidence",
  "wind",
  "sport",
  "webcam",
  "common",
  "data",
];

const componentsIn = (dir) =>
  readdirSync(join(ROOT, "components", dir), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".js"))
    .map((e) => e.name.replace(/\.js$/, ""));

describe("ui-kit coverage", () => {
  for (const dir of SHARED_DIRS) {
    it(`documents every shared component in components/${dir}`, () => {
      const missing = componentsIn(dir).filter((name) => {
        // Hooks and context providers are not components; they are still
        // documented, but by name in prose rather than as an import.
        return !KIT.includes(name);
      });
      expect(missing).toEqual([]);
    });
  }

  it("only names wind models the app actually requests", async () => {
    // modelLabel() falls back to raw uppercase for an unknown key, so an
    // invented one renders as "ICON_EU" — underscore and all — and the kit ends
    // up teaching a model list that does not exist. This shipped once already.
    const { WIND_MODELS } = await import("../../../lib/agreement.js");
    const named = [...KIT.matchAll(/\{\s*model:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((m) => !WIND_MODELS.includes(m))).toEqual([]);
  });

  it("splits into exactly two parts, Current and Legacy", () => {
    expect(KIT).toContain('id="current"');
    expect(KIT).toContain('id="legacy"');
  });

  it("renders at the app's own container width, not a kit-only one", () => {
    // A kit rendered narrower than every real screen hides exactly the wrapping
    // problems it exists to catch.
    expect(KIT).toContain("max-w-[1200px]");
    expect(KIT).not.toContain("max-w-[900px]");
  });
});
