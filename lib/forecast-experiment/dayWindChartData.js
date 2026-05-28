import { api } from "../../convex/_generated/api.js";
import {
  BACKTEST_CHART_END_HOUR,
  BACKTEST_CHART_START_HOUR,
  aggregateHourlyForecast,
  aggregateHourlyObservations,
  selectBestForecastPointsForChart,
} from "./backtest.js";
import { EXPERIMENT_DISPLAY_FORECAST_MODEL } from "./locations.js";
import { experimentDisplayForecastWindyLabel } from "./modelLabels.js";
import { ridingWindowBounds } from "./ridingWindow.js";
import { DEFAULT_RIDEABILITY_PRESET, resolveRideabilityThreshold } from "./rideabilityThresholds.js";
import { localDateKey, localDayWindowMs } from "./time.js";

const TIMEZONE = "Europe/Lisbon";

export async function buildDayWindChart(convex, dateLocal) {
  const generatedAt = Date.now();
  const todayKey = localDateKey(generatedAt, TIMEZONE);
  const { startAt, endAt } = localDayWindowMs(dateLocal, TIMEZONE);
  const cutoffAt =
    dateLocal === todayKey ? generatedAt : startAt + 7 * 3_600_000;

  const forecastPoints = await convex.query(api.forecastExperiment.listRecentForecastPoints, {
    locationSlug: "cascais-bay",
    startAt: startAt - 2 * 3_600_000,
    endAt: endAt + 2 * 3_600_000,
  });

  const caboObservations = await convex.query(api.forecastExperiment.listObservationsForWindow, {
    locationSlug: "cabo-raso",
    startAt: startAt - 2 * 3_600_000,
    endAt: endAt + 2 * 3_600_000,
  });

  const marinaForecast = aggregateHourlyForecast(forecastPoints, dateLocal, cutoffAt, {
    timezone: TIMEZONE,
    startHour: BACKTEST_CHART_START_HOUR,
    endHour: BACKTEST_CHART_END_HOUR,
    forecastModel: EXPERIMENT_DISPLAY_FORECAST_MODEL,
  });

  const caboObserved = aggregateHourlyObservations(caboObservations, dateLocal, {
    timezone: TIMEZONE,
    startHour: BACKTEST_CHART_START_HOUR,
    endHour: BACKTEST_CHART_END_HOUR,
  });

  const hasForecast = marinaForecast.some(
    (row) => Number.isFinite(row.windSpeedKnots) || Number.isFinite(row.windGustKnots)
  );

  return {
    ok: true,
    dateLocal,
    forecastModel: EXPERIMENT_DISPLAY_FORECAST_MODEL,
    forecastModelLabel: experimentDisplayForecastWindyLabel(),
    startHour: BACKTEST_CHART_START_HOUR,
    endHour: BACKTEST_CHART_END_HOUR,
    marinaForecast,
    caboObserved,
    hasForecast,
    showCabo: dateLocal === todayKey,
  };
}

export function marinaForecastHasData(forecastPoints, dateLocal, cutoffAt) {
  const { startAt } = localDayWindowMs(dateLocal, TIMEZONE);
  const windowStart = startAt + BACKTEST_CHART_START_HOUR * 3_600_000;
  const windowEnd = startAt + BACKTEST_CHART_END_HOUR * 3_600_000;
  const eligible = selectBestForecastPointsForChart(
    forecastPoints.filter(
      (point) => point.validTime >= windowStart && point.validTime <= windowEnd
    ),
    cutoffAt,
    EXPERIMENT_DISPLAY_FORECAST_MODEL
  );
  return eligible.length > 0;
}

/** True when ICON7 marina chart would have hourly bars for this day. */
export function hasMarinaChartForecast(forecastPoints, dateLocal, generatedAt = Date.now()) {
  const todayKey = localDateKey(generatedAt, TIMEZONE);
  const { startAt } = localDayWindowMs(dateLocal, TIMEZONE);
  const cutoffAt = dateLocal === todayKey ? generatedAt : startAt + 7 * 3_600_000;
  const inRange = forecastPoints.filter(
    (point) =>
      point.locationSlug === "cascais-bay" &&
      point.validTime >= startAt - 2 * 3_600_000 &&
      point.validTime <= startAt + 24 * 3_600_000 + 2 * 3_600_000
  );
  return marinaForecastHasData(inRange, dateLocal, cutoffAt);
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

/** Peak effective marina wind (ICON7) for a local day, riding hours only. */
export function peakMarinaForecastKnots(forecastPoints, dateLocal, generatedAt = Date.now()) {
  const todayKey = localDateKey(generatedAt, TIMEZONE);
  const { startAt, endAt } = localDayWindowMs(dateLocal, TIMEZONE);
  const cutoffAt = dateLocal === todayKey ? generatedAt : startAt + 7 * 3_600_000;
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
      forecastModel: EXPERIMENT_DISPLAY_FORECAST_MODEL,
    }
  );

  let peak = 0;
  for (const row of hourly) {
    const displayPeak = hourlyDisplayPeakKnots(row);
    if (Number.isFinite(displayPeak) && displayPeak > peak) peak = displayPeak;
  }
  return peak > 0 ? peak : undefined;
}

/** First riding-window hour where ICON7 marina max(speed,gust) crosses the ride threshold. */
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
  const todayKey = localDateKey(generatedAt, TIMEZONE);
  const { startAt, endAt } = localDayWindowMs(dateLocal, TIMEZONE);
  const cutoffAt = dateLocal === todayKey ? generatedAt : startAt + 7 * 3_600_000;
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
      forecastModel: EXPERIMENT_DISPLAY_FORECAST_MODEL,
    }
  );
  return marinaForecastKickInFromHourly(hourly, dateLocal, thresholdKnots);
}
