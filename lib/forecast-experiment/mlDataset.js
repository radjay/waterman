import { buildDailyLabel } from "./labels.js";
import { filterDatesToSeasonRanges } from "./analysisSeasons.js";
import { normalizeObservationsForBacktest, selectForecastPointsForBacktest } from "./backtest.js";
import {
  ML_FEATURE_NAMES,
  ML_FORECAST_MODELS,
  buildMlFeatureVector,
} from "./mlFeatures.js";
import { inferAnalysisWindow } from "./modelSkillAnalysis.js";
import { resolveRideabilityThreshold } from "./rideabilityThresholds.js";
import { fetchForecastExperimentWindow } from "./runModelSkillAnalysis.js";
import { localDayWindowMs, localDateKey } from "./time.js";
import { effectiveWindKnots, isUsableForecastPoint } from "./units.js";

const DEFAULT_TIMEZONE = "Europe/Lisbon";
const DEFAULT_CUTOFF_HOUR = 7;
const FEATURE_HOUR_START = 6;
const FEATURE_HOUR_END = 21;

export { ML_FEATURE_NAMES, ML_FORECAST_MODELS, buildMlFeatureVector } from "./mlFeatures.js";
function kickInMinutesFromLabel(label, dateLocal) {
  if (label.labelStatus !== "observed" && label.labelStatus !== "lag-inferred" && label.labelStatus !== "report-assisted") {
    return null;
  }
  if (label.actualKickInAt == null) return null;
  const { startAt } = localDayWindowMs(dateLocal, DEFAULT_TIMEZONE);
  return Math.round((label.actualKickInAt - startAt) / 60_000);
}

function hourlyRideableLabels(marinaObservations, dateLocal, thresholdKnots) {
  const { startAt } = localDayWindowMs(dateLocal, DEFAULT_TIMEZONE);
  const labels = {};
  for (let hour = FEATURE_HOUR_START; hour <= FEATURE_HOUR_END; hour += 1) {
    const validTime = startAt + hour * 3_600_000;
    const hourEnd = validTime + 3_600_000;
    const inHour = marinaObservations.filter(
      (obs) => obs.observedAt >= validTime && obs.observedAt < hourEnd
    );
    const maxEffective = inHour.reduce((peak, obs) => {
      const value = effectiveWindKnots(obs);
      return Number.isFinite(value) && value > peak ? value : peak;
    }, 0);
    labels[`h${hour}Rideable`] = maxEffective >= thresholdKnots ? 1 : 0;
  }
  return labels;
}

export function buildMlTrainingRow({
  dateLocal,
  forecastPoints,
  marinaObservations,
  caboRasoObservations,
  thresholdKnots,
  preset,
  cutoffHourLocal = DEFAULT_CUTOFF_HOUR,
  nowcastMode = false,   // Phase 5 5.6: when true, use latest Cabo obs (dynamic) instead of fixed cutoff
}) {
  const resolvedThreshold = resolveRideabilityThreshold({ thresholdKnots, preset });
  const { startAt, endAt } = localDayWindowMs(dateLocal, DEFAULT_TIMEZONE);
  const paddedStart = startAt - 2 * 3_600_000;
  const paddedEnd = endAt + 2 * 3_600_000;

  const dayMarinaObs = normalizeObservationsForBacktest(
    marinaObservations.filter((obs) => obs.observedAt >= paddedStart && obs.observedAt <= paddedEnd)
  );
  const dayCaboObs = normalizeObservationsForBacktest(
    caboRasoObservations.filter((obs) => obs.observedAt >= paddedStart && obs.observedAt <= paddedEnd)
  );

  const forecastWindowStart = startAt + FEATURE_HOUR_START * 3_600_000;
  const forecastWindowEnd = startAt + FEATURE_HOUR_END * 3_600_000;
  const dayForecastPoints = forecastPoints.filter(
    (point) => point.validTime >= forecastWindowStart && point.validTime <= forecastWindowEnd
  );

  const label = buildDailyLabel({
    locationSlug: "cascais-bay",
    dateLocal,
    observations: dayMarinaObs.filter((obs) => obs.observedAt >= startAt && obs.observedAt < endAt),
    reports: [],
    caboRasoObservations: dayCaboObs.filter((obs) => obs.observedAt >= startAt && obs.observedAt < endAt),
    thresholdKnots: resolvedThreshold,
  });

  const features = buildMlFeatureVector({
    dateLocal,
    forecastPoints: dayForecastPoints,
    caboRasoObservations: dayCaboObs,
    thresholdKnots: resolvedThreshold,
    cutoffHourLocal,
    nowcastMode,   // Phase 5 5.6: enables dynamic Cabo (latest obs) for nowcast-style training rows
  });

  const actualKickInMinutes = kickInMinutesFromLabel(label, dateLocal);
  const hourlyRideable = hourlyRideableLabels(
    dayMarinaObs.filter((obs) => obs.observedAt >= startAt && obs.observedAt < endAt),
    dateLocal,
    resolvedThreshold
  );

  const cutoffAt = startAt + cutoffHourLocal * 3_600_000;
  const eligibleCount = selectForecastPointsForBacktest(dayForecastPoints, cutoffAt).filter(
    (point) => ML_FORECAST_MODELS.includes(point.model) && isUsableForecastPoint(point)
  ).length;

  return {
    dateLocal,
    summerYear: Number(dateLocal.slice(0, 4)),
    thresholdKnots: resolvedThreshold,
    preset: preset ?? null,
    cutoffHourLocal,
    nowcastMode,   // Phase 5 5.6: true for dynamic-Cabo / same-day training rows
    features: Object.fromEntries(ML_FEATURE_NAMES.map((name, index) => [name, features[index]])),
    featureVector: features,
    actualKickInMinutes,
    labelStatus: label.labelStatus,
    hourlyRideable,
    hasForecastData: eligibleCount > 0,
    sourceSummary: label.sourceSummary,
  };
}

export function buildMlDatasetRows({
  datesLocal,
  marinaObservations,
  caboRasoObservations,
  forecastPoints,
  thresholdKnots,
  preset,
  thresholdPresets,
  nowcast = false,   // Phase 5 5.6: when true, use later cutoff + nowcastMode for dynamic-Cabo rows
}) {
  const presets =
    thresholdPresets ??
    (preset != null || Number.isFinite(thresholdKnots)
      ? [{ preset, thresholdKnots }]
      : [{ preset: "wingfoil-light" }]);

  // Phase 5 5.6: for nowcast-style rows we use a later cutoff (midday) so the model sees
  // more developed Cabo conditions — simulating same-day tightening training data.
  const effectiveCutoff = nowcast ? 12 : DEFAULT_CUTOFF_HOUR;

  const rows = [];
  for (const dateLocal of datesLocal) {
    for (const thresholdConfig of presets) {
      const row = buildMlTrainingRow({
        dateLocal,
        forecastPoints,
        marinaObservations,
        caboRasoObservations,
        thresholdKnots: thresholdConfig.thresholdKnots,
        preset: thresholdConfig.preset,
        cutoffHourLocal: effectiveCutoff,
        nowcastMode: nowcast,
      });
      if (row.hasForecastData) rows.push(row);
    }
  }
  return rows;
}

export async function exportMlDatasetFromConvex(
  convex,
  {
    locationSlug = "cascais-bay",
    seasonRanges,
    thresholdKnots,
    preset,
    thresholdPresets,
    nowcast = false,   // Phase 5 5.6: emit nowcast-style (dynamic Cabo) training rows
  }
) {
  let marinaObservations = [];
  let caboRasoObservations = [];
  let forecastPoints = [];

  for (const range of seasonRanges) {
    const { startAt } = localDayWindowMs(range.startDateLocal);
    const { endAt } = localDayWindowMs(range.endDateLocal);

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
        startAt: startAt + FEATURE_HOUR_START * 3_600_000,
        endAt,
      }))
    );
  }

  const window = inferAnalysisWindow({ observations: marinaObservations, forecastPoints });
  if (!window) {
    return { ok: false, error: "No overlapping observation and forecast data found" };
  }

  const datesLocal = filterDatesToSeasonRanges(window.datesLocal, seasonRanges);
  if (datesLocal.length === 0) {
    return { ok: false, error: "No dates in season overlap window" };
  }

  const rows = buildMlDatasetRows({
    datesLocal,
    marinaObservations,
    caboRasoObservations,
    forecastPoints,
    thresholdKnots,
    preset,
    thresholdPresets,
    nowcast,   // Phase 5 5.6
  });

  const bySummerYear = new Map();
  for (const row of rows) {
    const year = String(row.summerYear);
    if (!bySummerYear.has(year)) bySummerYear.set(year, []);
    bySummerYear.get(year).push(row);
  }

  return {
    ok: true,
    window: {
      startDateLocal: window.startDateLocal,
      endDateLocal: window.endDateLocal,
      daysInRange: datesLocal.length,
    },
    featureNames: ML_FEATURE_NAMES,
    rows,
    bySummerYear: Object.fromEntries(bySummerYear),
    rowCount: rows.length,
    labeledKickInCount: rows.filter((row) => row.actualKickInMinutes != null).length,
  };
}

export function summerYearFromDateLocal(dateLocal) {
  return localDateKey(localDayWindowMs(dateLocal).startAt).slice(0, 4);
}
