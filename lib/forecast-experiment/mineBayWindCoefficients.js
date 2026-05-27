import { buildDailyLabel } from "./labels.js";
import { ANALYSIS_SEASONS, filterDatesToSeasonRanges } from "./analysisSeasons.js";
import {
  DEFAULT_BAY_WIND_COEFFICIENTS,
  DEFAULT_FORECAST_MODEL,
  hourBucket,
} from "./bayWindCoefficients.js";
import {
  inferAnalysisWindow,
  pairHourlyModelObs,
  WIND_REGIME_NORTADA,
} from "./modelSkillAnalysis.js";
import { resolveRideabilityThreshold } from "./rideabilityThresholds.js";
import { fetchForecastExperimentWindow } from "./runModelSkillAnalysis.js";
import { localDayWindowMs } from "./time.js";
import { normalizeObservationsForBacktest } from "./backtest.js";

const DEFAULT_TIMEZONE = "Europe/Lisbon";
const LAG_PEAK_BUCKETS = [
  { id: "0-16", minKnots: 0, maxKnots: 16 },
  { id: "16-20", minKnots: 16, maxKnots: 20 },
  { id: "20+", minKnots: 20, maxKnots: 999 },
];

function emptyBiasSamples() {
  return {
    nortada: { "6-11": [], "12-17": [], "18-21": [] },
    "non-nortada": { "6-11": [], "12-17": [], "18-21": [] },
  };
}

function emptyLagSamples() {
  return Object.fromEntries(LAG_PEAK_BUCKETS.map((bucket) => [bucket.id, []]));
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return undefined;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function roundBias(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 2) / 2;
}

function classifyLagPeakBucket(peakKnots) {
  for (const bucket of LAG_PEAK_BUCKETS) {
    if (peakKnots >= bucket.minKnots && peakKnots < bucket.maxKnots) return bucket.id;
  }
  return "20+";
}

function dayObservations(observations, dateLocal) {
  const { startAt, endAt } = localDayWindowMs(dateLocal, DEFAULT_TIMEZONE);
  return normalizeObservationsForBacktest(
    observations.filter((obs) => obs.observedAt >= startAt && obs.observedAt < endAt)
  );
}

function buildBiasTables(biasSamples) {
  const biasByRegimeHour = {};
  const sampleCounts = { biasByRegimeHour: {} };

  for (const [regime, buckets] of Object.entries(biasSamples)) {
    biasByRegimeHour[regime] = {};
    sampleCounts.biasByRegimeHour[regime] = {};
    for (const [bucket, samples] of Object.entries(buckets)) {
      sampleCounts.biasByRegimeHour[regime][bucket] = samples.length;
      biasByRegimeHour[regime][bucket] = roundBias(median(samples) ?? 0);
    }
  }

  return { biasByRegimeHour, sampleCounts };
}

function buildLagTables(lagSamples) {
  const lagMinutesByForecastPeak = LAG_PEAK_BUCKETS.map((bucket) => ({
    minKnots: bucket.minKnots,
    maxKnots: bucket.maxKnots,
    lagMinutes: Math.round(median(lagSamples[bucket.id]) ?? DEFAULT_BAY_WIND_COEFFICIENTS.lagMinutesByForecastPeak.find(
      (row) => row.minKnots === bucket.minKnots
    )?.lagMinutes ?? 90),
  }));

  const sampleCounts = Object.fromEntries(
    LAG_PEAK_BUCKETS.map((bucket) => [bucket.id, lagSamples[bucket.id].length])
  );

  return { lagMinutesByForecastPeak, sampleCounts };
}

/**
 * Mine bias and lag tables from paired marina/Cabo history in Convex.
 */
export async function mineBayWindCoefficients(
  convex,
  {
    locationSlug = "cascais-bay",
    seasonRanges = ANALYSIS_SEASONS.average.ranges,
    thresholdKnots,
    preset,
    forecastModel = DEFAULT_FORECAST_MODEL,
  } = {}
) {
  const resolvedThreshold = resolveRideabilityThreshold({ thresholdKnots, preset });
  let marinaObservations = [];
  let caboRasoObservations = [];
  let forecastPoints = [];

  for (const range of seasonRanges) {
    const { startAt } = localDayWindowMs(range.startDateLocal, DEFAULT_TIMEZONE);
    const { endAt } = localDayWindowMs(range.endDateLocal, DEFAULT_TIMEZONE);

    marinaObservations.push(
      ...(await fetchForecastExperimentWindow(convex, {
        locationSlug,
        kind: "observations",
        startAt,
        endAt,
      }))
    );

    caboRasoObservations.push(
      ...(await fetchForecastExperimentWindow(convex, {
        locationSlug: "cabo-raso",
        kind: "observations",
        startAt,
        endAt,
      }))
    );

    forecastPoints.push(
      ...(await fetchForecastExperimentWindow(convex, {
        locationSlug,
        kind: "forecast",
        startAt: startAt + 6 * 3_600_000,
        endAt,
      }))
    );
  }

  forecastPoints = forecastPoints.filter((point) => point.model === forecastModel);

  const window = inferAnalysisWindow({ observations: marinaObservations, forecastPoints });
  if (!window) {
    return {
      ok: false,
      error: "No overlapping observation and forecast data found",
      thresholdKnots: resolvedThreshold,
    };
  }

  const datesLocal = filterDatesToSeasonRanges(window.datesLocal, seasonRanges);
  const biasSamples = emptyBiasSamples();
  const lagSamples = emptyLagSamples();
  let lagDaysComparable = 0;

  for (const dateLocal of datesLocal) {
    const pairs = pairHourlyModelObs({
      dateLocal,
      observations: marinaObservations,
      forecastPoints,
      model: forecastModel,
    });

    for (const pair of pairs) {
      const regime = pair.regime === WIND_REGIME_NORTADA ? "nortada" : "non-nortada";
      const bucket = hourBucket(pair.observed.hourLocal);
      const delta = pair.observed.effectiveWindKnots - pair.forecast.effectiveWindKnots;
      biasSamples[regime][bucket].push(delta);
    }

    const dayMarinaObs = dayObservations(marinaObservations, dateLocal);
    const dayCaboObs = dayObservations(caboRasoObservations, dateLocal);
    const marinaLabel = buildDailyLabel({
      locationSlug,
      dateLocal,
      observations: dayMarinaObs,
      reports: [],
      thresholdKnots: resolvedThreshold,
    });
    const caboLabel = buildDailyLabel({
      locationSlug: "cabo-raso",
      dateLocal,
      observations: dayCaboObs,
      reports: [],
      thresholdKnots: resolvedThreshold,
    });

    if (marinaLabel.actualKickInAt && caboLabel.actualKickInAt) {
      const forecastPeak = pairs.reduce(
        (peak, pair) => Math.max(peak, pair.forecast.effectiveWindKnots ?? 0),
        0
      );
      const lagMinutes = (marinaLabel.actualKickInAt - caboLabel.actualKickInAt) / 60_000;
      if (Number.isFinite(lagMinutes) && lagMinutes >= 0 && lagMinutes <= 240) {
        lagDaysComparable += 1;
        lagSamples[classifyLagPeakBucket(forecastPeak)].push(lagMinutes);
      }
    }
  }

  const { biasByRegimeHour, sampleCounts: biasSampleCounts } = buildBiasTables(biasSamples);
  const { lagMinutesByForecastPeak, sampleCounts: lagSampleCounts } = buildLagTables(lagSamples);

  return {
    ok: true,
    thresholdKnots: resolvedThreshold,
    forecastModel,
    seasonRanges,
    window: {
      startDateLocal: window.startDateLocal,
      endDateLocal: window.endDateLocal,
      daysAnalyzed: datesLocal.length,
    },
    lagDaysComparable,
    sampleCounts: {
      biasByRegimeHour: biasSampleCounts.biasByRegimeHour,
      lagMinutesByForecastPeak: lagSampleCounts,
    },
    coefficients: {
      version: 1,
      forecastModel,
      thresholdKnots: resolvedThreshold,
      minedAt: new Date().toISOString(),
      biasByRegimeHour,
      lagMinutesByForecastPeak,
      sampleCounts: {
        biasByRegimeHour: biasSampleCounts.biasByRegimeHour,
        lagMinutesByForecastPeak: lagSampleCounts,
      },
    },
  };
}
