import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

const gone = [
  "scripts/recorder-worker.mjs",
  "app/api/recordings/start/route.js",
  "app/api/recordings/stop/route.js",
  "app/recordings/page.js",
  "components/webcam/RecordButton.js",
  "convex/recordings.ts",
];

describe("recorder feature removed", () => {
  for (const rel of gone) {
    it(`deletes ${rel}`, () => {
      assert.equal(existsSync(path.join(root, rel)), false);
    });
  }

  it("drops the recordings table from schema", () => {
    assert.doesNotMatch(read("convex/schema.ts"), /recordings:\s*defineTable/);
  });

  it("drops the Render recorder service", () => {
    assert.equal(existsSync(path.join(root, "render.yaml")), false);
  });

  it("has no RecordButton or recordings route in nav", () => {
    assert.doesNotMatch(read("components/webcam/WebcamFullscreen.js"), /RecordButton/);
    assert.doesNotMatch(read("components/auth/UserMenu.js"), /\/recordings/);
    assert.doesNotMatch(read("components/layout/MobileMenu.js"), /\/recordings/);
  });
});
