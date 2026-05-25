import assert from "node:assert/strict";
import test from "node:test";
import {
  isoRun,
  leadHours,
  localDateKey,
  candidateGlobalRuns,
  dateRangeWeeks,
} from "../../lib/forecast-experiment/time.js";

test("formats UTC model runs without seconds", () => {
  assert.equal(isoRun(Date.UTC(2026, 4, 24, 0, 15)), "2026-05-24T00:00");
});

test("computes lead hours from run and valid time", () => {
  assert.equal(
    leadHours(Date.UTC(2026, 4, 24, 0), Date.UTC(2026, 4, 24, 18)),
    18
  );
});

test("computes local date key for Lisbon", () => {
  assert.equal(localDateKey(Date.UTC(2026, 6, 1, 22, 30), "Europe/Lisbon"), "2026-07-01");
});

test("returns recent global model cycles", () => {
  assert.deepEqual(
    candidateGlobalRuns(Date.UTC(2026, 4, 24, 13, 5)).slice(0, 3),
    ["2026-05-24T12:00", "2026-05-24T06:00", "2026-05-24T00:00"]
  );
});

test("splits date ranges into weeks", () => {
  assert.deepEqual(dateRangeWeeks("2025-05-01", "2025-05-10"), [
    { from: "2025-05-01", to: "2025-05-07" },
    { from: "2025-05-08", to: "2025-05-10" },
  ]);
});
