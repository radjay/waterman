import assert from "node:assert/strict";
import test from "node:test";
import {
  applyOutlookForecastHorizon,
  hasFullMarinaChartForecast,
} from "../../lib/forecast-experiment/dayWindChartData.js";

test("hasFullMarinaChartForecast rejects partial chart coverage", () => {
  assert.equal(
    hasFullMarinaChartForecast([], "2026-06-03", Date.parse("2026-05-28T10:00:00Z")),
    false
  );
});

test("applyOutlookForecastHorizon drops kick-in beyond ingested forecast end", () => {
  const adjusted = applyOutlookForecastHorizon(
    {
      verdict: "go",
      headline: "Good",
      kickInTime: "100% · 6:00 pm",
      kickInAtMs: 1_780_324_800_000,
    },
    {
      model: "icon-global",
      partialHorizon: true,
      lastDataMs: 1_780_303_200_000,
      filledHours: 7,
      totalHours: 16,
    }
  );

  assert.equal(adjusted.kickInAtMs, null);
  assert.equal(adjusted.headline, "Uncertain");
  assert.equal(adjusted.verdict, "maybe");
  assert.equal(adjusted.partialForecast, true);
});
