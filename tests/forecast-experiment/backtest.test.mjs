import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateHourlyForecast,
  aggregateHourlyObservations,
  BACKTEST_FORECAST_MODEL_BLENDED,
  buildDayBacktest,
  computeErrorMinutes,
  filterForecastPointsByModel,
  selectForecastPointsForBacktest,
  summarizeWeekBacktest,
} from "../../lib/forecast-experiment/backtest.js";
import { localDayWindowMs } from "../../lib/forecast-experiment/time.js";

const base = Date.UTC(2025, 6, 7, 0);

test("selects latest model run available before cutoff", () => {
  const cutoffAt = base + 7 * 3_600_000;
  const points = [
    forecastPoint("ecmwf-ifs-hres-9km", base - 12 * 3_600_000, base + 12 * 3_600_000, 10, 12),
    forecastPoint("ecmwf-ifs-hres-9km", base - 6 * 3_600_000, base + 12 * 3_600_000, 14, 16),
    forecastPoint("gfs-global", base - 6 * 3_600_000, base + 12 * 3_600_000, 13, 15),
  ];
  const selected = selectForecastPointsForBacktest(points, cutoffAt);
  assert.equal(selected.length, 2);
  assert.equal(selected.find((point) => point.model === "ecmwf-ifs-hres-9km").runStartedAt, base - 6 * 3_600_000);
});

test("buildDayBacktest compares marina kick-in against model prediction", () => {
  const dateLocal = "2025-07-07";
  const { startAt } = localDayWindowMs(dateLocal);
  const kickInAt = startAt + 11 * 3_600_000 + 30 * 60_000;
  const marinaObservations = [
    obs(kickInAt - 15 * 60_000, 10, 11),
    obs(kickInAt, 13, 15),
    obs(kickInAt + 15 * 60_000, 14, 16),
    obs(kickInAt + 30 * 60_000, 15, 17),
  ];
  const forecastPoints = [];
  for (let hour = 6; hour <= 20; hour += 1) {
    const validTime = startAt + hour * 3_600_000;
    const speed = hour < 12 ? 8 : 16;
    forecastPoints.push(
      forecastPoint("ecmwf-ifs-hres-9km", startAt - 12 * 3_600_000, validTime, speed, speed + 2),
      forecastPoint("gfs-global", startAt - 12 * 3_600_000, validTime, speed, speed + 2)
    );
  }

  const day = buildDayBacktest({
    dateLocal,
    marinaObservations,
    caboRasoObservations: [],
    forecastPoints,
  });

  assert.equal(day.actual.kickInAt, kickInAt);
  assert.ok(day.predicted?.kickInP50At);
  assert.ok(Math.abs(day.errorMinutes) <= 90);
});

test("summarizeWeekBacktest aggregates comparable days", () => {
  const summary = summarizeWeekBacktest([
    { actual: { kickInAt: 1 }, predicted: { kickInP50At: 1 }, errorMinutes: 0, hasForecastData: true },
    { actual: { kickInAt: 2 }, predicted: { kickInP50At: 3_600_002 }, errorMinutes: 60, hasForecastData: true },
    { actual: {}, predicted: null, hasForecastData: false },
  ]);
  assert.equal(summary.daysComparable, 2);
  assert.equal(summary.meanAbsoluteErrorMinutes, 30);
  assert.equal(summary.withinHourCount, 2);
});

test("buildDayBacktest treats stale historical marina readings as usable", () => {
  const dateLocal = "2025-07-07";
  const { startAt } = localDayWindowMs(dateLocal);
  const kickInAt = startAt + 11 * 3_600_000;
  const marinaObservations = [
    { ...obs(kickInAt, 13, 15), quality: "stale" },
    { ...obs(kickInAt + 15 * 60_000, 14, 16), quality: "stale" },
  ];

  const day = buildDayBacktest({
    dateLocal,
    marinaObservations,
    caboRasoObservations: [],
    forecastPoints: [],
  });

  assert.equal(day.actual.kickInAt, kickInAt);
  assert.equal(day.actual.observationCount, 2);
});

test("computeErrorMinutes returns signed delta", () => {
  assert.equal(computeErrorMinutes(0, 120_000), 2);
  assert.equal(computeErrorMinutes(120_000, 0), -2);
});

test("aggregateHourlyObservations averages 5-minute readings per hour", () => {
  const dateLocal = "2025-07-07";
  const { startAt } = localDayWindowMs(dateLocal);
  const hourStart = startAt + 10 * 3_600_000;
  const hourly = aggregateHourlyObservations(
    [
      obs(hourStart + 5 * 60_000, 10, 12),
      obs(hourStart + 20 * 60_000, 14, 16),
    ],
    dateLocal
  );
  const row = hourly.find((entry) => entry.hourLocal === 10);
  assert.equal(row.windSpeedKnots, 12);
  assert.equal(row.windGustKnots, 14);
  assert.equal(row.effectiveWindKnots, 13);
  assert.equal(row.sampleCount, 2);
});

test("aggregateHourlyForecast ensembles models per valid hour", () => {
  const dateLocal = "2025-07-07";
  const { startAt } = localDayWindowMs(dateLocal);
  const cutoffAt = startAt + 7 * 3_600_000;
  const validTime = startAt + 12 * 3_600_000;
  const hourly = aggregateHourlyForecast(
    [
      forecastPoint("ecmwf-ifs-hres-9km", startAt - 6 * 3_600_000, validTime, 10, 14),
      forecastPoint("gfs-global", startAt - 6 * 3_600_000, validTime, 14, 18),
      forecastPoint("ecmwf-ifs-hres-9km", startAt + 8 * 3_600_000, validTime, 20, 24),
    ],
    dateLocal,
    cutoffAt
  );
  const row = hourly.find((entry) => entry.hourLocal === 12);
  assert.equal(row.windSpeedKnots, 12);
  assert.equal(row.windGustKnots, 16);
  assert.equal(row.effectiveWindKnots, 14);
  assert.equal(row.modelCount, 2);
});

test("aggregateHourlyForecast excludes null-ingested 0/0 model gaps", () => {
  const dateLocal = "2025-07-19";
  const { startAt } = localDayWindowMs(dateLocal);
  const cutoffAt = startAt + 7 * 3_600_000;
  const validTime = startAt + 15 * 3_600_000;
  const hourly = aggregateHourlyForecast(
    [
      forecastPoint("ecmwf-ifs-hres-9km-previous-day1", startAt - 6 * 3_600_000, validTime, 0, 0),
      forecastPoint("gfs-global-previous-day1", startAt - 6 * 3_600_000, validTime, 13.5, 15.6),
      forecastPoint("icon-eu-previous-day1", startAt - 6 * 3_600_000, validTime, 10.2, 21.8),
    ],
    dateLocal,
    cutoffAt
  );
  const row = hourly.find((entry) => entry.hourLocal === 15);
  assert.equal(row.windSpeedKnots, 11.9);
  assert.equal(row.modelCount, 2);
});

test("aggregateHourlyForecast uses only selected model when not blended", () => {
  const dateLocal = "2025-07-07";
  const { startAt } = localDayWindowMs(dateLocal);
  const cutoffAt = startAt + 7 * 3_600_000;
  const validTime = startAt + 12 * 3_600_000;
  const hourly = aggregateHourlyForecast(
    [
      forecastPoint("ecmwf-ifs-hres-9km-previous-day1", startAt - 6 * 3_600_000, validTime, 10, 14),
      forecastPoint("gfs-global-previous-day1", startAt - 6 * 3_600_000, validTime, 20, 24),
    ],
    dateLocal,
    cutoffAt,
    { forecastModel: "gfs-global-previous-day1" }
  );
  const row = hourly.find((entry) => entry.hourLocal === 12);
  assert.equal(row.windSpeedKnots, 20);
  assert.equal(row.modelCount, 1);
});

test("filterForecastPointsByModel keeps all points for blended mode", () => {
  const points = [
    forecastPoint("ecmwf-ifs-hres-9km", 0, 1, 10, 12),
    forecastPoint("gfs-global", 0, 1, 14, 16),
  ];
  assert.equal(filterForecastPointsByModel(points, BACKTEST_FORECAST_MODEL_BLENDED).length, 2);
  assert.equal(filterForecastPointsByModel(points, "gfs-global").length, 1);
});

test("buildDayBacktest chart and prediction respect selected model", () => {
  const dateLocal = "2025-07-07";
  const { startAt } = localDayWindowMs(dateLocal);
  const validTime = startAt + 12 * 3_600_000;
  const forecastPoints = [
    forecastPoint("ecmwf-ifs-hres-9km", startAt - 12 * 3_600_000, validTime, 8, 10),
    forecastPoint("gfs-global", startAt - 12 * 3_600_000, validTime, 20, 24),
  ];

  const gfsOnly = buildDayBacktest({
    dateLocal,
    marinaObservations: [],
    caboRasoObservations: [],
    forecastPoints,
    forecastModel: "gfs-global",
  });

  const row = gfsOnly.chart.forecast.find((entry) => entry.hourLocal === 12);
  assert.equal(row.windSpeedKnots, 20);
  assert.equal(row.modelCount, 1);
  assert.ok(gfsOnly.predicted?.kickInP50At);
});

test("buildDayBacktest includes hourly chart series", () => {
  const dateLocal = "2025-07-07";
  const { startAt } = localDayWindowMs(dateLocal);
  const day = buildDayBacktest({
    dateLocal,
    marinaObservations: [obs(startAt + 10 * 3_600_000, 12, 14)],
    caboRasoObservations: [],
    forecastPoints: [
      forecastPoint("gfs-global", startAt - 6 * 3_600_000, startAt + 10 * 3_600_000, 11, 13),
    ],
  });
  assert.equal(day.chart.observed.length, 16);
  assert.equal(day.chart.caboRaso.length, 16);
  assert.equal(day.chart.forecast.length, 16);
  assert.ok(day.chart.observed.some((row) => row.windSpeedKnots === 12));
});

test("buildDayBacktest includes cabo raso hourly chart series", () => {
  const dateLocal = "2025-07-07";
  const { startAt } = localDayWindowMs(dateLocal);
  const day = buildDayBacktest({
    dateLocal,
    marinaObservations: [],
    caboRasoObservations: [obs(startAt + 10 * 3_600_000, 18, 22)],
    forecastPoints: [],
  });
  const row = day.chart.caboRaso.find((entry) => entry.hourLocal === 10);
  assert.equal(row.windSpeedKnots, 18);
  assert.equal(row.effectiveWindKnots, 20);
});

test("buildDayBacktest includes cabo raso kick-in on chart markers", () => {
  const dateLocal = "2025-07-07";
  const { startAt } = localDayWindowMs(dateLocal);
  const kickInAt = startAt + 11 * 3_600_000;
  const day = buildDayBacktest({
    dateLocal,
    marinaObservations: [],
    caboRasoObservations: [
      obs(kickInAt, 13, 15),
      obs(kickInAt + 15 * 60_000, 14, 16),
      obs(kickInAt + 30 * 60_000, 15, 17),
    ],
    forecastPoints: [],
  });
  assert.equal(day.chart.markers.caboRasoKickInAt, kickInAt);
});

function forecastPoint(model, runStartedAt, validTime, windSpeedKnots, windGustKnots) {
  return {
    provider: "open-meteo",
    model,
    runStartedAt,
    validTime,
    windSpeedKnots,
    windGustKnots,
    windDirectionDeg: 330,
  };
}

function obs(observedAt, windSpeedKnots, windGustKnots) {
  return {
    observedAt,
    windSpeedKnots,
    windGustKnots,
    windDirectionDeg: 330,
    quality: "ok",
  };
}
