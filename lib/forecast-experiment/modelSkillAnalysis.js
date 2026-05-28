import {
  aggregateHourlyForecast,
  BACKTEST_CHART_END_HOUR,
  BACKTEST_CHART_START_HOUR,
  buildDayBacktest,
  listForecastModelsFromPoints,
  normalizeObservationsForBacktest,
} from "./backtest.js";
import { meanAbsoluteError, rootMeanSquaredError } from "./skill.js";
import { getPredictedKickInAt } from "./predictionFields.js";
import { localDateKey, localDayWindowMs } from "./time.js";
import { effectiveWindKnots } from "./units.js";

export const WIND_REGIME_NORTADA = "nortada";
export const WIND_REGIME_NON_NORTADA = "non-nortada";
export const WIND_REGIME_UNKNOWN = "unknown";

const DEFAULT_TIMEZONE = "Europe/Lisbon";
const DEFAULT_CUTOFF_HOUR = 7;
export const DEFAULT_RIDEABLE_THRESHOLD_KNOTS = 12;

/** Nortada = wind FROM north (300–40° meteorological), same as prediction.js. */
export function isNortadaDirection(windDirectionDeg) {
  if (!Number.isFinite(windDirectionDeg)) return false;
  return windDirectionDeg >= 300 || windDirectionDeg <= 40;
}

export function classifyWindRegime(windDirectionDeg) {
  if (!Number.isFinite(windDirectionDeg)) return WIND_REGIME_UNKNOWN;
  return isNortadaDirection(windDirectionDeg) ? WIND_REGIME_NORTADA : WIND_REGIME_NON_NORTADA;
}

export const WIND_SPEED_BUCKET_DEFS = [
  { id: "0-10", label: "0–10 kt", min: 0, max: 10 },
  { id: "10-15", label: "10–15 kt", min: 10, max: 15 },
  { id: "15-20", label: "15–20 kt", min: 15, max: 20 },
  { id: "20-25", label: "20–25 kt", min: 20, max: 25 },
  { id: "25+", label: "25+ kt", min: 25, max: Infinity },
];

export function classifyWindSpeedBucket(effectiveKnots, { minKnots = 0 } = {}) {
  if (!Number.isFinite(effectiveKnots) || effectiveKnots < minKnots) return null;
  for (const bucket of WIND_SPEED_BUCKET_DEFS) {
    if (effectiveKnots >= bucket.min && effectiveKnots < bucket.max) return bucket.id;
  }
  return null;
}

function emptyWindSpeedBucketCounts() {
  return Object.fromEntries(WIND_SPEED_BUCKET_DEFS.map((bucket) => [bucket.id, 0]));
}

/**
 * Count days by peak effective wind (6am–9pm) within each direction regime.
 * A day can contribute to both nortada and non-nortada when both had observed hours.
 */
export function computeWindSpeedRegimeBreakdown({
  observations,
  datesLocal,
  timezone = DEFAULT_TIMEZONE,
  startHour = BACKTEST_CHART_START_HOUR,
  endHour = BACKTEST_CHART_END_HOUR,
  minEffectiveKnots = 0,
}) {
  const nortadaCounts = emptyWindSpeedBucketCounts();
  const nonNortadaCounts = emptyWindSpeedBucketCounts();
  let nortadaDays = 0;
  let nonNortadaDays = 0;

  for (const dateLocal of datesLocal) {
    const hours = aggregateHourlyObservationsWithDirection(observations, dateLocal, {
      timezone,
      startHour,
      endHour,
    });

    const peakByRegime = {
      [WIND_REGIME_NORTADA]: peakEffectiveForRegime(hours, WIND_REGIME_NORTADA),
      [WIND_REGIME_NON_NORTADA]: peakEffectiveForRegime(hours, WIND_REGIME_NON_NORTADA),
    };

    const nortadaBucket = classifyWindSpeedBucket(peakByRegime[WIND_REGIME_NORTADA], {
      minKnots: minEffectiveKnots,
    });
    if (nortadaBucket) {
      nortadaDays += 1;
      nortadaCounts[nortadaBucket] += 1;
    }

    const nonNortadaBucket = classifyWindSpeedBucket(peakByRegime[WIND_REGIME_NON_NORTADA], {
      minKnots: minEffectiveKnots,
    });
    if (nonNortadaBucket) {
      nonNortadaDays += 1;
      nonNortadaCounts[nonNortadaBucket] += 1;
    }
  }

  return {
    minEffectiveKnots,
    buckets: WIND_SPEED_BUCKET_DEFS.map(({ id, label }) => ({ id, label })),
    totalDays: datesLocal.length,
    nortada: { daysByBucket: nortadaCounts, daysWithWind: nortadaDays },
    nonNortada: { daysByBucket: nonNortadaCounts, daysWithWind: nonNortadaDays },
    monthly: computeMonthlyWindSpeedBreakdown({
      observations,
      datesLocal,
      timezone,
      startHour,
      endHour,
      minEffectiveKnots,
    }),
  };
}

/** Days per wind-speed bucket grouped by calendar month and direction regime. */
export function computeMonthlyWindSpeedBreakdown({
  observations,
  datesLocal,
  timezone = DEFAULT_TIMEZONE,
  startHour = BACKTEST_CHART_START_HOUR,
  endHour = BACKTEST_CHART_END_HOUR,
  minEffectiveKnots = 0,
}) {
  const byMonth = new Map();

  for (const dateLocal of datesLocal) {
    const monthKey = dateLocal.slice(0, 7);
    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, {
        monthKey,
        nortada: emptyWindSpeedBucketCounts(),
        nonNortada: emptyWindSpeedBucketCounts(),
      });
    }

    const hours = aggregateHourlyObservationsWithDirection(observations, dateLocal, {
      timezone,
      startHour,
      endHour,
    });
    const monthRow = byMonth.get(monthKey);

    const nortadaBucket = classifyWindSpeedBucket(
      peakEffectiveForRegime(hours, WIND_REGIME_NORTADA),
      { minKnots: minEffectiveKnots }
    );
    if (nortadaBucket) monthRow.nortada[nortadaBucket] += 1;

    const nonNortadaBucket = classifyWindSpeedBucket(
      peakEffectiveForRegime(hours, WIND_REGIME_NON_NORTADA),
      { minKnots: minEffectiveKnots }
    );
    if (nonNortadaBucket) monthRow.nonNortada[nonNortadaBucket] += 1;
  }

  const months = [...byMonth.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  const spanMultipleYears = new Set(months.map((row) => row.monthKey.slice(0, 4))).size > 1;

  return {
    buckets: WIND_SPEED_BUCKET_DEFS.map(({ id, label }) => ({ id, label })),
    months: months.map((row) => ({
      monthKey: row.monthKey,
      label: formatWindClimatologyMonthLabel(row.monthKey, spanMultipleYears),
      nortada: row.nortada,
      nonNortada: row.nonNortada,
    })),
  };
}

function formatWindClimatologyMonthLabel(monthKey, spanMultipleYears) {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  const shortMonth = date.toLocaleString("en-US", { month: "short" });
  return spanMultipleYears ? `${shortMonth} '${year.slice(2)}` : shortMonth;
}

function peakEffectiveForRegime(hours, regime) {
  const values = hours
    .filter(
      (row) =>
        row.sampleCount > 0 &&
        row.regime === regime &&
        Number.isFinite(row.effectiveWindKnots)
    )
    .map((row) => row.effectiveWindKnots);
  if (values.length === 0) return undefined;
  return Math.max(...values);
}

/** Days with peak nortada effective wind at or above the rideable threshold (6am–9pm). */
export function listWindyNortadaDates({
  observations,
  datesLocal,
  minEffectiveKnots = 12,
  timezone = DEFAULT_TIMEZONE,
  startHour = BACKTEST_CHART_START_HOUR,
  endHour = BACKTEST_CHART_END_HOUR,
}) {
  return datesLocal.filter((dateLocal) => {
    const hours = aggregateHourlyObservationsWithDirection(observations, dateLocal, {
      timezone,
      startHour,
      endHour,
    });
    const peak = peakEffectiveForRegime(hours, WIND_REGIME_NORTADA);
    return Number.isFinite(peak) && peak >= minEffectiveKnots;
  });
}

export function windyNortadaPairFilter(minEffectiveKnots = 12) {
  return (pair) =>
    pair.regime === WIND_REGIME_NORTADA &&
    Number.isFinite(pair.observed.effectiveWindKnots) &&
    pair.observed.effectiveWindKnots >= minEffectiveKnots;
}

export function meanBias(actual, predicted) {
  const pairs = actual
    .map((value, index) => [value, predicted[index]])
    .filter(([a, p]) => Number.isFinite(a) && Number.isFinite(p));
  if (pairs.length === 0) return undefined;
  return round2(pairs.reduce((sum, [a, p]) => sum + (p - a), 0) / pairs.length);
}

export function computeMetricBundle(actualValues, predictedValues) {
  return {
    mae: meanAbsoluteError(actualValues, predictedValues),
    rmse: rootMeanSquaredError(actualValues, predictedValues),
    bias: meanBias(actualValues, predictedValues),
  };
}

export function computeSkillMetrics(pairs) {
  const speedActual = pairs.map((row) => row.observed.windSpeedKnots);
  const speedPredicted = pairs.map((row) => row.forecast.windSpeedKnots);
  const gustActual = pairs.map((row) => row.observed.windGustKnots);
  const gustPredicted = pairs.map((row) => row.forecast.windGustKnots);
  const effectiveActual = pairs.map((row) => row.observed.effectiveWindKnots);
  const effectivePredicted = pairs.map((row) => row.forecast.effectiveWindKnots);

  return {
    sampleCount: pairs.length,
    speed: computeMetricBundle(speedActual, speedPredicted),
    gust: computeMetricBundle(gustActual, gustPredicted),
    effective: computeMetricBundle(effectiveActual, effectivePredicted),
  };
}

/** Pearson r in [-1, 1]. Undefined when series are flat or too short. */
export function pearsonCorrelation(valuesA, valuesB) {
  if (valuesA.length !== valuesB.length || valuesA.length < 2) return undefined;
  const n = valuesA.length;
  const meanA = valuesA.reduce((sum, value) => sum + value, 0) / n;
  const meanB = valuesB.reduce((sum, value) => sum + value, 0) / n;
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  for (let index = 0; index < n; index += 1) {
    const deltaA = valuesA[index] - meanA;
    const deltaB = valuesB[index] - meanB;
    numerator += deltaA * deltaB;
    denomA += deltaA * deltaA;
    denomB += deltaB * deltaB;
  }
  if (denomA === 0 || denomB === 0) return undefined;
  return round3(numerator / Math.sqrt(denomA * denomB));
}

export function detrendSeries(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.map((value) => value - mean);
}

export function successiveDeltas(values) {
  const deltas = [];
  for (let index = 1; index < values.length; index += 1) {
    deltas.push(values[index] - values[index - 1]);
  }
  return deltas;
}

const DEFAULT_MIN_CURVE_HOURS = 4;

/** How well forecast tracks the intraday effective-wind curve on one day. */
export function computeDailyCurveMetrics(pairs, { minHours = DEFAULT_MIN_CURVE_HOURS } = {}) {
  const sortedPairs = [...pairs].sort((a, b) => a.validTime - b.validTime);
  const actual = sortedPairs.map((row) => row.observed.effectiveWindKnots);
  const predicted = sortedPairs.map((row) => row.forecast.effectiveWindKnots);
  if (actual.length < minHours) return null;

  const levelCorrelation = pearsonCorrelation(actual, predicted);
  const shapeCorrelation = pearsonCorrelation(detrendSeries(actual), detrendSeries(predicted));
  const rampCorrelation =
    actual.length >= minHours + 1
      ? pearsonCorrelation(successiveDeltas(actual), successiveDeltas(predicted))
      : undefined;

  if (
    !Number.isFinite(levelCorrelation) &&
    !Number.isFinite(shapeCorrelation) &&
    !Number.isFinite(rampCorrelation)
  ) {
    return null;
  }

  return {
    hourCount: actual.length,
    levelCorrelation,
    shapeCorrelation,
    rampCorrelation,
  };
}

export function aggregateCurveMetrics(dailySamples) {
  if (dailySamples.length === 0) return null;

  return {
    dayCount: dailySamples.length,
    meanHoursPerDay: round2(mean(dailySamples.map((sample) => sample.hourCount))),
    level: { mean: meanMetric(dailySamples.map((sample) => sample.levelCorrelation)) },
    shape: { mean: meanMetric(dailySamples.map((sample) => sample.shapeCorrelation)) },
    ramp: { mean: meanMetric(dailySamples.map((sample) => sample.rampCorrelation)) },
  };
}

export function aggregateHourlyObservationsWithDirection(
  observations,
  dateLocal,
  {
    timezone = DEFAULT_TIMEZONE,
    startHour = BACKTEST_CHART_START_HOUR,
    endHour = BACKTEST_CHART_END_HOUR,
  } = {}
) {
  const { startAt } = localDayWindowMs(dateLocal, timezone);
  const normalized = normalizeObservationsForBacktest(observations);
  const hours = [];
  for (let hour = startHour; hour <= endHour; hour += 1) {
    const validTime = startAt + hour * 3_600_000;
    const hourEnd = validTime + 3_600_000;
    const inHour = normalized.filter(
      (obs) => obs.observedAt >= validTime && obs.observedAt < hourEnd
    );
    const windSpeedKnots = mean(inHour.map((obs) => obs.windSpeedKnots));
    const windGustKnots = mean(inHour.map((obs) => obs.windGustKnots));
    const windDirectionDeg = circularMeanDirection(
      inHour.map((obs) => obs.windDirectionDeg).filter(Number.isFinite)
    );
    hours.push({
      hourLocal: hour,
      validTime,
      windSpeedKnots,
      windGustKnots,
      windDirectionDeg,
      effectiveWindKnots: effectiveWindKnots({ windSpeedKnots, windGustKnots }),
      sampleCount: inHour.length,
      regime: classifyWindRegime(windDirectionDeg),
    });
  }
  return hours;
}

export function pairHourlyModelObs({
  dateLocal,
  observations,
  forecastPoints,
  model,
  timezone = DEFAULT_TIMEZONE,
  startHour = BACKTEST_CHART_START_HOUR,
  endHour = BACKTEST_CHART_END_HOUR,
  predictionCutoffHourLocal = DEFAULT_CUTOFF_HOUR,
}) {
  const { startAt } = localDayWindowMs(dateLocal, timezone);
  const cutoffAt = startAt + predictionCutoffHourLocal * 3_600_000;
  const observed = aggregateHourlyObservationsWithDirection(observations, dateLocal, {
    timezone,
    startHour,
    endHour,
  });
  const forecast = aggregateHourlyForecast(forecastPoints, dateLocal, cutoffAt, {
    timezone,
    startHour,
    endHour,
    forecastModel: model,
  });
  return pairHourlySeries(observed, forecast);
}

export function pairHourlySeries(observedHours, forecastHours) {
  const forecastByTime = new Map(forecastHours.map((row) => [row.validTime, row]));
  const pairs = [];
  for (const obsRow of observedHours) {
    if (obsRow.sampleCount === 0) continue;
    const fcRow = forecastByTime.get(obsRow.validTime);
    if (!fcRow || fcRow.modelCount === 0) continue;
    if (!hasComparableWind(obsRow, fcRow)) continue;
    pairs.push({
      validTime: obsRow.validTime,
      regime: obsRow.regime,
      observed: obsRow,
      forecast: fcRow,
    });
  }
  return pairs;
}

export function listDatesLocalInRange(startAt, endAt, timezone = DEFAULT_TIMEZONE) {
  const dates = [];
  let cursor = startAt;
  let lastDate = null;
  while (cursor <= endAt) {
    const dateLocal = localDateKey(cursor, timezone);
    if (dateLocal !== lastDate) {
      dates.push(dateLocal);
      lastDate = dateLocal;
    }
    cursor += 12 * 3_600_000;
  }
  return dates;
}

export function inferAnalysisWindow({
  observations,
  forecastPoints,
  timezone = DEFAULT_TIMEZONE,
  startHour = BACKTEST_CHART_START_HOUR,
  endHour = BACKTEST_CHART_END_HOUR,
}) {
  const obsTimes = normalizeObservationsForBacktest(observations).map((obs) => obs.observedAt);
  const fcTimes = forecastPoints.map((point) => point.validTime);
  if (obsTimes.length === 0 || fcTimes.length === 0) {
    return null;
  }
  const startAt = Math.max(Math.min(...obsTimes), Math.min(...fcTimes));
  const endAt = Math.min(Math.max(...obsTimes), Math.max(...fcTimes));
  const datesLocal = listDatesLocalInRange(startAt, endAt, timezone);
  return {
    startAt,
    endAt,
    startDateLocal: localDateKey(startAt, timezone),
    endDateLocal: localDateKey(endAt, timezone),
    datesLocal,
    analysisStartAt: startAt,
    analysisEndAt: endAt,
    chartStartHour: startHour,
    chartEndHour: endHour,
  };
}

export function downsampleScatterPoints(points, maxCount = 350) {
  if (!points?.length || points.length <= maxCount) return points ?? [];
  const sampled = [];
  const stride = points.length / maxCount;
  for (let index = 0; index < maxCount; index += 1) {
    sampled.push(points[Math.floor(index * stride)]);
  }
  return sampled;
}

export function accumulateSampleDayHours(daySeriesByDate, dateLocal, dayPairs, model) {
  if (!dayPairs.length) return;
  if (!daySeriesByDate.has(dateLocal)) {
    daySeriesByDate.set(dateLocal, new Map());
  }
  const hoursByLocal = daySeriesByDate.get(dateLocal);
  for (const pair of dayPairs) {
    const hourLocal = pair.observed.hourLocal;
    if (!Number.isFinite(hourLocal)) continue;
    if (!hoursByLocal.has(hourLocal)) {
      hoursByLocal.set(hourLocal, {
        hourLocal,
        observed: pair.observed.effectiveWindKnots,
        forecasts: {},
      });
    }
    const row = hoursByLocal.get(hourLocal);
    row.forecasts[model] = pair.forecast.effectiveWindKnots;
  }
}

export function pickSampleDays(daySeriesByDate, { maxDays = 2, minHours = 6 } = {}) {
  return [...daySeriesByDate.entries()]
    .map(([dateLocal, hoursByLocal]) => {
      const hours = [...hoursByLocal.values()].sort((a, b) => a.hourLocal - b.hourLocal);
      const observedValues = hours.map((row) => row.observed).filter(Number.isFinite);
      const spread =
        observedValues.length > 0
          ? Math.max(...observedValues) - Math.min(...observedValues)
          : 0;
      return {
        dateLocal,
        hours,
        score: hours.length * 10 + spread,
      };
    })
    .filter((day) => day.hours.length >= minHours)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxDays)
    .map(({ dateLocal, hours }) => ({ dateLocal, hours }));
}

export function buildSkillChartData(
  scatterByModel,
  daySeriesByDate,
  models,
  { maxScatterPointsPerModel = 350, maxSampleDays = 2 } = {}
) {
  const scatter = {};
  let domainMin = Infinity;
  let domainMax = -Infinity;

  for (const model of models) {
    const points = (scatterByModel[model] ?? []).map((point) => ({
      observed: round1(point.observed),
      forecast: round1(point.forecast),
    }));
    const sampled = downsampleScatterPoints(points, maxScatterPointsPerModel);
    scatter[model] = sampled;
    for (const point of sampled) {
      domainMin = Math.min(domainMin, point.observed, point.forecast);
      domainMax = Math.max(domainMax, point.observed, point.forecast);
    }
  }

  if (!Number.isFinite(domainMin) || !Number.isFinite(domainMax)) {
    return { scatter, domain: { min: 0, max: 30 }, sampleDays: [] };
  }

  const padding = 2;
  return {
    scatter,
    domain: {
      min: Math.max(0, Math.floor(domainMin - padding)),
      max: Math.ceil(domainMax + padding),
    },
    sampleDays: pickSampleDays(daySeriesByDate, { maxDays: maxSampleDays }),
  };
}

export function listModelsForSkillAnalysis(forecastPoints, { previousDayOnly = true } = {}) {
  const models = listForecastModelsFromPoints(forecastPoints);
  if (!previousDayOnly) return models;
  const previousDay = models.filter((model) => /-previous-day\d+$/.test(model));
  if (previousDay.length === 0) return models;
  const day1 = previousDay.filter((model) => model.endsWith("-previous-day1"));
  return day1.length > 0 ? day1 : previousDay;
}

/**
 * Days where forecast expected rideable wind (P50 kick-in) but obs never sustained threshold,
 * or obs reached threshold but forecast did not predict rideable wind.
 */
export function computeRideabilityAnomalies({
  datesLocal,
  observations,
  forecastPoints,
  models,
  thresholdKnots = DEFAULT_RIDEABLE_THRESHOLD_KNOTS,
  timezone = DEFAULT_TIMEZONE,
  predictionCutoffHourLocal = DEFAULT_CUTOFF_HOUR,
  maxExamplesPerType = 8,
}) {
  const byModel = {};

  for (const model of models) {
    const falsePositives = [];
    const falseNegatives = [];

    for (const dateLocal of datesLocal) {
      const day = buildDayBacktest({
        dateLocal,
        marinaObservations: observations,
        caboRasoObservations: [],
        forecastPoints,
        thresholdKnots,
        timezone,
        predictionCutoffHourLocal,
        forecastModel: model,
      });
      if (!day.hasForecastData) continue;

      const observedRideable = day.actual.kickInAt != null;
      const forecastRideable = getPredictedKickInAt(day.predicted) != null;

      if (forecastRideable && !observedRideable) {
        falsePositives.push({
          dateLocal,
          predictedKickInAt: getPredictedKickInAt(day.predicted),
          maxObservedWindKnots: day.actual.maxWindKnots,
        });
      } else if (observedRideable && !forecastRideable) {
        falseNegatives.push({
          dateLocal,
          actualKickInAt: day.actual.kickInAt,
          maxObservedWindKnots: day.actual.maxWindKnots,
        });
      }
    }

    byModel[model] = {
      falsePositiveCount: falsePositives.length,
      falseNegativeCount: falseNegatives.length,
      falsePositives: falsePositives.slice(0, maxExamplesPerType),
      falseNegatives: falseNegatives.slice(0, maxExamplesPerType),
    };
  }

  return {
    thresholdKnots,
    daysScored: datesLocal.length,
    byModel,
  };
}

export function analyzeModelSkill({
  observations,
  forecastPoints,
  datesLocal,
  models,
  timezone = DEFAULT_TIMEZONE,
  startHour = BACKTEST_CHART_START_HOUR,
  endHour = BACKTEST_CHART_END_HOUR,
  predictionCutoffHourLocal = DEFAULT_CUTOFF_HOUR,
  pairFilter = null,
  includeChartData = true,
  includeCurveMetrics = true,
}) {
  const includePair = typeof pairFilter === "function" ? pairFilter : () => true;
  const byModel = {};
  const scatterByModel = includeChartData
    ? Object.fromEntries(models.map((model) => [model, []]))
    : null;
  const daySeriesByDate = includeChartData ? new Map() : null;

  for (const model of models) {
    const pairs = [];
    const dailyCurveSamples = [];
    for (const dateLocal of datesLocal) {
      const dayPairs = pairHourlyModelObs({
        dateLocal,
        observations,
        forecastPoints,
        model,
        timezone,
        startHour,
        endHour,
        predictionCutoffHourLocal,
      }).filter(includePair);
      pairs.push(...dayPairs);
      if (includeChartData) {
        accumulateSampleDayHours(daySeriesByDate, dateLocal, dayPairs, model);
        for (const pair of dayPairs) {
          scatterByModel[model].push({
            observed: pair.observed.effectiveWindKnots,
            forecast: pair.forecast.effectiveWindKnots,
          });
        }
      }
      if (includeCurveMetrics) {
        const dayCurve = computeDailyCurveMetrics(dayPairs);
        if (dayCurve) dailyCurveSamples.push(dayCurve);
      }
    }
    byModel[model] = {
      overall: computeSkillMetrics(pairs),
      nortada: computeSkillMetrics(pairs.filter((row) => row.regime === WIND_REGIME_NORTADA)),
      nonNortada: computeSkillMetrics(pairs.filter((row) => row.regime === WIND_REGIME_NON_NORTADA)),
      curve: includeCurveMetrics ? aggregateCurveMetrics(dailyCurveSamples) : undefined,
    };
  }

  return {
    models: rankModels(byModel),
    curveModels: includeCurveMetrics ? rankModelsByCurve(byModel) : [],
    byModel,
    totals: summarizeRegimeCounts(byModel),
    chartData: includeChartData ? buildSkillChartData(scatterByModel, daySeriesByDate, models) : null,
  };
}

export function rankModels(byModel, { metric = "effective", stat = "mae" } = {}) {
  return Object.entries(byModel)
    .map(([model, scores]) => ({
      model,
      sampleCount: scores.overall.sampleCount,
      effectiveMae: scores.overall.effective?.mae,
      effectiveRmse: scores.overall.effective?.rmse,
      speedMae: scores.overall.speed?.mae,
      gustMae: scores.overall.gust?.mae,
      nortadaEffectiveMae: scores.nortada?.effective?.mae,
      nonNortadaEffectiveMae: scores.nonNortada?.effective?.mae,
      shapeCorrelation: scores.curve?.shape?.mean,
      rampCorrelation: scores.curve?.ramp?.mean,
      curveDayCount: scores.curve?.dayCount,
      sortKey: scores.overall[metric]?.[stat],
    }))
    .filter((row) => Number.isFinite(row.sortKey))
    .sort((a, b) => a.sortKey - b.sortKey);
}

/** Higher correlation = better daily curve tracking. */
export function rankModelsByCurve(byModel, { metric = "shape" } = {}) {
  return Object.entries(byModel)
    .map(([model, scores]) => ({
      model,
      dayCount: scores.curve?.dayCount ?? 0,
      levelCorrelation: scores.curve?.level?.mean,
      shapeCorrelation: scores.curve?.shape?.mean,
      rampCorrelation: scores.curve?.ramp?.mean,
      sortKey: scores.curve?.[metric]?.mean,
    }))
    .filter((row) => Number.isFinite(row.sortKey) && row.dayCount > 0)
    .sort((a, b) => b.sortKey - a.sortKey);
}

export function formatModelSkillTable(analysis) {
  const lines = [
    "model\tsamples\teff_mae\teff_rmse\teff_bias\tspeed_mae\tgust_mae\tnortada_mae\tnon_nortada_mae",
  ];
  for (const row of analysis.models) {
    const scores = analysis.byModel[row.model];
    lines.push(
      [
        row.model,
        row.sampleCount,
        fmt(scores.overall.effective?.mae),
        fmt(scores.overall.effective?.rmse),
        fmt(scores.overall.effective?.bias),
        fmt(scores.overall.speed?.mae),
        fmt(scores.overall.gust?.mae),
        fmt(scores.nortada.effective?.mae),
        fmt(scores.nonNortada.effective?.mae),
      ].join("\t")
    );
  }
  return lines.join("\n");
}

function summarizeRegimeCounts(byModel) {
  const firstModel = Object.values(byModel)[0];
  if (!firstModel) {
    return { overall: 0, nortada: 0, nonNortada: 0 };
  }
  return {
    overall: firstModel.overall.sampleCount,
    nortada: firstModel.nortada.sampleCount,
    nonNortada: firstModel.nonNortada.sampleCount,
  };
}

function hasComparableWind(obsRow, fcRow) {
  return (
    Number.isFinite(obsRow.effectiveWindKnots) &&
    Number.isFinite(fcRow.effectiveWindKnots) &&
    (Number.isFinite(obsRow.windSpeedKnots) || Number.isFinite(obsRow.windGustKnots))
  );
}

function mean(values) {
  const nums = values.filter(Number.isFinite);
  if (nums.length === 0) return undefined;
  return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * 10) / 10;
}

function meanMetric(values) {
  const nums = values.filter(Number.isFinite);
  if (nums.length === 0) return undefined;
  return round3(nums.reduce((sum, value) => sum + value, 0) / nums.length);
}

function circularMeanDirection(degrees) {
  if (degrees.length === 0) return undefined;
  let sinSum = 0;
  let cosSum = 0;
  for (const value of degrees) {
    const radians = (value * Math.PI) / 180;
    sinSum += Math.sin(radians);
    cosSum += Math.cos(radians);
  }
  const meanRad = Math.atan2(sinSum, cosSum);
  return round1(((meanRad * 180) / Math.PI + 360) % 360);
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function round3(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function fmt(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "";
}
