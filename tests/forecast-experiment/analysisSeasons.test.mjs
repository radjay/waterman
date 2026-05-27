import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYSIS_SEASONS,
  listAnalysisSeasonOptions,
  summerSeasonRange,
} from "../../lib/forecast-experiment/analysisSeasons.js";

test("summer seasons use May through September", () => {
  assert.deepEqual(summerSeasonRange(2024), {
    startDateLocal: "2024-05-01",
    endDateLocal: "2024-09-30",
  });
});

test("average (for labels/backtest) only spans marina-observed summers (2024-2025)", () => {
  // Phase 0: "Average" for kick-in labels, ML training, and prediction backtests
  // is intentionally limited to years with real marina observations.
  assert.equal(ANALYSIS_SEASONS.average.ranges.length, 2);
  assert.equal(ANALYSIS_SEASONS.average.ranges[0].startDateLocal, "2024-05-01");
  assert.equal(ANALYSIS_SEASONS.average.ranges[1].endDateLocal, "2025-09-30");
});

test("listAnalysisSeasonOptions returns average then each summer year", () => {
  const options = listAnalysisSeasonOptions();
  assert.deepEqual(
    options.map((option) => option.id),
    ["average", "2024", "2025", "2026"]
  );
});
