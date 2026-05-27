import { buildDailyLabel } from "./labels.js";
import { buildBaselinePrediction } from "./prediction.js";
import { resolveRideabilityThreshold } from "./rideabilityThresholds.js";
import { localDayWindowMs } from "./time.js";
import { effectiveWindKnots, isUsableForecastPoint } from "./units.js";

const DEFAULT_TIMEZONE = "Europe/Lisbon";
const DEFAULT_CUTOFF_HOUR = 7;

/** Rideable-window hours shown on backtest wind charts (Lisbon local). */
export const BACKTEST_CHART_START_HOUR = 6;
export const BACKTEST_CHART_END_HOUR = 21;

/** Kick-in vertical markers are clamped to this Lisbon hour range on charts. */
export const BACKTEST_KICKIN_MARKER_START_HOUR = 8;
export const BACKTEST_KICKIN_MARKER_END_HOUR = 21;

import { ML_FORECAST_MODELS } from "./mlDataset.js";

export const BACKTEST_FORECAST_MODEL_BLENDED = "blended";
export const BACKTEST_FORECAST_MODEL_ML = "ml-multi";

export function buildWeekBacktest({
  datesLocal,
  marinaObservations,
  caboRasoObservations,
  forecastPoints,
  thresholdKnots,
  preset,
  timezone = DEFAULT_TIMEZONE,
  predictionCutoffHourLocal = DEFAULT_CUTOFF_HOUR,
  forecastModel = BACKTEST_FORECAST_MODEL_BLENDED,
  buildPrediction = buildBaselinePrediction,
  predictionOptions = {},
}) {
  return datesLocal.map((dateLocal) =>
    buildDayBacktest({
      dateLocal,
      marinaObservations,
      caboRasoObservations,
      forecastPoints,
      thresholdKnots,
      preset,
      timezone,
      predictionCutoffHourLocal,
      forecastModel,
      buildPrediction,
      predictionOptions,
    })
  );
}

export function buildDayBacktest({
  dateLocal,
  marinaObservations,
  caboRasoObservations,
  forecastPoints,
  thresholdKnots,
  preset,
  timezone = DEFAULT_TIMEZONE,
  predictionCutoffHourLocal = DEFAULT_CUTOFF_HOUR,
  forecastModel = BACKTEST_FORECAST_MODEL_BLENDED,
  buildPrediction = buildBaselinePrediction,
  predictionOptions = {},
}) {
  const resolvedThreshold = resolveRideabilityThreshold({ thresholdKnots, preset });
  const { startAt, endAt } = localDayWindowMs(dateLocal, timezone);
  const paddedStart = startAt - 2 * 3_600_000;
  const paddedEnd = endAt + 2 * 3_600_000;

  const dayMarinaObs = normalizeObservationsForBacktest(
    marinaObservations.filter(
      (obs) => obs.observedAt >= paddedStart && obs.observedAt <= paddedEnd
    )
  );
  const dayCaboObs = normalizeObservationsForBacktest(
    caboRasoObservations.filter(
      (obs) => obs.observedAt >= paddedStart && obs.observedAt <= paddedEnd
    )
  );

  const actualLabel = buildDailyLabel({
    locationSlug: "cascais-bay",
    dateLocal,
    observations: dayMarinaObs.filter(
      (obs) => obs.observedAt >= startAt && obs.observedAt < endAt
    ),
    reports: [],
    caboRasoObservations: [],
    thresholdKnots: resolvedThreshold,
  });
  const caboLabel = buildDailyLabel({
    locationSlug: "cabo-raso",
    dateLocal,
    observations: dayCaboObs.filter(
      (obs) => obs.observedAt >= startAt && obs.observedAt < endAt
    ),
    reports: [],
    thresholdKnots: resolvedThreshold,
  });

  const cutoffAt = startAt + predictionCutoffHourLocal * 3_600_000;
  const forecastWindowStart = startAt + 6 * 3_600_000;
  const forecastWindowEnd = startAt + 22 * 3_600_000;
  const dayForecastPoints = forecastPoints.filter(
    (point) => point.validTime >= forecastWindowStart && point.validTime <= forecastWindowEnd
  );
  const eligiblePoints = filterForecastPointsByModel(
    selectForecastPointsForBacktest(dayForecastPoints, cutoffAt),
    forecastModel
  );
  const caboBeforeCutoff = dayCaboObs
    .filter((obs) => obs.observedAt <= cutoffAt)
    .sort((a, b) => b.observedAt - a.observedAt);

  const prediction =
    eligiblePoints.length > 0
      ? buildPrediction({
          ...predictionOptions,
          targetLocationSlug: "cascais-bay",
          forecastDateLocal: dateLocal,
          generatedAt: cutoffAt,
          points: eligiblePoints,
          caboRasoObservations: caboBeforeCutoff,
          thresholdKnots: resolvedThreshold,
        })
      : null;

  const actualKickInAt = actualLabel.labelStatus === "observed" ? actualLabel.actualKickInAt : undefined;
  const caboRasoKickInAt = caboLabel.labelStatus === "observed" ? caboLabel.actualKickInAt : undefined;
  const predictedKickInAt = prediction?.kickInP50At;

  const chart = buildDayWindChart({
    dateLocal,
    marinaObservations: dayMarinaObs,
    caboRasoObservations: dayCaboObs,
    forecastPoints: dayForecastPoints,
    cutoffAt,
    timezone,
    forecastModel,
    actualKickInAt,
    caboRasoKickInAt,
    predictedKickInAt,
  });

  return {
    dateLocal,
    chart,
    actual: {
      kickInAt: actualKickInAt,
      labelStatus: actualLabel.labelStatus,
      maxWindKnots: actualLabel.maxWindKnots,
      observationCount: dayMarinaObs.length,
      summary: actualLabel.sourceSummary,
    },
    predicted: prediction
      ? {
          kickInP50At: prediction.kickInP50At,
          kickInP75At: prediction.kickInP75At,
          confidence: prediction.confidence,
          summary: prediction.summary,
          forecastPointCount: eligiblePoints.length,
        }
      : null,
    errorMinutes: computeErrorMinutes(actualKickInAt, predictedKickInAt),
    hasForecastData: eligiblePoints.length > 0,
  };
}

export function selectForecastPointsForBacktest(points, cutoffAt) {
  const beforeCutoff = points.filter((point) => point.runStartedAt <= cutoffAt);
  const latestRunByModel = new Map();
  for (const point of beforeCutoff) {
    const current = latestRunByModel.get(point.model);
    if (current == null || point.runStartedAt > current) {
      latestRunByModel.set(point.model, point.runStartedAt);
    }
  }
  return beforeCutoff.filter((point) => point.runStartedAt === latestRunByModel.get(point.model));
}

export function filterForecastPointsByModel(points, forecastModel = BACKTEST_FORECAST_MODEL_BLENDED) {
  if (!forecastModel || forecastModel === BACKTEST_FORECAST_MODEL_BLENDED) return points;
  if (forecastModel === BACKTEST_FORECAST_MODEL_ML) {
    return points.filter((point) => ML_FORECAST_MODELS.includes(point.model));
  }
  return points.filter((point) => point.model === forecastModel);
}

export function listForecastModelsFromPoints(forecastPoints) {
  return [...new Set(forecastPoints.map((point) => point.model))].sort();
}

export function computeErrorMinutes(actualKickInAt, predictedKickInAt) {
  if (actualKickInAt == null || predictedKickInAt == null) return undefined;
  return Math.round((predictedKickInAt - actualKickInAt) / 60_000);
}

export function buildDayWindChart({
  dateLocal,
  marinaObservations,
  caboRasoObservations = [],
  forecastPoints,
  cutoffAt,
  timezone = DEFAULT_TIMEZONE,
  startHour = BACKTEST_CHART_START_HOUR,
  endHour = BACKTEST_CHART_END_HOUR,
  forecastModel = BACKTEST_FORECAST_MODEL_BLENDED,
  actualKickInAt,
  caboRasoKickInAt,
  predictedKickInAt,
}) {
  const chartOptions = { timezone, startHour, endHour, forecastModel };
  const observed = aggregateHourlyObservations(marinaObservations, dateLocal, chartOptions);
  const caboRaso = aggregateHourlyObservations(caboRasoObservations, dateLocal, chartOptions);
  const forecast = aggregateHourlyForecast(forecastPoints, dateLocal, cutoffAt, chartOptions);
  return {
    startHour,
    endHour,
    observed,
    caboRaso,
    forecast,
    markers: {
      actualKickInAt: actualKickInAt ?? null,
      caboRasoKickInAt: caboRasoKickInAt ?? null,
      predictedKickInAt: predictedKickInAt ?? null,
    },
  };
}

export function aggregateHourlyObservations(
  observations,
  dateLocal,
  { timezone = DEFAULT_TIMEZONE, startHour = BACKTEST_CHART_START_HOUR, endHour = BACKTEST_CHART_END_HOUR } = {}
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
    hours.push({
      hourLocal: hour,
      validTime,
      windSpeedKnots,
      windGustKnots,
      effectiveWindKnots: effectiveWindKnots({ windSpeedKnots, windGustKnots }),
      sampleCount: inHour.length,
    });
  }
  return hours;
}

export function aggregateHourlyForecast(
  forecastPoints,
  dateLocal,
  cutoffAt,
  {
    timezone = DEFAULT_TIMEZONE,
    startHour = BACKTEST_CHART_START_HOUR,
    endHour = BACKTEST_CHART_END_HOUR,
    forecastModel = BACKTEST_FORECAST_MODEL_BLENDED,
  } = {}
) {
  const { startAt } = localDayWindowMs(dateLocal, timezone);
  const windowStart = startAt + startHour * 3_600_000;
  const windowEnd = startAt + endHour * 3_600_000;
  const inWindow = forecastPoints.filter(
    (point) => point.validTime >= windowStart && point.validTime <= windowEnd
  );
  const selected = filterForecastPointsByModel(
    selectForecastPointsForBacktest(inWindow, cutoffAt),
    forecastModel
  ).filter(isUsableForecastPoint);
  const byValidTime = new Map();
  for (const point of selected) {
    if (!byValidTime.has(point.validTime)) byValidTime.set(point.validTime, []);
    byValidTime.get(point.validTime).push(point);
  }

  const hours = [];
  for (let hour = startHour; hour <= endHour; hour += 1) {
    const validTime = startAt + hour * 3_600_000;
    const rows = byValidTime.get(validTime) ?? [];
    const windSpeedKnots = mean(rows.map((row) => row.windSpeedKnots));
    const windGustKnots = mean(rows.map((row) => row.windGustKnots));
    hours.push({
      hourLocal: hour,
      validTime,
      windSpeedKnots,
      windGustKnots,
      effectiveWindKnots: effectiveWindKnots({ windSpeedKnots, windGustKnots }),
      modelCount: rows.length,
    });
  }
  return hours;
}

function mean(values) {
  const nums = values.filter(Number.isFinite);
  if (nums.length === 0) return undefined;
  return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * 10) / 10;
}

export function normalizeObservationsForBacktest(observations) {
  return observations
    .filter((obs) => obs.quality !== "nodata")
    .map((obs) => ({
      ...obs,
      quality: "ok",
    }));
}

export function summarizeWeekBacktest(days) {
  const comparable = days.filter((day) => day.actual.kickInAt && day.predicted?.kickInP50At);
  const errors = comparable.map((day) => day.errorMinutes).filter(Number.isFinite);

  return {
    daysWithActualKickIn: days.filter((day) => day.actual.kickInAt).length,
    daysWithPrediction: days.filter((day) => day.predicted?.kickInP50At).length,
    daysComparable: comparable.length,
    meanAbsoluteErrorMinutes:
      errors.length > 0
        ? Math.round(errors.reduce((sum, value) => sum + Math.abs(value), 0) / errors.length)
        : undefined,
    earlyCount: errors.filter((value) => value < -60).length,
    lateCount: errors.filter((value) => value > 60).length,
    withinHourCount: errors.filter((value) => Math.abs(value) <= 60).length,
    forecastCoverageDays: days.filter((day) => day.hasForecastData).length,
  };
}
