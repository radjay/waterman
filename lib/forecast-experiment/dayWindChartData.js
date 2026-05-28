import { api } from "../../convex/_generated/api.js";
import {
  BACKTEST_CHART_END_HOUR,
  BACKTEST_CHART_START_HOUR,
  aggregateHourlyForecast,
  aggregateIntervalObservations,
  selectBestForecastPointsForChart,
} from "./backtest.js";
import {
  EXPERIMENT_DISPLAY_FORECAST_MODEL,
  EXPERIMENT_FORECAST_MODEL_PRIORITY,
} from "./locations.js";
import { experimentDisplayForecastWindyLabel, forecastModelWindyLabel } from "./modelLabels.js";
import { ridingWindowBounds } from "./ridingWindow.js";
import { DEFAULT_RIDEABILITY_PRESET, resolveRideabilityThreshold } from "./rideabilityThresholds.js";
import { localDateKey, localDayWindowMs } from "./time.js";

const TIMEZONE = "Europe/Lisbon";

function dayForecastCutoffAt(dateLocal, generatedAt) {
  const todayKey = localDateKey(generatedAt, TIMEZONE);
  const { startAt } = localDayWindowMs(dateLocal, TIMEZONE);
  return dateLocal === todayKey ? generatedAt : startAt + 7 * 3_600_000;
}

function dayForecastPointsInRange(forecastPoints, dateLocal) {
  const { startAt } = localDayWindowMs(dateLocal, TIMEZONE);
  return forecastPoints.filter(
    (point) =>
      point.locationSlug === "cascais-bay" &&
      point.validTime >= startAt - 2 * 3_600_000 &&
      point.validTime <= startAt + 24 * 3_600_000 + 2 * 3_600_000
  );
}

export function marinaForecastHasData(
  forecastPoints,
  dateLocal,
  cutoffAt,
  forecastModel = EXPERIMENT_DISPLAY_FORECAST_MODEL
) {
  const { startAt } = localDayWindowMs(dateLocal, TIMEZONE);
  const windowStart = startAt + BACKTEST_CHART_START_HOUR * 3_600_000;
  const windowEnd = startAt + BACKTEST_CHART_END_HOUR * 3_600_000;
  const eligible = selectBestForecastPointsForChart(
    forecastPoints.filter(
      (point) => point.validTime >= windowStart && point.validTime <= windowEnd
    ),
    cutoffAt,
    forecastModel
  );
  return eligible.length > 0;
}

function chartHourStats(hourly) {
  const totalHours = hourly.length;
  let filledHours = 0;
  let lastDataMs = null;
  for (const row of hourly) {
    if (Number.isFinite(row.windSpeedKnots) || Number.isFinite(row.windGustKnots)) {
      filledHours += 1;
      lastDataMs = row.validTime;
    }
  }
  return {
    totalHours,
    filledHours,
    lastDataMs,
    partialHorizon: filledHours > 0 && filledHours < totalHours,
  };
}

function hourlyForecastForModel(forecastPoints, dateLocal, generatedAt, forecastModel) {
  const cutoffAt = dayForecastCutoffAt(dateLocal, generatedAt);
  const inRange = dayForecastPointsInRange(forecastPoints, dateLocal);
  return aggregateHourlyForecast(inRange, dateLocal, cutoffAt, {
    timezone: TIMEZONE,
    startHour: BACKTEST_CHART_START_HOUR,
    endHour: BACKTEST_CHART_END_HOUR,
    forecastModel,
  });
}

/** Pick the model with the most chart hours filled for this day. */
export function getDayForecastCoverage(forecastPoints, dateLocal, generatedAt = Date.now()) {
  let best = null;
  for (const model of EXPERIMENT_FORECAST_MODEL_PRIORITY) {
    const hourly = hourlyForecastForModel(forecastPoints, dateLocal, generatedAt, model);
    const stats = chartHourStats(hourly);
    if (stats.filledHours === 0) continue;
    const candidate = { model, ...stats };
    if (!best || candidate.filledHours > best.filledHours) {
      best = candidate;
    }
  }
  return best;
}

/** Best available chart model for a day (most hourly coverage, then priority order). */
export function resolveForecastModelForDay(forecastPoints, dateLocal, generatedAt = Date.now()) {
  return getDayForecastCoverage(forecastPoints, dateLocal, generatedAt)?.model ?? null;
}

/** True when any prioritized model has hourly chart data for this day. */
export function hasMarinaChartForecast(forecastPoints, dateLocal, generatedAt = Date.now()) {
  return getDayForecastCoverage(forecastPoints, dateLocal, generatedAt) != null;
}

/** True when a model fills every chart hour (06:00–21:00) for this day. */
export function hasFullMarinaChartForecast(forecastPoints, dateLocal, generatedAt = Date.now()) {
  const coverage = getDayForecastCoverage(forecastPoints, dateLocal, generatedAt);
  return coverage != null && !coverage.partialHorizon;
}

/** Drop kick-in when it falls beyond ingested model horizon for that day. */
export function applyOutlookForecastHorizon(outlookDay, coverage) {
  if (!coverage) return outlookDay;

  const withCoverage = {
    ...outlookDay,
    forecastModel: coverage.model,
    partialForecast: coverage.partialHorizon,
    forecastEndsAtMs: coverage.lastDataMs,
  };

  if (
    withCoverage.kickInAtMs != null &&
    coverage.lastDataMs != null &&
    withCoverage.kickInAtMs > coverage.lastDataMs
  ) {
    return {
      ...withCoverage,
      kickInTime: null,
      kickInTimePlain: null,
      kickInWindowPlain: null,
      kickInAtMs: null,
      headline: withCoverage.verdict === "go" ? "Uncertain" : withCoverage.headline,
      verdict: withCoverage.verdict === "go" ? "maybe" : withCoverage.verdict,
    };
  }

  return withCoverage;
}

export async function buildDayWindChart(convex, dateLocal) {
  const generatedAt = Date.now();
  const todayKey = localDateKey(generatedAt, TIMEZONE);
  const { startAt, endAt } = localDayWindowMs(dateLocal, TIMEZONE);
  const cutoffAt = dayForecastCutoffAt(dateLocal, generatedAt);

  const forecastPoints = await convex.query(api.forecastExperiment.listRecentForecastPoints, {
    locationSlug: "cascais-bay",
    startAt: startAt - 2 * 3_600_000,
    endAt: endAt + 2 * 3_600_000,
  });

  const coverage = getDayForecastCoverage(forecastPoints, dateLocal, generatedAt);
  const forecastModel = coverage?.model ?? EXPERIMENT_DISPLAY_FORECAST_MODEL;

  const caboObservations = await convex.query(api.forecastExperiment.listObservationsForWindow, {
    locationSlug: "cabo-raso",
    startAt: startAt - 2 * 3_600_000,
    endAt: endAt + 2 * 3_600_000,
  });

  const marinaForecast = hourlyForecastForModel(
    forecastPoints,
    dateLocal,
    generatedAt,
    forecastModel
  );

  const caboObserved = aggregateIntervalObservations(caboObservations, dateLocal, {
    timezone: TIMEZONE,
    startHour: BACKTEST_CHART_START_HOUR,
    endHour: BACKTEST_CHART_END_HOUR,
    intervalMinutes: 15,
  }).filter((row) => row.sampleCount > 0);

  const hasForecast = marinaForecast.some(
    (row) => Number.isFinite(row.windSpeedKnots) || Number.isFinite(row.windGustKnots)
  );

  return {
    ok: true,
    dateLocal,
    forecastModel,
    forecastModelLabel:
      forecastModel === EXPERIMENT_DISPLAY_FORECAST_MODEL
        ? experimentDisplayForecastWindyLabel()
        : forecastModelWindyLabel(forecastModel),
    startHour: BACKTEST_CHART_START_HOUR,
    endHour: BACKTEST_CHART_END_HOUR,
    marinaForecast,
    caboObserved,
    hasForecast,
    partialForecast: coverage?.partialHorizon ?? false,
    forecastEndsAtMs: coverage?.lastDataMs ?? null,
    showCabo: dateLocal === todayKey,
  };
}

/** Peak hour value for display strength (matches chart bar height logic). */
function hourlyDisplayPeakKnots(row) {
  const speed = row.windSpeedKnots;
  const gust = row.windGustKnots;
  if (Number.isFinite(speed) && Number.isFinite(gust)) return Math.max(speed, gust);
  if (Number.isFinite(gust)) return gust;
  if (Number.isFinite(speed)) return speed;
  return undefined;
}

/** Peak marina forecast wind for a local day, riding hours only. */
export function peakMarinaForecastKnots(forecastPoints, dateLocal, generatedAt = Date.now()) {
  const { startAt, endAt } = localDayWindowMs(dateLocal, TIMEZONE);
  const cutoffAt = dayForecastCutoffAt(dateLocal, generatedAt);
  const forecastModel =
    resolveForecastModelForDay(forecastPoints, dateLocal, generatedAt) ??
    EXPERIMENT_DISPLAY_FORECAST_MODEL;
  const hourly = aggregateHourlyForecast(
    forecastPoints.filter(
      (point) =>
        point.locationSlug === "cascais-bay" &&
        point.validTime >= startAt - 2 * 3_600_000 &&
        point.validTime <= endAt + 2 * 3_600_000
    ),
    dateLocal,
    cutoffAt,
    {
      timezone: TIMEZONE,
      startHour: BACKTEST_CHART_START_HOUR,
      endHour: BACKTEST_CHART_END_HOUR,
      forecastModel,
    }
  );

  let peak = 0;
  for (const row of hourly) {
    const displayPeak = hourlyDisplayPeakKnots(row);
    if (Number.isFinite(displayPeak) && displayPeak > peak) peak = displayPeak;
  }
  return peak > 0 ? peak : undefined;
}

/** First riding-window hour where marina max(speed,gust) crosses the ride threshold. */
export function marinaForecastKickInFromHourly(
  marinaForecast,
  dateLocal,
  thresholdKnots = resolveRideabilityThreshold({ preset: DEFAULT_RIDEABILITY_PRESET }),
  referenceMs = null
) {
  const { windowStart, windowEnd } = ridingWindowBounds(dateLocal, TIMEZONE);
  for (const row of marinaForecast) {
    if (row.validTime < windowStart || row.validTime > windowEnd) continue;
    if (referenceMs != null && row.validTime <= referenceMs) continue;
    const peak = hourlyDisplayPeakKnots(row);
    if (Number.isFinite(peak) && peak >= thresholdKnots) {
      return row.validTime;
    }
  }
  return undefined;
}

/** Same as chart kick-in, from raw forecast points. */
export function marinaForecastKickInMs(
  forecastPoints,
  dateLocal,
  generatedAt = Date.now(),
  thresholdKnots = resolveRideabilityThreshold({ preset: DEFAULT_RIDEABILITY_PRESET })
) {
  const { startAt, endAt } = localDayWindowMs(dateLocal, TIMEZONE);
  const cutoffAt = dayForecastCutoffAt(dateLocal, generatedAt);
  const forecastModel =
    resolveForecastModelForDay(forecastPoints, dateLocal, generatedAt) ??
    EXPERIMENT_DISPLAY_FORECAST_MODEL;
  const hourly = aggregateHourlyForecast(
    forecastPoints.filter(
      (point) =>
        point.locationSlug === "cascais-bay" &&
        point.validTime >= startAt - 2 * 3_600_000 &&
        point.validTime <= endAt + 2 * 3_600_000
    ),
    dateLocal,
    cutoffAt,
    {
      timezone: TIMEZONE,
      startHour: BACKTEST_CHART_START_HOUR,
      endHour: BACKTEST_CHART_END_HOUR,
      forecastModel,
    }
  );
  return marinaForecastKickInFromHourly(hourly, dateLocal, thresholdKnots);
}
