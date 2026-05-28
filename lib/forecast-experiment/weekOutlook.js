import { api } from "../../convex/_generated/api.js";
import { buildBayWindPredictionV3 } from "./bayWindPredictionMl.js";
import { loadBayWindMlModel } from "./loadBayWindMlModel.js";
import {
  DEFAULT_RIDEABILITY_PRESET,
  resolveRideabilityThreshold,
} from "./rideabilityThresholds.js";
import { addDays, localDateKey } from "./time.js";
import { hasMarinaChartForecast, peakMarinaForecastKnots } from "./dayWindChartData.js";
import { describeBayDay } from "./userFacingCopy.js";

const TARGET_SLUG = "cascais-bay";
const TIMEZONE = "Europe/Lisbon";
const FORECAST_HORIZON_MS = 36 * 60 * 60_000;

export async function buildWeekOutlook(convex, { days = 7, preset = DEFAULT_RIDEABILITY_PRESET } = {}) {
  const generatedAt = Date.now();
  const todayKey = localDateKey(generatedAt, TIMEZONE);
  const mlModel = loadBayWindMlModel();
  const thresholdKnots = resolveRideabilityThreshold({ preset });
  const dateLocals = Array.from({ length: days }, (_, index) => addDays(todayKey, index));

  const startAt = Date.parse(`${dateLocals[0]}T00:00:00Z`) - 2 * 3_600_000;
  const endAt =
    Date.parse(`${dateLocals[dateLocals.length - 1]}T00:00:00Z`) +
    24 * 3_600_000 +
    FORECAST_HORIZON_MS;

  const points = await convex.query(api.forecastExperiment.listRecentForecastPoints, {
    locationSlug: TARGET_SLUG,
    startAt,
    endAt,
  });

  const outlookDays = dateLocals.flatMap((forecastDateLocal) => {
    if (forecastDateLocal === todayKey) return [];
    if (!hasMarinaChartForecast(points, forecastDateLocal, generatedAt)) {
      return [];
    }

    const prediction = buildBayWindPredictionV3({
      targetLocationSlug: TARGET_SLUG,
      forecastDateLocal,
      generatedAt,
      points,
      caboRasoObservations: [],
      thresholdKnots,
      preset,
      model: mlModel,
      conservative: false,
      mode: "day-ahead",
    });

    const peakForecastKnots = peakMarinaForecastKnots(points, forecastDateLocal, generatedAt);

    return [
      {
        dateLocal: forecastDateLocal,
        hasChartForecast: true,
        ...describeBayDay(prediction, { referenceMs: generatedAt, peakForecastKnots }),
      },
    ];
  });

  return {
    ok: true,
    generatedAt,
    thresholdKnots,
    days: outlookDays,
  };
}
