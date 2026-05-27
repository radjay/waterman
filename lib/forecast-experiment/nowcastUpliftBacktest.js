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
import { firstSustainedCrossing } from "./labels.js";
import { inferAnalysisWindow } from "./modelSkillAnalysis.js";
import { loadBayWindMlModel } from "./loadBayWindMlModel.js";
import { fetchForecastExperimentWindow } from "./runModelSkillAnalysis.js";
import { resolveRideabilityThreshold } from "./rideabilityThresholds.js";
import { localDayWindowMs } from "./time.js";

const DEFAULT_LOCATION = "cascais-bay";
const DEFAULT_TIMEZONE = "Europe/Lisbon";
export const DEFAULT_FORECAST_CUTOFF_HOUR = 7;
export const DEFAULT_NOWCAST_CUTOFF_HOUR = 11;
/** Cabo must sustain rideability before this Lisbon hour to qualify. */
export const DEFAULT_STRONG_CABO_BEFORE_HOUR = 12;

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
      model,
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
  }
) {
  if (!seasonHasMarinaLabels(seasonId)) {
    return {
      ok: false,
      error: `Season "${seasonId}" has no marina-validated labels (use 2024 or 2025)`,
    };
  }

  const season = resolveAnalysisSeason(seasonId);
  const resolvedThreshold = resolveRideabilityThreshold({ thresholdKnots, preset });
  const model = loadBayWindMlModel();

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

  const caboByDate = groupObservationsByDate(caboRasoObservations);

  const days = datesLocal.map((dateLocal) => {
    const comparison = compareForecastVsNowcastDay({
      dateLocal,
      marinaObservations,
      caboRasoObservations,
      forecastPoints,
      thresholdKnots: resolvedThreshold,
      preset,
      model,
      forecastCutoffHour,
      nowcastCutoffHour,
    });

    const qualifies =
      comparison.actual.labelStatus === "observed" &&
      comparison.actual.kickInAt != null &&
      hadStrongCaboBeforeHour({
        dateLocal,
        caboObservations: caboByDate.get(dateLocal) ?? [],
        thresholdKnots: resolvedThreshold,
        beforeHourLocal: strongCaboBeforeHour,
      });

    return { ...comparison, qualifies };
  });

  const summary = summarizeNowcastUplift(days);

  return {
    ok: true,
    locationSlug,
    seasonId: season.id,
    seasonLabel: season.label,
    hasMarinaLabels: true,
    thresholdKnots: resolvedThreshold,
    preset: preset ?? null,
    modelVersion: model.calibration ? "bay-wind-v3.5-ml" : "bay-wind-v3-ml",
    cutoffs: {
      forecastHourLocal: forecastCutoffHour,
      nowcastHourLocal: nowcastCutoffHour,
      strongCaboBeforeHourLocal: strongCaboBeforeHour,
    },
    window: {
      startDateLocal: window.startDateLocal,
      endDateLocal: window.endDateLocal,
      daysInRange: datesLocal.length,
    },
    summary,
    days: days.filter((day) => day.qualifies),
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
