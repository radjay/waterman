import assert from "node:assert/strict";
import test from "node:test";
import {
  kickInMarkerIndex,
  kickInMarkerSvgX,
} from "../../lib/forecast-experiment/chartKickInMarker.js";

test("kickInMarkerIndex maps kick-in time to fractional hour index", () => {
  const hours = Array.from({ length: 16 }, (_, i) => ({
    hourLocal: 6 + i,
    validTime: Date.parse("2026-05-27T06:00:00Z") + i * 3_600_000,
  }));

  const kickInAt = Date.parse("2026-05-27T13:30:00Z");
  const index = kickInMarkerIndex(kickInAt, hours);
  assert.ok(index != null);
  assert.ok(index > 0);
  assert.ok(index < hours.length - 1);

  const x = kickInMarkerSvgX(index, hours.length, 300, 32);
  assert.ok(x > 32);
});

test("kickInMarkerIndex clamps kick-in before 8am to riding window start", () => {
  const hours = Array.from({ length: 16 }, (_, i) => ({
    hourLocal: 6 + i,
    validTime: Date.parse("2026-05-27T06:00:00Z") + i * 3_600_000,
  }));
  const early = Date.parse("2026-05-27T06:30:00Z");
  const index = kickInMarkerIndex(early, hours);
  assert.equal(index, 2);
});
