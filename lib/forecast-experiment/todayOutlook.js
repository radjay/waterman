import { api } from "../../convex/_generated/api.js";
import { buildNowcastBayWindPrediction } from "./bayWindForecast.js";
import {
  loadBayWindMlModel,
  loadBayWindNowcastMlModel,
} from "./loadBayWindMlModel.js";
import { peakMarinaForecastKnots } from "./dayWindChartData.js";
import { resolveKickInHistory } from "./predictionFields.js";
import {
  DEFAULT_RIDEABILITY_PRESET,
  resolveRideabilityThreshold,
} from "./rideabilityThresholds.js";
import { localDateKey, localDayWindowMs } from "./time.js";
import { describeBayDay } from "./userFacingCopy.js";

const TARGET_SLUG = "cascais-bay";
const TIMEZONE = "Europe/Lisbon";
const FORECAST_HORIZON_MS = 36 * 60 * 60_000;

/** Live same-day outlook: fresh nowcast from forecast features + station observations. */
export async function buildTodayOutlook(convex, { preset = DEFAULT_RIDEABILITY_PRESET } = {}) {
  const generatedAt = Date.now();
  const todayKey = localDateKey(generatedAt, TIMEZONE);
  const thresholdKnots = resolveRideabilityThreshold({ preset });
  const { startAt, endAt } = localDayWindowMs(todayKey, TIMEZONE);

  const [points, caboObservations, storedPredictions] = await Promise.all([
    convex.query(api.forecastExperiment.listRecentForecastPoints, {
      locationSlug: TARGET_SLUG,
      startAt: startAt - 2 * 3_600_000,
      endAt: endAt + 2 * 3_600_000 + FORECAST_HORIZON_MS,
    }),
    convex.query(api.forecastExperiment.listObservationsForWindow, {
      locationSlug: "cabo-raso",
      startAt: startAt - 2 * 3_600_000,
      endAt: endAt + 2 * 3_600_000,
    }),
    convex.query(api.forecastExperiment.listPredictionsForWindow, {
      targetLocationSlug: TARGET_SLUG,
      startDateLocal: todayKey,
      endDateLocal: todayKey,
    }),
  ]);

  const latestCabo =
    [...caboObservations].sort((a, b) => b.observedAt - a.observedAt)[0] ?? null;

  const prediction = buildNowcastBayWindPrediction({
    targetLocationSlug: TARGET_SLUG,
    forecastDateLocal: todayKey,
    generatedAt,
    points,
    caboRasoObservations: caboObservations,
    thresholdKnots,
    preset,
    model: loadBayWindMlModel(),
    nowcastModel: loadBayWindNowcastMlModel(),
  });

  const peakForecastKnots = peakMarinaForecastKnots(points, todayKey, generatedAt);

  const today = describeBayDay(prediction, {
    isLive: true,
    referenceMs: generatedAt,
    caboObservation: latestCabo,
    peakForecastKnots,
  });

  const kickInHistory = resolveKickInHistory({
    liveKickInMs: today.kickInAtMs,
    storedPredictions,
    dateLocal: todayKey,
  });

  return {
    ok: true,
    generatedAt,
    thresholdKnots,
    today: {
      ...today,
      ...kickInHistory,
    },
    latestCaboRaso: latestCabo,
  };
}
