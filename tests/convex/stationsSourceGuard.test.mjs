import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(__dirname, "../../convex/stations.ts"), "utf8");

/**
 * lib/windguru.js exports two similarly-named fetchers ~15 lines apart:
 * fetchStationReading (guarded — returns null for a dead station, see
 * parseCurrentReading) and fetchWindguruCurrentStation (unguarded legacy,
 * kept only for older fx scripts). If pollStations' call site regressed to
 * the legacy fetcher, dead station 15435 would write a fabricated calm
 * reading every five minutes, forever — the exact bug this whole feature
 * exists to prevent — and every OTHER test in this repo would still pass,
 * because nothing else exercises convex/stations.ts.
 *
 * The only way to exercise the real regression is a Convex deployment
 * (`npx convex dev`/`deploy`), which this repo's workflow explicitly
 * forbids running from an agent and which this suite has no business doing
 * anyway. A source-level assertion is a poor substitute for an integration
 * test in general, but here it is the right tool: cheap, runs on every
 * commit, and directly catches the one-line swap that would otherwise be
 * silent and permanent.
 */
describe("convex/stations.ts call-site guard", () => {
  it("calls the guarded fetchStationReading, not the unguarded legacy fetcher", () => {
    assert.match(source, /\bfetchStationReading\b/);
    assert.doesNotMatch(source, /\bfetchWindguruCurrentStation\b/);
  });
});
