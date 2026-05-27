/**
 * Phase 5 verification — compare day-ahead Forecast vs same-day Nowcast on historical
 * days with early strong Cabo Raso (marina-validated kick-in labels).
 */

import {
  filterDatesToSeasonRanges,
  resolveAnalysisSeason,
  seasonHasMarinaLabels,
} from "./analysisSeasons.js";
import {
  BACKTEST_FORECAST_MODEL_ML,
  buildDayBacktest,
} from "./backtest.js";
import { buildBayWindPredictionV3 } from "./bayWindPredictionMl.js";
import { classifyDayRegime, REGIME_NORTADA } from "./dayRegimes.js";
import { firstSustainedCrossing } from "./labels.js";
import { inferAnalysisWindow } from "./modelSkillAnalysis.js";
import { loadBayWindMlModel, loadBayWindNowcastMlModel } from "./loadBayWindMlModel.js";
import { fetchForecastExperimentWindow } from "./runModelSkillAnalysis.js";
import { resolveRideabilityThreshold } from "./rideabilityThresholds.js";
import { localDayWindowMs } from "./time.js";

const DEFAULT_LOCATION = "cascais-bay";
const DEFAULT_TIMEZONE = "Europe/Lisbon";
export const DEFAULT_FORECAST_CUTOFF_HOUR = 7;
export const DEFAULT_NOWCAST_CUTOFF_HOUR = 12;
/** Hours to try when sweeping for best same-day nowcast cutoff. */
export const NOWCAST_CUTOFF_CANDIDATES = [9, 10, 11, 12, 13];
/** Cabo must sustain rideability before this Lisbon hour to qualify. */
export const DEFAULT_STRONG_CABO_BEFORE_HOUR = 12;

export const REGIME_FILTER_ALL = "all";
export const REGIME_FILTER_NORTADA = "nortada";

export function hadStrongCaboBeforeHour({
  dateLocal,
  caboObservations,
  thresholdKnots,
  beforeHourLocal = DEFAULT_STRONG_CABO_BEFORE_HOUR,
  timezone = DEFAULT_TIMEZONE,
}) {
  const { startAt } = localDayWindowMs(dateLocal, timezone);
  const cutoffAt = startAt + beforeHourLocal * 3_600_000;
  const earlyCabo = (caboObservations ?? []).filter((obs) => obs.observedAt < cutoffAt);
  return !!firstSustainedCrossing(earlyCabo, thresholdKnots);
}

export function computeUpliftMinutes(forecastErrorMinutes, nowcastErrorMinutes) {
  if (!Number.isFinite(forecastErrorMinutes) || !Number.isFinite(nowcastErrorMinutes)) {
    return null;
  }
  return forecastErrorMinutes - nowcastErrorMinutes;
}

export function compareForecastVsNowcastDay({
  dateLocal,
  marinaObservations,
  caboRasoObservations,
  forecastPoints,
  thresholdKnots,
  preset,
  model,
  nowcastModel = model,
  forecastCutoffHour = DEFAULT_FORECAST_CUTOFF_HOUR,
  nowcastCutoffHour = DEFAULT_NOWCAST_CUTOFF_HOUR,
  timezone = DEFAULT_TIMEZONE,
}) {
  const common = {
    dateLocal,
    marinaObservations,
    caboRasoObservations,
    forecastPoints,
    thresholdKnots,
    preset,
    timezone,
    forecastModel: BACKTEST_FORECAST_MODEL_ML,
    buildPrediction: buildBayWindPredictionV3,
  };

  const forecastDay = buildDayBacktest({
    ...common,
    predictionCutoffHourLocal: forecastCutoffHour,
    predictionOptions: {
      model,
      mode: "day-ahead",
      conservative: true,
      cutoffHourLocal: forecastCutoffHour,
    },
  });

  const nowcastDay = buildDayBacktest({
    ...common,
    predictionCutoffHourLocal: nowcastCutoffHour,
    predictionOptions: {
      model: nowcastModel,
      mode: "nowcast",
      conservative: false,
      cutoffHourLocal: nowcastCutoffHour,
    },
  });

  const upliftMinutes = computeUpliftMinutes(
    forecastDay.errorMinutes,
    nowcastDay.errorMinutes
  );

  return {
    dateLocal,
    actual: forecastDay.actual,
    forecast: forecastDay.predicted,
    nowcast: nowcastDay.predicted,
    forecastErrorMinutes: forecastDay.errorMinutes,
    nowcastErrorMinutes: nowcastDay.errorMinutes,
    upliftMinutes,
    nowcastImproved:
      Number.isFinite(upliftMinutes) && upliftMinutes > 0,
    hasForecastData: forecastDay.hasForecastData && nowcastDay.hasForecastData,
  };
}

export function summarizeNowcastUplift(days, { minMeanUpliftMinutes = 15, minImprovedShare = 0.5 } = {}) {
  const qualifying = days.filter((day) => day.qualifies);
  const comparable = qualifying.filter(
    (day) =>
      day.hasForecastData &&
      day.actual?.kickInAt != null &&
      day.forecast?.kickInP50At != null &&
      day.nowcast?.kickInP50At != null
  );

  const uplifts = comparable
    .map((day) => day.upliftMinutes)
    .filter(Number.isFinite);
  const forecastErrors = comparable
    .map((day) => day.forecastErrorMinutes)
    .filter(Number.isFinite);
  const nowcastErrors = comparable
    .map((day) => day.nowcastErrorMinutes)
    .filter(Number.isFinite);

  const mean = (values) =>
    values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;

  const improvedCount = comparable.filter((day) => day.nowcastImproved).length;
  const improvedShare =
    comparable.length > 0 ? improvedCount / comparable.length : null;
  const meanUpliftMinutes = mean(uplifts);

  const passesVerification =
    comparable.length >= 5 &&
    meanUpliftMinutes != null &&
    meanUpliftMinutes >= minMeanUpliftMinutes &&
    improvedShare != null &&
    improvedShare >= minImprovedShare;

  return {
    qualifyingDayCount: qualifying.length,
    comparableDayCount: comparable.length,
    improvedCount,
    improvedShare: improvedShare != null ? round3(improvedShare) : null,
    meanForecastErrorMinutes: mean(forecastErrors),
    meanNowcastErrorMinutes: mean(nowcastErrors),
    meanUpliftMinutes,
    medianUpliftMinutes: median(uplifts),
    passesVerification,
    acceptance: {
      minMeanUpliftMinutes,
      minImprovedShare,
    },
  };
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export function classifyUpliftDayRegime({ dateLocal, actual, caboObservations, thresholdKnots }) {
  return classifyDayRegime({
    label: {
      dateLocal,
      actualKickInAt: actual?.kickInAt ?? null,
    },
    caboObservations,
    thresholdKnots,
  });
}

export function dayQualifiesForUplift({
  comparison,
  dateLocal,
  caboObservations,
  thresholdKnots,
  strongCaboBeforeHour = DEFAULT_STRONG_CABO_BEFORE_HOUR,
  regimeFilter = REGIME_FILTER_ALL,
}) {
  const baseQualifies =
    comparison.actual.labelStatus === "observed" &&
    comparison.actual.kickInAt != null &&
    hadStrongCaboBeforeHour({
      dateLocal,
      caboObservations,
      thresholdKnots,
      beforeHourLocal: strongCaboBeforeHour,
    });

  if (!baseQualifies) return false;
  if (regimeFilter === REGIME_FILTER_NORTADA) {
    const regime = classifyUpliftDayRegime({
      dateLocal,
      actual: comparison.actual,
      caboObservations,
      thresholdKnots,
    });
    return regime === REGIME_NORTADA;
  }
  return true;
}

export async function loadNowcastUpliftSeasonData(
  convex,
  { locationSlug = DEFAULT_LOCATION, seasonId }
) {
  if (!seasonHasMarinaLabels(seasonId)) {
    return {
      ok: false,
      error: `Season "${seasonId}" has no marina-validated labels (use 2024 or 2025)`,
    };
  }

  const season = resolveAnalysisSeason(seasonId);
  let marinaObservations = [];
  let caboRasoObservations = [];
  let forecastPoints = [];

  for (const range of season.ranges) {
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
        startAt: startAt + 6 * 3_600_000,
        endAt,
      }))
    );
  }

  const window = inferAnalysisWindow({ observations: marinaObservations, forecastPoints });
  if (!window) {
    return { ok: false, error: "No overlapping observation and forecast data found" };
  }

  const datesLocal = filterDatesToSeasonRanges(window.datesLocal, season.ranges);
  if (datesLocal.length === 0) {
    return { ok: false, error: "No dates in season overlap window" };
  }

  return {
    ok: true,
    season,
    locationSlug,
    marinaObservations,
    caboRasoObservations,
    forecastPoints,
    datesLocal,
    window,
    caboByDate: groupObservationsByDate(caboRasoObservations),
  };
}

export function buildNowcastUpliftDays({
  datesLocal,
  marinaObservations,
  caboRasoObservations,
  forecastPoints,
  caboByDate,
  thresholdKnots,
  preset,
  model,
  nowcastModel = model,
  forecastCutoffHour = DEFAULT_FORECAST_CUTOFF_HOUR,
  nowcastCutoffHour = DEFAULT_NOWCAST_CUTOFF_HOUR,
  strongCaboBeforeHour = DEFAULT_STRONG_CABO_BEFORE_HOUR,
  regimeFilter = REGIME_FILTER_ALL,
}) {
  return datesLocal.map((dateLocal) => {
    const comparison = compareForecastVsNowcastDay({
      dateLocal,
      marinaObservations,
      caboRasoObservations,
      forecastPoints,
      thresholdKnots,
      preset,
      model,
      nowcastModel,
      forecastCutoffHour,
      nowcastCutoffHour,
    });

    const caboObservations = caboByDate.get(dateLocal) ?? [];
    const regime = classifyUpliftDayRegime({
      dateLocal,
      actual: comparison.actual,
      caboObservations,
      thresholdKnots,
    });

    const qualifies = dayQualifiesForUplift({
      comparison,
      dateLocal,
      caboObservations,
      thresholdKnots,
      strongCaboBeforeHour,
      regimeFilter,
    });

    return { ...comparison, qualifies, regime };
  });
}

export function sweepNowcastCutoffHours(
  seasonData,
  {
    thresholdKnots,
    preset,
    model,
    nowcastModel = model,
    forecastCutoffHour = DEFAULT_FORECAST_CUTOFF_HOUR,
    cutoffCandidates = NOWCAST_CUTOFF_CANDIDATES,
    strongCaboBeforeHour = DEFAULT_STRONG_CABO_BEFORE_HOUR,
    regimeFilter = REGIME_FILTER_ALL,
  }
) {
  return cutoffCandidates.map((nowcastCutoffHour) => {
    const days = buildNowcastUpliftDays({
      ...seasonData,
      thresholdKnots,
      preset,
      model,
      nowcastModel,
      forecastCutoffHour,
      nowcastCutoffHour,
      strongCaboBeforeHour,
      regimeFilter,
    });
    return {
      nowcastCutoffHour,
      summary: summarizeNowcastUplift(days),
    };
  });
}

export function pickBestNowcastCutoff(sweepResults) {
  const ranked = [...sweepResults].sort((a, b) => {
    const upliftA = a.summary.meanUpliftMinutes ?? -Infinity;
    const upliftB = b.summary.meanUpliftMinutes ?? -Infinity;
    if (upliftB !== upliftA) return upliftB - upliftA;
    const shareA = a.summary.improvedShare ?? 0;
    const shareB = b.summary.improvedShare ?? 0;
    return shareB - shareA;
  });
  return ranked[0] ?? null;
}

export async function runNowcastUpliftBacktest(
  convex,
  {
    locationSlug = DEFAULT_LOCATION,
    seasonId,
    thresholdKnots,
    preset,
    forecastCutoffHour = DEFAULT_FORECAST_CUTOFF_HOUR,
    nowcastCutoffHour = DEFAULT_NOWCAST_CUTOFF_HOUR,
    strongCaboBeforeHour = DEFAULT_STRONG_CABO_BEFORE_HOUR,
    regimeFilter = REGIME_FILTER_ALL,
    nowcastModel,
  }
) {
  const loaded = await loadNowcastUpliftSeasonData(convex, { locationSlug, seasonId });
  if (!loaded.ok) return loaded;

  const resolvedThreshold = resolveRideabilityThreshold({ thresholdKnots, preset });
  const model = loadBayWindMlModel();
  const effectiveNowcastModel = nowcastModel ?? loadBayWindNowcastMlModel();

  const days = buildNowcastUpliftDays({
    datesLocal: loaded.datesLocal,
    marinaObservations: loaded.marinaObservations,
    caboRasoObservations: loaded.caboRasoObservations,
    forecastPoints: loaded.forecastPoints,
    caboByDate: loaded.caboByDate,
    thresholdKnots: resolvedThreshold,
    preset,
    model,
    nowcastModel: effectiveNowcastModel,
    forecastCutoffHour,
    nowcastCutoffHour,
    strongCaboBeforeHour,
    regimeFilter,
  });

  const summary = summarizeNowcastUplift(days);

  return {
    ok: true,
    locationSlug,
    seasonId: loaded.season.id,
    seasonLabel: loaded.season.label,
    hasMarinaLabels: true,
    thresholdKnots: resolvedThreshold,
    preset: preset ?? null,
    modelVersion: model.calibration ? "bay-wind-v3.5-ml" : "bay-wind-v3-ml",
    nowcastModelVersion:
      effectiveNowcastModel.modelVersion ??
      (effectiveNowcastModel.calibration ? "bay-wind-v3.5-ml-nowcast" : "bay-wind-v3-ml-nowcast"),
    regimeFilter,
    cutoffs: {
      forecastHourLocal: forecastCutoffHour,
      nowcastHourLocal: nowcastCutoffHour,
      strongCaboBeforeHourLocal: strongCaboBeforeHour,
    },
    window: {
      startDateLocal: loaded.window.startDateLocal,
      endDateLocal: loaded.window.endDateLocal,
      daysInRange: loaded.datesLocal.length,
    },
    summary,
    days: days.filter((day) => day.qualifies),
  };
}

export async function runNowcastCutoffSweep(
  convex,
  options
) {
  const loaded = await loadNowcastUpliftSeasonData(convex, {
    locationSlug: options.locationSlug,
    seasonId: options.seasonId,
  });
  if (!loaded.ok) return loaded;

  const resolvedThreshold = resolveRideabilityThreshold({
    thresholdKnots: options.thresholdKnots,
    preset: options.preset,
  });
  const model = loadBayWindMlModel();
  const nowcastModel = options.nowcastModel ?? loadBayWindNowcastMlModel();

  const sweep = sweepNowcastCutoffHours(
    {
      datesLocal: loaded.datesLocal,
      marinaObservations: loaded.marinaObservations,
      caboRasoObservations: loaded.caboRasoObservations,
      forecastPoints: loaded.forecastPoints,
      caboByDate: loaded.caboByDate,
    },
    {
      thresholdKnots: resolvedThreshold,
      preset: options.preset,
      model,
      nowcastModel,
      forecastCutoffHour: options.forecastCutoffHour ?? DEFAULT_FORECAST_CUTOFF_HOUR,
      cutoffCandidates: options.cutoffCandidates ?? NOWCAST_CUTOFF_CANDIDATES,
      strongCaboBeforeHour: options.strongCaboBeforeHour ?? DEFAULT_STRONG_CABO_BEFORE_HOUR,
      regimeFilter: options.regimeFilter ?? REGIME_FILTER_ALL,
    }
  );

  const best = pickBestNowcastCutoff(sweep);

  return {
    ok: true,
    seasonId: loaded.season.id,
    seasonLabel: loaded.season.label,
    thresholdKnots: resolvedThreshold,
    regimeFilter: options.regimeFilter ?? REGIME_FILTER_ALL,
    sweep,
    best,
  };
}

function groupObservationsByDate(observations) {
  const byDate = new Map();
  for (const obs of observations) {
    const dateLocal = new Date(obs.observedAt).toLocaleDateString("en-CA", {
      timeZone: DEFAULT_TIMEZONE,
    });
    if (!byDate.has(dateLocal)) byDate.set(dateLocal, []);
    byDate.get(dateLocal).push(obs);
  }
  return byDate;
}
