import { MARINA_LABEL_YEARS, summerSeasonRange } from "./analysisSeasons.js";
import { buildAnalogIndex } from "./analogKickIn.js";
import { inferAnalysisWindow } from "./modelSkillAnalysis.js";
import { fetchForecastExperimentWindow } from "./runModelSkillAnalysis.js";
import { resolveRideabilityThreshold } from "./rideabilityThresholds.js";
import { localDayWindowMs } from "./time.js";

const DEFAULT_LOCATION = "cascais-bay";
export const DEFAULT_ANALOG_TRAIN_YEARS = [2024];
const INDEX_CACHE_TTL_MS = 6 * 60 * 60_000;

/** @type {Map<string, { loadedAt: number, result: Awaited<ReturnType<typeof loadAnalogKickInIndexUncached>> }>} */
const indexCache = new Map();

function cacheKey({
  locationSlug = DEFAULT_LOCATION,
  trainYears = DEFAULT_ANALOG_TRAIN_YEARS,
  thresholdKnots,
  preset,
  cutoffHourLocal = 7,
} = {}) {
  return [locationSlug, trainYears.join(","), thresholdKnots, preset ?? "", cutoffHourLocal].join("|");
}

async function loadAnalogKickInIndexUncached(
  convex,
  {
    locationSlug = DEFAULT_LOCATION,
    trainYears = DEFAULT_ANALOG_TRAIN_YEARS,
    thresholdKnots,
    preset,
    cutoffHourLocal = 7,
  }
) {
  const resolvedThreshold = resolveRideabilityThreshold({ thresholdKnots, preset });
  const ranges = trainYears.map((year) => summerSeasonRange(year));
  const loadStart = localDayWindowMs(ranges[0].startDateLocal).startAt;
  const loadEnd = localDayWindowMs(ranges[ranges.length - 1].endDateLocal).endAt;

  const [marinaObservations, caboRasoObservations, guinchoObservations, forecastPoints] =
    await Promise.all([
      fetchForecastExperimentWindow(convex, {
        locationSlug,
        kind: "observations",
        startAt: loadStart,
        endAt: loadEnd,
      }),
      fetchForecastExperimentWindow(convex, {
        locationSlug: "cabo-raso",
        kind: "observations",
        startAt: loadStart,
        endAt: loadEnd,
      }),
      fetchForecastExperimentWindow(convex, {
        locationSlug: "guincho",
        kind: "observations",
        startAt: loadStart,
        endAt: loadEnd,
      }).catch(() => []),
      fetchForecastExperimentWindow(convex, {
        locationSlug,
        kind: "forecast",
        startAt: loadStart + 6 * 3_600_000,
        endAt: loadEnd,
      }),
    ]);

  const window = inferAnalysisWindow({ observations: marinaObservations, forecastPoints });
  if (!window) {
    return { ok: false, error: "No overlapping observation and forecast data for analog index" };
  }

  const trainDates = window.datesLocal.filter((dateLocal) =>
    trainYears.some(
      (year) =>
        dateLocal >= summerSeasonRange(year).startDateLocal &&
        dateLocal <= summerSeasonRange(year).endDateLocal
    )
  );

  const index = buildAnalogIndex({
    datesLocal: trainDates,
    forecastPoints,
    marinaObservations,
    caboRasoObservations,
    guinchoObservations,
    thresholdKnots: resolvedThreshold,
    preset,
    cutoffHourLocal,
    requireObservedLabels: true,
  });

  return {
    ok: true,
    index,
    trainYears,
    trainDayCount: index.length,
    marinaLabelYears: MARINA_LABEL_YEARS,
  };
}

/** Load marina-observed historical days for analog neighbor search (cached). */
export async function loadAnalogKickInIndex(
  convex,
  options = {}
) {
  const key = cacheKey(options);
  const cached = indexCache.get(key);
  if (cached && Date.now() - cached.loadedAt < INDEX_CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    const result = await loadAnalogKickInIndexUncached(convex, options);
    indexCache.set(key, { loadedAt: Date.now(), result });
    return result;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Analog index load failed",
      index: [],
    };
  }
}
