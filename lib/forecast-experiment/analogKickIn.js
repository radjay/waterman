import { buildDailyLabel, normalizeObservationsForBacktest } from "./labels.js";
import { selectForecastPointsForBacktest } from "./backtest.js";
import { classifyDayRegime, REGIME_FLAT } from "./dayRegimes.js";
import {
  ML_FORECAST_MODELS,
  ML_MODEL_SHORT_NAMES,
  resolveMlForecastModel,
} from "./mlFeatures.js";
import { resolveKickInInRidingWindow, ridingWindowBounds, RIDING_WINDOW_END_HOUR, RIDING_WINDOW_START_HOUR } from "./ridingWindow.js";
import { resolveRideabilityThreshold } from "./rideabilityThresholds.js";
import { localDayWindowMs } from "./time.js";
import { effectiveWindKnots, isUsableForecastPoint } from "./units.js";

export const ANALOG_MODEL_VERSION = "bay-wind-analog-v1";

const DEFAULT_TIMEZONE = "Europe/Lisbon";
const DEFAULT_CUTOFF_HOUR = 7;
const CURVE_HOUR_START = 8;
const CURVE_HOUR_END = 20;

/** Per-hour weights for curve distance (ICON7 primary). */
const MODEL_WEIGHTS = {
  icon7: 2,
  icon13: 1,
  gfs: 0.5,
};

const DEFAULT_K = 12;
const DEFAULT_SESSION_THRESHOLD = 0.6;
const RIDING_START_MINUTES = RIDING_WINDOW_START_HOUR * 60;
const RIDING_END_MINUTES = RIDING_WINDOW_END_HOUR * 60;

function clampRidingMinutes(minutes) {
  if (minutes == null) return null;
  return Math.min(RIDING_END_MINUTES, Math.max(RIDING_START_MINUTES, Math.round(minutes)));
}
const REGIME_MISMATCH_PENALTY = 1.35;
const MONTH_MISMATCH_PENALTY = 1.15;

function monthFromDateLocal(dateLocal) {
  return Number(dateLocal?.slice(5, 7));
}

function mean(values) {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return undefined;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function quantile(values, q) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return undefined;
  const index = (sorted.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/** Multi-model hourly effective wind (8am–8pm) for curve matching. */
export function buildForecastCurveVector(forecastPoints, dateLocal, cutoffAt) {
  const eligible = selectForecastPointsForBacktest(forecastPoints, cutoffAt).filter(isUsableForecastPoint);
  const { startAt } = localDayWindowMs(dateLocal, DEFAULT_TIMEZONE);
  const byModelHour = new Map();

  for (const point of eligible) {
    const mlModel = resolveMlForecastModel(point.model);
    if (!ML_FORECAST_MODELS.includes(mlModel)) continue;
    const hourLocal = Math.round((point.validTime - startAt) / 3_600_000);
    if (hourLocal < CURVE_HOUR_START || hourLocal > CURVE_HOUR_END) continue;
    const key = `${ML_MODEL_SHORT_NAMES[mlModel]}:${hourLocal}`;
    if (!byModelHour.has(key)) byModelHour.set(key, []);
    byModelHour.get(key).push(effectiveWindKnots(point));
  }

  const values = [];
  for (let hour = CURVE_HOUR_START; hour <= CURVE_HOUR_END; hour += 1) {
    for (const short of ["icon7", "icon13", "gfs"]) {
      const rows = byModelHour.get(`${short}:${hour}`) ?? [];
      const effective =
        rows.length > 0
          ? rows.filter(Number.isFinite).reduce((sum, value) => sum + value, 0) / rows.length
          : 0;
      values.push(Math.round(effective * 10) / 10);
    }
  }
  return values;
}

export function hasForecastCurve(curveVector) {
  return curveVector.some((value) => value > 0);
}

/** Lightweight forecast-only regime for neighbor matching at inference time. */
export function estimateRegimeFromForecastCurve(curveVector) {
  const hourCount = CURVE_HOUR_END - CURVE_HOUR_START + 1;
  const icon7 = [];
  for (let index = 0; index < hourCount; index += 1) {
    icon7.push(curveVector[index * 3]);
  }
  const morning = mean(icon7.slice(0, 4));
  const afternoon = mean(icon7.slice(6));
  const peak = Math.max(...icon7);

  if (peak < 9) return REGIME_FLAT;
  if (afternoon >= 14 && morning < 10) return "sea-breeze";
  if (morning >= 12 || afternoon >= 18) return "nortada";
  return "other";
}

export function weightedCurveDistance(targetVector, candidateVector, { targetRegime, candidateRegime, targetMonth, candidateMonth } = {}) {
  if (targetVector.length !== candidateVector.length) return Number.POSITIVE_INFINITY;
  let weightedSum = 0;
  let weightTotal = 0;
  const hourCount = CURVE_HOUR_END - CURVE_HOUR_START + 1;

  for (let hourIndex = 0; hourIndex < hourCount; hourIndex += 1) {
    for (let modelIndex = 0; modelIndex < 3; modelIndex += 1) {
      const weight = modelIndex === 0 ? MODEL_WEIGHTS.icon7 : modelIndex === 1 ? MODEL_WEIGHTS.icon13 : MODEL_WEIGHTS.gfs;
      const index = hourIndex * 3 + modelIndex;
      const delta = targetVector[index] - candidateVector[index];
      weightedSum += weight * delta * delta;
      weightTotal += weight;
    }
  }

  let distance = Math.sqrt(weightedSum / weightTotal);
  if (targetRegime && candidateRegime && targetRegime !== candidateRegime) {
    distance *= REGIME_MISMATCH_PENALTY;
  }
  if (targetMonth && candidateMonth && targetMonth !== candidateMonth) {
    distance *= MONTH_MISMATCH_PENALTY;
  }
  return distance;
}

export function buildAnalogDayEntry({
  dateLocal,
  forecastPoints,
  marinaObservations,
  caboRasoObservations = [],
  guinchoObservations = [],
  thresholdKnots,
  preset,
  cutoffHourLocal = DEFAULT_CUTOFF_HOUR,
}) {
  const resolvedThreshold = resolveRideabilityThreshold({ thresholdKnots, preset });
  const { startAt, endAt } = localDayWindowMs(dateLocal, DEFAULT_TIMEZONE);
  const cutoffAt = startAt + cutoffHourLocal * 3_600_000;
  const forecastWindowStart = startAt + 6 * 3_600_000;
  const forecastWindowEnd = startAt + 21 * 3_600_000;
  const dayForecastPoints = forecastPoints.filter(
    (point) => point.validTime >= forecastWindowStart && point.validTime <= forecastWindowEnd
  );
  const curveVector = buildForecastCurveVector(dayForecastPoints, dateLocal, cutoffAt);
  if (!hasForecastCurve(curveVector)) return null;

  const dayMarinaObs = normalizeObservationsForBacktest(
    marinaObservations.filter((obs) => obs.observedAt >= startAt && obs.observedAt < endAt)
  );
  const dayCaboObs = normalizeObservationsForBacktest(
    caboRasoObservations.filter((obs) => obs.observedAt >= startAt && obs.observedAt < endAt)
  );
  const dayGuinchoObs = normalizeObservationsForBacktest(
    guinchoObservations.filter((obs) => obs.observedAt >= startAt && obs.observedAt < endAt)
  );

  const label = buildDailyLabel({
    locationSlug: "cascais-bay",
    dateLocal,
    observations: dayMarinaObs,
    reports: [],
    caboRasoObservations: dayCaboObs,
    thresholdKnots: resolvedThreshold,
  });

  const regime = classifyDayRegime({
    label,
    caboObservations: dayCaboObs,
    marinaObservations: dayMarinaObs,
    guinchoObservations: dayGuinchoObs,
    thresholdKnots: resolvedThreshold,
  });

  const actualKickInMinutes =
    label.labelStatus === "observed" && label.actualKickInAt != null
      ? Math.round((label.actualKickInAt - startAt) / 60_000)
      : null;

  return {
    dateLocal,
    summerYear: Number(dateLocal.slice(0, 4)),
    month: monthFromDateLocal(dateLocal),
    curveVector,
    regime,
    actualKickInAt: label.labelStatus === "observed" ? label.actualKickInAt ?? null : null,
    actualKickInMinutes,
    labelStatus: label.labelStatus,
    hasForecastData: true,
  };
}

export function buildAnalogIndex({
  datesLocal,
  forecastPoints,
  marinaObservations,
  caboRasoObservations = [],
  guinchoObservations = [],
  thresholdKnots,
  preset,
  cutoffHourLocal = DEFAULT_CUTOFF_HOUR,
  requireObservedLabels = true,
}) {
  const entries = [];
  for (const dateLocal of datesLocal) {
    const entry = buildAnalogDayEntry({
      dateLocal,
      forecastPoints,
      marinaObservations,
      caboRasoObservations,
      guinchoObservations,
      thresholdKnots,
      preset,
      cutoffHourLocal,
    });
    if (!entry) continue;
    if (requireObservedLabels && entry.labelStatus !== "observed") continue;
    entries.push(entry);
  }
  return entries;
}

export function rankAnalogNeighbors(targetEntry, analogIndex, { k = DEFAULT_K, excludeDateLocal } = {}) {
  const targetRegime = estimateRegimeFromForecastCurve(targetEntry.curveVector);
  const ranked = [];

  for (const candidate of analogIndex) {
    if (excludeDateLocal && candidate.dateLocal === excludeDateLocal) continue;
    if (candidate.dateLocal === targetEntry.dateLocal) continue;
    const distance = weightedCurveDistance(targetEntry.curveVector, candidate.curveVector, {
      targetRegime,
      candidateRegime: candidate.regime,
      targetMonth: targetEntry.month,
      candidateMonth: candidate.month,
    });
    ranked.push({ ...candidate, distance });
  }

  ranked.sort((a, b) => a.distance - b.distance);
  return ranked.slice(0, k);
}

export function buildAnalogBayWindPrediction({
  targetLocationSlug,
  forecastDateLocal,
  generatedAt,
  points,
  caboRasoObservations = [],
  guinchoObservations = [],
  thresholdKnots,
  preset,
  analogIndex,
  k = DEFAULT_K,
  sessionThreshold = DEFAULT_SESSION_THRESHOLD,
  cutoffHourLocal = DEFAULT_CUTOFF_HOUR,
}) {
  const resolvedThreshold = resolveRideabilityThreshold({ thresholdKnots, preset });
  const targetEntry = buildAnalogDayEntry({
    dateLocal: forecastDateLocal,
    forecastPoints: points,
    marinaObservations: [],
    caboRasoObservations,
    guinchoObservations,
    thresholdKnots: resolvedThreshold,
    cutoffHourLocal,
  });

  if (!targetEntry || analogIndex.length === 0) {
    return {
      targetLocationSlug,
      sport: "wingfoil",
      generatedAt,
      forecastDateLocal,
      modelVersion: ANALOG_MODEL_VERSION,
      thresholdKnots: resolvedThreshold,
      predictedKickInAt: undefined,
      predictedStrongKickInAt: undefined,
      summary: "Analog kick-in unavailable (missing forecast curve or empty index).",
      inputs: { analogCount: 0, sessionProbability: 0, sessionThreshold },
    };
  }

  const neighbors = rankAnalogNeighbors(targetEntry, analogIndex, {
    k,
    excludeDateLocal: forecastDateLocal,
  });
  const rideableNeighbors = neighbors.filter((neighbor) => neighbor.actualKickInMinutes != null);
  const sessionProbability =
    neighbors.length > 0 ? rideableNeighbors.length / neighbors.length : 0;
  const sessionAllowed = sessionProbability >= sessionThreshold;

  const kickInMinuteSamples = rideableNeighbors
    .map((neighbor) => clampRidingMinutes(neighbor.actualKickInMinutes))
    .filter((minutes) => minutes != null);
  const medianMinutes = median(kickInMinuteSamples);
  const windowStartMinutes = quantile(kickInMinuteSamples, 0.25);
  const windowEndMinutes = quantile(kickInMinuteSamples, 0.75);
  const strongMinutes = quantile(kickInMinuteSamples, 0.75);

  const { startAt } = localDayWindowMs(forecastDateLocal, DEFAULT_TIMEZONE);
  const forecastRegime = estimateRegimeFromForecastCurve(targetEntry.curveVector);
  const flatForecast = forecastRegime === REGIME_FLAT;

  let predictedKickInAt;
  if (sessionAllowed && !flatForecast && medianMinutes != null) {
    predictedKickInAt = resolveKickInInRidingWindow({
      dateLocal: forecastDateLocal,
      kickInMinutes: Math.round(medianMinutes),
      probabilityTimeline: [],
      kickInThreshold: sessionThreshold,
      sessionAllowed: true,
    });
    if (predictedKickInAt == null) {
      predictedKickInAt = startAt + Math.round(medianMinutes) * 60_000;
    }
  }

  let predictedStrongKickInAt;
  if (sessionAllowed && !flatForecast && strongMinutes != null) {
    predictedStrongKickInAt = startAt + Math.round(strongMinutes) * 60_000;
  }

  const kickInWindowStartMs =
    sessionAllowed && !flatForecast && windowStartMinutes != null
      ? startAt + windowStartMinutes * 60_000
      : undefined;
  const kickInWindowEndMs =
    sessionAllowed && !flatForecast && windowEndMinutes != null
      ? startAt + windowEndMinutes * 60_000
      : undefined;
  const kickInWindowMedianMs = predictedKickInAt;

  return {
    targetLocationSlug,
    sport: "wingfoil",
    generatedAt,
    forecastDateLocal,
    modelVersion: ANALOG_MODEL_VERSION,
    thresholdKnots: resolvedThreshold,
    predictedKickInAt,
    predictedStrongKickInAt,
    summary: predictedKickInAt
      ? `Analog median kick-in from ${rideableNeighbors.length}/${neighbors.length} similar days (${ANALOG_MODEL_VERSION}).`
      : flatForecast
        ? `Analog flat forecast regime (${ANALOG_MODEL_VERSION}).`
        : `Analog session unlikely (${Math.round(sessionProbability * 100)}% of ${neighbors.length} similar days rideable).`,
    inputs: {
      mode: "analog",
      analogCount: neighbors.length,
      rideableAnalogCount: rideableNeighbors.length,
      sessionProbability: Math.round(sessionProbability * 1000) / 1000,
      sessionThreshold,
      neighborDates: neighbors.map((neighbor) => neighbor.dateLocal),
      neighborDistances: neighbors.map((neighbor) => Math.round(neighbor.distance * 10) / 10),
      predictedKickInMinutes: medianMinutes != null ? Math.round(medianMinutes) : undefined,
      forecastRegime,
      flatForecast,
      kickInWindowStartMs,
      kickInWindowEndMs,
      kickInWindowMedianMs,
    },
  };
}
