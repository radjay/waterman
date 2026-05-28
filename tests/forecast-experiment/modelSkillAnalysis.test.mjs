import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeModelSkill,
  buildSkillChartData,
  classifyWindRegime,
  classifyWindSpeedBucket,
  computeDailyCurveMetrics,
  computeSkillMetrics,
  computeWindSpeedRegimeBreakdown,
  computeMonthlyWindSpeedBreakdown,
  computeRideabilityAnomalies,
  detrendSeries,
  isNortadaDirection,
  pairHourlyModelObs,
  pairHourlySeries,
  pearsonCorrelation,
  rankModels,
  rankModelsByCurve,
  listWindyNortadaDates,
  windyNortadaPairFilter,
  WIND_REGIME_NORTADA,
  WIND_REGIME_NON_NORTADA,
} from "../../lib/forecast-experiment/modelSkillAnalysis.js";
import { localDayWindowMs } from "../../lib/forecast-experiment/time.js";

test("isNortadaDirection matches prediction.js convention", () => {
  assert.equal(isNortadaDirection(330), true);
  assert.equal(isNortadaDirection(20), true);
  assert.equal(isNortadaDirection(300), true);
  assert.equal(isNortadaDirection(40), true);
  assert.equal(isNortadaDirection(180), false);
  assert.equal(isNortadaDirection(undefined), false);
});

test("classifyWindRegime labels nortada and non-nortada hours", () => {
  assert.equal(classifyWindRegime(330), WIND_REGIME_NORTADA);
  assert.equal(classifyWindRegime(200), WIND_REGIME_NON_NORTADA);
});

test("classifyWindSpeedBucket groups effective wind into day-count bands", () => {
  assert.equal(classifyWindSpeedBucket(0), "0-10");
  assert.equal(classifyWindSpeedBucket(9.9), "0-10");
  assert.equal(classifyWindSpeedBucket(10), "10-15");
  assert.equal(classifyWindSpeedBucket(14.9), "10-15");
  assert.equal(classifyWindSpeedBucket(15), "15-20");
  assert.equal(classifyWindSpeedBucket(24.9), "20-25");
  assert.equal(classifyWindSpeedBucket(25), "25+");
});

test("computeWindSpeedRegimeBreakdown counts days by regime peak effective wind", () => {
  const dateLocal = "2025-07-07";
  const { startAt } = localDayWindowMs(dateLocal);
  const { startAt: nextDayStart } = localDayWindowMs("2025-07-08");
  const noon = startAt + 12 * 3_600_000;
  const afternoon = startAt + 14 * 3_600_000;
  const nextNoon = nextDayStart + 12 * 3_600_000;

  const breakdown = computeWindSpeedRegimeBreakdown({
    datesLocal: [dateLocal, "2025-07-08"],
    observations: [
      obs(noon + 5 * 60_000, 20, 24, 330),
      obs(afternoon + 5 * 60_000, 11, 13, 200),
      obs(nextNoon + 5 * 60_000, 11, 13, 180),
    ],
  });

  assert.equal(breakdown.totalDays, 2);
  assert.equal(breakdown.nortada.daysWithWind, 1);
  assert.equal(breakdown.nortada.daysByBucket["20-25"], 1);
  assert.equal(breakdown.nonNortada.daysWithWind, 2);
  assert.equal(breakdown.nonNortada.daysByBucket["10-15"], 2);
});

test("computeRideabilityAnomalies flags false positives and false negatives", () => {
  const falsePositiveDay = "2025-07-07";
  const falseNegativeDay = "2025-07-08";
  const { startAt: fpStart } = localDayWindowMs(falsePositiveDay);
  const { startAt: fnStart } = localDayWindowMs(falseNegativeDay);
  const kickInAt = fnStart + 11 * 3_600_000;
  const model = "gfs-global-previous-day1";

  const fpForecast = [];
  for (let hour = 6; hour <= 20; hour += 1) {
    const validTime = fpStart + hour * 3_600_000;
    const speed = hour < 12 ? 8 : 16;
    fpForecast.push(forecastPoint(model, fpStart - 12 * 3_600_000, validTime, speed, speed + 2));
  }

  const fnForecast = [];
  for (let hour = 6; hour <= 20; hour += 1) {
    const validTime = fnStart + hour * 3_600_000;
    fnForecast.push(forecastPoint(model, fnStart - 12 * 3_600_000, validTime, 8, 9));
  }

  const anomalies = computeRideabilityAnomalies({
    datesLocal: [falsePositiveDay, falseNegativeDay],
    observations: [
      obs(fpStart + 12 * 3_600_000, 8, 9),
      obs(kickInAt - 15 * 60_000, 10, 11),
      obs(kickInAt, 13, 15),
      obs(kickInAt + 15 * 60_000, 14, 16),
      obs(kickInAt + 30 * 60_000, 15, 17),
    ],
    forecastPoints: [...fpForecast, ...fnForecast],
    models: [model],
  });

  assert.equal(anomalies.byModel[model].falsePositiveCount, 1);
  assert.equal(anomalies.byModel[model].falseNegativeCount, 1);
  assert.equal(anomalies.byModel[model].falsePositives[0].dateLocal, falsePositiveDay);
  assert.equal(anomalies.byModel[model].falseNegatives[0].dateLocal, falseNegativeDay);
});

test("computeMonthlyWindSpeedBreakdown groups regime day counts by month", () => {
  const { startAt } = localDayWindowMs("2025-05-15");
  const { startAt: juneStart } = localDayWindowMs("2025-06-10");
  const noon = startAt + 12 * 3_600_000;
  const juneNoon = juneStart + 12 * 3_600_000;

  const monthly = computeMonthlyWindSpeedBreakdown({
    datesLocal: ["2025-05-15", "2025-06-10"],
    observations: [
      obs(noon + 5 * 60_000, 20, 24, 330),
      obs(noon + 6 * 3_600_000, 11, 13, 200),
      obs(juneNoon + 5 * 60_000, 11, 13, 180),
    ],
  });

  assert.equal(monthly.months.length, 2);
  assert.equal(monthly.months[0].monthKey, "2025-05");
  assert.equal(monthly.months[0].nortada["20-25"], 1);
  assert.equal(monthly.months[0].nonNortada["10-15"], 1);
  assert.equal(monthly.months[1].monthKey, "2025-06");
  assert.equal(monthly.months[1].nonNortada["10-15"], 1);
  assert.equal(monthly.months[1].label, "Jun");
});

test("computeWindSpeedRegimeBreakdown includes monthly breakdown", () => {
  const dateLocal = "2025-07-07";
  const { startAt } = localDayWindowMs(dateLocal);
  const breakdown = computeWindSpeedRegimeBreakdown({
    datesLocal: [dateLocal],
    observations: [obs(startAt + 12 * 3_600_000 + 5 * 60_000, 20, 24, 330)],
  });

  assert.equal(breakdown.monthly.months.length, 1);
  assert.equal(breakdown.monthly.months[0].nortada["20-25"], 1);
});

test("listWindyNortadaDates keeps days whose nortada peak reaches rideable wind", () => {
  const windyDay = "2025-07-07";
  const calmDay = "2025-07-08";
  const { startAt } = localDayWindowMs(windyDay);
  const { startAt: calmStart } = localDayWindowMs(calmDay);

  const eligible = listWindyNortadaDates({
    datesLocal: [windyDay, calmDay],
    observations: [
      obs(startAt + 12 * 3_600_000 + 5 * 60_000, 20, 24, 330),
      obs(calmStart + 12 * 3_600_000 + 5 * 60_000, 8, 10, 330),
      obs(calmStart + 14 * 3_600_000 + 5 * 60_000, 11, 13, 200),
    ],
    minEffectiveKnots: 12,
  });

  assert.deepEqual(eligible, [windyDay]);
});

test("analyzeModelSkill pairFilter limits scored hours to windy nortada", () => {
  const dateLocal = "2025-07-07";
  const { startAt } = localDayWindowMs(dateLocal);
  const validTime = startAt + 12 * 3_600_000;
  const southTime = startAt + 14 * 3_600_000;

  const analysis = analyzeModelSkill({
    datesLocal: [dateLocal],
    observations: [
      obs(validTime + 5 * 60_000, 20, 24, 330),
      obs(southTime + 5 * 60_000, 16, 18, 200),
    ],
    forecastPoints: [
      forecastPoint("icon-eu-previous-day1", startAt - 6 * 3_600_000, validTime, 19, 23),
      forecastPoint("icon-eu-previous-day1", startAt - 6 * 3_600_000, southTime, 10, 12),
    ],
    models: ["icon-eu-previous-day1"],
    pairFilter: windyNortadaPairFilter(12),
  });

  assert.equal(analysis.totals.overall, 1);
  assert.equal(analysis.byModel["icon-eu-previous-day1"].overall.effective.mae, 1);
});

test("pairHourlySeries joins on validTime and skips empty hours", () => {
  const observed = [
    hourRow(1000, { speed: 10, gust: 12, direction: 330, samples: 2 }),
    hourRow(2000, { speed: 8, gust: 10, direction: 180, samples: 0 }),
  ];
  const forecast = [
    hourRow(1000, { speed: 12, gust: 14 }),
    hourRow(3000, { speed: 15, gust: 17 }),
  ];
  const pairs = pairHourlySeries(observed, forecast);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].validTime, 1000);
  assert.equal(pairs[0].regime, WIND_REGIME_NORTADA);
  assert.equal(pairs[0].observed.windSpeedKnots, 10);
  assert.equal(pairs[0].forecast.windSpeedKnots, 12);
});

test("pairHourlyModelObs selects model-specific forecast and classifies regime from obs", () => {
  const dateLocal = "2025-07-07";
  const { startAt } = localDayWindowMs(dateLocal);
  const validTime = startAt + 12 * 3_600_000;
  const pairs = pairHourlyModelObs({
    dateLocal,
    observations: [obs(validTime + 10 * 60_000, 10, 14, 330)],
    forecastPoints: [
      forecastPoint("gfs-global-previous-day1", startAt - 6 * 3_600_000, validTime, 11, 15),
      forecastPoint("icon-eu-previous-day1", startAt - 6 * 3_600_000, validTime, 9, 13),
    ],
    model: "gfs-global-previous-day1",
  });
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].forecast.windSpeedKnots, 11);
  assert.equal(pairs[0].regime, WIND_REGIME_NORTADA);
});

test("computeSkillMetrics returns mae rmse and bias for speed gust and effective", () => {
  const pairs = [
    {
      observed: { windSpeedKnots: 10, windGustKnots: 14, effectiveWindKnots: 12 },
      forecast: { windSpeedKnots: 12, windGustKnots: 16, effectiveWindKnots: 14 },
    },
    {
      observed: { windSpeedKnots: 8, windGustKnots: 10, effectiveWindKnots: 9 },
      forecast: { windSpeedKnots: 10, windGustKnots: 12, effectiveWindKnots: 11 },
    },
  ];
  const metrics = computeSkillMetrics(pairs);
  assert.equal(metrics.sampleCount, 2);
  assert.equal(metrics.speed.mae, 2);
  assert.equal(metrics.speed.bias, 2);
  assert.equal(metrics.effective.mae, 2);
  assert.equal(metrics.gust.mae, 2);
});

test("analyzeModelSkill ranks models by effective mae and segments by regime", () => {
  const dateLocal = "2025-07-07";
  const { startAt } = localDayWindowMs(dateLocal);
  const nortadaTime = startAt + 11 * 3_600_000;
  const southTime = startAt + 15 * 3_600_000;
  const observations = [
    obs(nortadaTime + 10 * 60_000, 16, 18, 330),
    obs(southTime + 10 * 60_000, 8, 10, 180),
  ];
  const forecastPoints = [
    forecastPoint("gfs-global-previous-day1", startAt - 6 * 3_600_000, nortadaTime, 16, 18),
    forecastPoint("gfs-global-previous-day1", startAt - 6 * 3_600_000, southTime, 8, 10),
    forecastPoint("icon-eu-previous-day1", startAt - 6 * 3_600_000, nortadaTime, 20, 22),
    forecastPoint("icon-eu-previous-day1", startAt - 6 * 3_600_000, southTime, 12, 14),
  ];

  const analysis = analyzeModelSkill({
    observations,
    forecastPoints,
    datesLocal: [dateLocal],
    models: ["gfs-global-previous-day1", "icon-eu-previous-day1"],
  });

  assert.equal(analysis.models[0].model, "gfs-global-previous-day1");
  assert.equal(analysis.byModel["gfs-global-previous-day1"].nortada.sampleCount, 1);
  assert.equal(analysis.byModel["gfs-global-previous-day1"].nonNortada.sampleCount, 1);
  assert.equal(analysis.byModel["icon-eu-previous-day1"].nonNortada.effective.mae, 4);
});

test("rankModels sorts by chosen metric", () => {
  const ranked = rankModels({
    good: { overall: { sampleCount: 2, effective: { mae: 1.2 } } },
    bad: { overall: { sampleCount: 2, effective: { mae: 3.4 } } },
  });
  assert.deepEqual(ranked.map((row) => row.model), ["good", "bad"]);
});

test("pearsonCorrelation ignores constant offset between series", () => {
  const observed = [10, 14, 18, 14];
  const forecast = [12, 16, 20, 16];
  assert.equal(pearsonCorrelation(observed, forecast), 1);
  assert.equal(pearsonCorrelation(detrendSeries(observed), detrendSeries(forecast)), 1);
});

test("pearsonCorrelation catches inverted intraday shape", () => {
  const observed = [10, 14, 18, 14];
  const forecast = [18, 14, 10, 14];
  assert.ok(pearsonCorrelation(observed, forecast) < 0);
});

test("computeDailyCurveMetrics scores shape separately from level bias", () => {
  const pairs = [10, 14, 18, 14].map((effective, index) => ({
    validTime: index * 3_600_000,
    observed: { effectiveWindKnots: effective },
    forecast: { effectiveWindKnots: effective + 4 },
  }));
  const metrics = computeDailyCurveMetrics(pairs);
  assert.equal(metrics.shapeCorrelation, 1);
  assert.equal(metrics.levelCorrelation, 1);
});

test("analyzeModelSkill ranks curve tracking separately from typical miss", () => {
  const dateLocal = "2025-07-07";
  const { startAt } = localDayWindowMs(dateLocal);
  const hours = [8, 11, 14, 17].map((hour) => startAt + hour * 3_600_000);
  const observedCurve = [10, 14, 18, 14];
  const observations = hours.map((validTime, index) =>
    obs(validTime + 10 * 60_000, observedCurve[index], observedCurve[index] + 2, 330)
  );
  const runAt = startAt - 6 * 3_600_000;
  const forecastPoints = hours.flatMap((validTime, index) => [
    forecastPoint(
      "accurate-curve-previous-day1",
      runAt,
      validTime,
      observedCurve[index],
      observedCurve[index] + 2
    ),
    forecastPoint(
      "flat-bias-previous-day1",
      runAt,
      validTime,
      15,
      17
    ),
  ]);

  const analysis = analyzeModelSkill({
    observations,
    forecastPoints,
    datesLocal: [dateLocal],
    models: ["accurate-curve-previous-day1", "flat-bias-previous-day1"],
  });

  assert.equal(analysis.models[0].model, "accurate-curve-previous-day1");
  assert.equal(analysis.curveModels[0].model, "accurate-curve-previous-day1");
  assert.equal(analysis.curveModels[0].shapeCorrelation, 1);
  assert.ok(
    analysis.byModel["flat-bias-previous-day1"].overall.effective.mae >
      analysis.byModel["accurate-curve-previous-day1"].overall.effective.mae
  );
  assert.ok(
    !Number.isFinite(analysis.byModel["flat-bias-previous-day1"].curve?.shape?.mean) ||
      analysis.byModel["accurate-curve-previous-day1"].curve.shape.mean >
        analysis.byModel["flat-bias-previous-day1"].curve.shape.mean
  );
});

test("rankModelsByCurve prefers higher shape correlation", () => {
  const ranked = rankModelsByCurve({
    good: { curve: { dayCount: 10, shape: { mean: 0.82 }, level: { mean: 0.9 }, ramp: { mean: 0.7 } } },
    bad: { curve: { dayCount: 10, shape: { mean: 0.41 }, level: { mean: 0.5 }, ramp: { mean: 0.3 } } },
  });
  assert.deepEqual(ranked.map((row) => row.model), ["good", "bad"]);
});

test("buildSkillChartData downsamples scatter and picks sample days", () => {
  const scatterByModel = {
    "model-a": Array.from({ length: 500 }, (_, index) => ({
      observed: 10 + (index % 10),
      forecast: 11 + (index % 10),
    })),
  };
  const daySeriesByDate = new Map([
    [
      "2025-07-07",
      new Map([
        [
          10,
          {
            hourLocal: 10,
            observed: 12,
            forecasts: { "model-a": 13 },
          },
        ],
        [
          11,
          {
            hourLocal: 11,
            observed: 15,
            forecasts: { "model-a": 14 },
          },
        ],
        [
          12,
          {
            hourLocal: 12,
            observed: 18,
            forecasts: { "model-a": 17 },
          },
        ],
        [
          13,
          {
            hourLocal: 13,
            observed: 16,
            forecasts: { "model-a": 15 },
          },
        ],
        [
          14,
          {
            hourLocal: 14,
            observed: 14,
            forecasts: { "model-a": 13 },
          },
        ],
        [
          15,
          {
            hourLocal: 15,
            observed: 12,
            forecasts: { "model-a": 11 },
          },
        ],
      ]),
    ],
  ]);

  const chartData = buildSkillChartData(scatterByModel, daySeriesByDate, ["model-a"], {
    maxScatterPointsPerModel: 100,
    maxSampleDays: 1,
  });

  assert.equal(chartData.scatter["model-a"].length, 100);
  assert.equal(chartData.sampleDays.length, 1);
  assert.equal(chartData.sampleDays[0].dateLocal, "2025-07-07");
  assert.ok(chartData.domain.max > chartData.domain.min);
});

function hourRow(validTime, { speed, gust, direction, samples }) {
  return {
    validTime,
    windSpeedKnots: speed,
    windGustKnots: gust,
    windDirectionDeg: direction,
    effectiveWindKnots: (speed + gust) / 2,
    sampleCount: samples,
    regime: classifyWindRegime(direction),
  };
}

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

function obs(observedAt, windSpeedKnots, windGustKnots, windDirectionDeg) {
  return {
    observedAt,
    windSpeedKnots,
    windGustKnots,
    windDirectionDeg,
    quality: "ok",
  };
}
