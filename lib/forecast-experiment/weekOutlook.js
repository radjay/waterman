import { api } from "../../convex/_generated/api.js";
import { loadAnalogKickInIndex } from "./analogKickInIndex.js";
import { buildDayAheadBayWindPrediction } from "./bayWindForecast.js";
import { loadBayWindMlModel } from "./loadBayWindMlModel.js";
import {
  DEFAULT_RIDEABILITY_PRESET,
  resolveRideabilityThreshold,
} from "./rideabilityThresholds.js";
import { addDays, localDateKey, localDayWindowMs } from "./time.js";
import {
  getDayForecastCoverage,
  hasFullMarinaChartForecast,
  peakMarinaForecastKnots,
} from "./dayWindChartData.js";
import { describeBayDay } from "./userFacingCopy.js";

const TARGET_SLUG = "cascais-bay";
const TIMEZONE = "Europe/Lisbon";
const FORECAST_HORIZON_MS = 36 * 60 * 60_000;
/** Scan this many local calendar days (including today); upcoming list skips today. */
export const OUTLOOK_SCAN_DAYS = 10;

export async function buildWeekOutlook(
  convex,
  { days = OUTLOOK_SCAN_DAYS, preset = DEFAULT_RIDEABILITY_PRESET } = {}
) {
  const generatedAt = Date.now();
  const todayKey = localDateKey(generatedAt, TIMEZONE);
  const mlModel = loadBayWindMlModel();
  const thresholdKnots = resolveRideabilityThreshold({ preset });
  const dateLocals = Array.from({ length: days }, (_, index) => addDays(todayKey, index));

  const { startAt: windowStartAt } = localDayWindowMs(dateLocals[0], TIMEZONE);
  const { endAt: windowEndAt } = localDayWindowMs(dateLocals[dateLocals.length - 1], TIMEZONE);
  const startAt = windowStartAt - 2 * 3_600_000;
  const endAt = windowEndAt + FORECAST_HORIZON_MS;

  const [analogLoad, points] = await Promise.all([
    loadAnalogKickInIndex(convex, { preset, thresholdKnots }),
    convex.query(api.forecastExperiment.listRecentForecastPoints, {
      locationSlug: TARGET_SLUG,
      startAt,
      endAt,
    }),
  ]);
  const analogIndex = analogLoad.ok ? analogLoad.index : [];

  const outlookDays = dateLocals.flatMap((forecastDateLocal) => {
    if (forecastDateLocal === todayKey) return [];
    if (!hasFullMarinaChartForecast(points, forecastDateLocal, generatedAt)) {
      return [];
    }

    const prediction = buildDayAheadBayWindPrediction({
      targetLocationSlug: TARGET_SLUG,
      forecastDateLocal,
      generatedAt,
      points,
      thresholdKnots,
      preset,
      model: mlModel,
      analogIndex,
    });

    const peakForecastKnots = peakMarinaForecastKnots(points, forecastDateLocal, generatedAt);
    const coverage = getDayForecastCoverage(points, forecastDateLocal, generatedAt);

    return [
      {
        dateLocal: forecastDateLocal,
        hasChartForecast: true,
        forecastModel: coverage?.model,
        ...describeBayDay(prediction, { referenceMs: generatedAt, peakForecastKnots }),
      },
    ];
  });

  return {
    ok: true,
    generatedAt,
    thresholdKnots,
    days: outlookDays,
    analogIndexLoaded: analogLoad.ok,
    analogTrainDayCount: analogLoad.ok ? analogLoad.trainDayCount : 0,
  };
}
