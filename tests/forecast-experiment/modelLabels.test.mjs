import assert from "node:assert/strict";
import test from "node:test";
import { formatForecastModelLabel } from "../../lib/forecast-experiment/modelLabels.js";

test("formatForecastModelLabel includes Windy compare names in brackets", () => {
  assert.equal(formatForecastModelLabel("icon-eu-previous-day1"), "icon-eu (ICON7, day 1)");
  assert.equal(formatForecastModelLabel("icon-global-previous-day2"), "icon-global (ICON13, day 2)");
  assert.equal(formatForecastModelLabel("gfs-global"), "gfs-global (GFS27)");
  assert.equal(formatForecastModelLabel("ecmwf-ifs-hres-9km-previous-day1"), "ecmwf-ifs-hres-9km (ECMWF, day 1)");
});

test("formatForecastModelLabel falls back without windy mapping", () => {
  assert.equal(
    formatForecastModelLabel("meteofrance-arpege-europe-previous-day1"),
    "meteofrance-arpege-europe (day 1)"
  );
  assert.equal(formatForecastModelLabel("unknown-model"), "unknown-model");
});
