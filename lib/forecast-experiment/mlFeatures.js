import { selectForecastPointsForBacktest } from "./backtest.js";
import { resolveRideabilityThreshold } from "./rideabilityThresholds.js";
import { localDayWindowMs } from "./time.js";
import { effectiveWindKnots, isUsableForecastPoint } from "./units.js";

const DEFAULT_TIMEZONE = "Europe/Lisbon";
const DEFAULT_CUTOFF_HOUR = 7;
const FEATURE_HOUR_START = 6;
const FEATURE_HOUR_END = 21;

/** GFS, ICON13 (icon-global), ICON7 (icon-eu) — all previous-day1 lead. */
export const ML_FORECAST_MODELS = [
  "gfs-global-previous-day1",
  "icon-global-previous-day1",
  "icon-eu-previous-day1",
];

export const ML_MODEL_SHORT_NAMES = {
  "gfs-global-previous-day1": "gfs",
  "icon-global-previous-day1": "icon13",
  "icon-eu-previous-day1": "icon7",
};

/** Live Open-Meteo ingest uses short model ids; ML was trained on previous-day1 suffix. */
const OPENMETEO_TO_ML_MODEL = {
  "gfs-global": "gfs-global-previous-day1",
  "icon-global": "icon-global-previous-day1",
  "icon-eu": "icon-eu-previous-day1",
};

export function resolveMlForecastModel(model) {
  return OPENMETEO_TO_ML_MODEL[model] ?? model;
}

export const ML_FEATURE_NAMES = buildFeatureNameList();

function buildFeatureNameList() {
  const names = ["thresholdKnots", "month", "dayOfWeek", "dayOfYear"];
  names.push("caboEffectiveKnots", "caboDirectionSin", "caboDirectionCos", "caboObsAgeMinutes");
  for (const model of ML_FORECAST_MODELS) {
    const short = ML_MODEL_SHORT_NAMES[model];
    for (let hour = FEATURE_HOUR_START; hour <= FEATURE_HOUR_END; hour += 1) {
      names.push(`${short}_h${hour}_effective`);
      names.push(`${short}_h${hour}_dirSin`);
      names.push(`${short}_h${hour}_dirCos`);
    }
  }
  for (let hour = FEATURE_HOUR_START; hour <= FEATURE_HOUR_END; hour += 1) {
    names.push(`spread_icon13_icon7_h${hour}`);
    names.push(`spread_gfs_icon7_h${hour}`);
    names.push(`spread_icon13_gfs_h${hour}`);
  }
  return names;
}

function modelSpreadFeatures(hourly) {
  const spreads = {};
  for (let hour = FEATURE_HOUR_START; hour <= FEATURE_HOUR_END; hour += 1) {
    const icon7 = hourly[`icon7_h${hour}_effective`] ?? 0;
    const icon13 = hourly[`icon13_h${hour}_effective`] ?? 0;
    const gfs = hourly[`gfs_h${hour}_effective`] ?? 0;
    spreads[`spread_icon13_icon7_h${hour}`] = Math.round((icon13 - icon7) * 10) / 10;
    spreads[`spread_gfs_icon7_h${hour}`] = Math.round((gfs - icon7) * 10) / 10;
    spreads[`spread_icon13_gfs_h${hour}`] = Math.round((icon13 - gfs) * 10) / 10;
  }
  return spreads;
}

function directionSinCos(degrees) {
  if (!Number.isFinite(degrees)) return { sin: 0, cos: 0 };
  const radians = (degrees * Math.PI) / 180;
  return { sin: Math.round(Math.sin(radians) * 1000) / 1000, cos: Math.round(Math.cos(radians) * 1000) / 1000 };
}

function calendarFeatures(dateLocal) {
  const date = new Date(`${dateLocal}T12:00:00Z`);
  const month = date.getUTCMonth() + 1;
  const dayOfWeek = date.getUTCDay();
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const dayOfYear = Math.floor((date - start) / 86_400_000);
  return { month, dayOfWeek, dayOfYear };
}

function latestCaboBeforeCutoff(caboObservations, cutoffAt) {
  return [...caboObservations]
    .filter((obs) => obs.observedAt <= cutoffAt)
    .sort((a, b) => b.observedAt - a.observedAt)[0];
}

function hourlyForecastFeatures(points, dateLocal) {
  const { startAt } = localDayWindowMs(dateLocal, DEFAULT_TIMEZONE);
  const byModelHour = new Map();

  for (const point of points.filter(isUsableForecastPoint)) {
    const mlModel = resolveMlForecastModel(point.model);
    if (!ML_FORECAST_MODELS.includes(mlModel)) continue;
    const hourLocal = Math.round((point.validTime - startAt) / 3_600_000);
    if (hourLocal < FEATURE_HOUR_START || hourLocal > FEATURE_HOUR_END) continue;
    const key = `${mlModel}:${hourLocal}`;
    if (!byModelHour.has(key)) byModelHour.set(key, []);
    byModelHour.get(key).push(point);
  }

  const values = {};
  for (const model of ML_FORECAST_MODELS) {
    const short = ML_MODEL_SHORT_NAMES[model];
    for (let hour = FEATURE_HOUR_START; hour <= FEATURE_HOUR_END; hour += 1) {
      const rows = byModelHour.get(`${model}:${hour}`) ?? [];
      const effectiveValues = rows.map((row) => effectiveWindKnots(row)).filter(Number.isFinite);
      const effective =
        effectiveValues.length > 0
          ? Math.round((effectiveValues.reduce((sum, value) => sum + value, 0) / effectiveValues.length) * 10) / 10
          : 0;
      const direction = rows.find((row) => Number.isFinite(row.windDirectionDeg))?.windDirectionDeg;
      const { sin, cos } = directionSinCos(direction);
      values[`${short}_h${hour}_effective`] = effective;
      values[`${short}_h${hour}_dirSin`] = sin;
      values[`${short}_h${hour}_dirCos`] = cos;
    }
  }
  return values;
}

export function buildMlFeatureVector({
  dateLocal,
  forecastPoints,
  caboRasoObservations,
  thresholdKnots,
  cutoffHourLocal = DEFAULT_CUTOFF_HOUR,
  nowcastMode = false,   // Phase 5 nowcast prep stub: when true + fresh caboRasoObservations passed, selects absolute latest Cabo obs (dynamic, small obs age) instead of fixed prev-day 07:00 cutoff. Enables same-day tightening on v3.5 ML. Defaults preserve all Forecast/day-ahead behavior.
  referenceAt,           // Inference time (ms); used for nowcast Cabo obs age instead of 07:00 cutoff.
}) {
  const resolvedThreshold = resolveRideabilityThreshold({ thresholdKnots });
  const { startAt } = localDayWindowMs(dateLocal, DEFAULT_TIMEZONE);
  const cutoffAt = startAt + cutoffHourLocal * 3_600_000;
  const eligiblePoints = selectForecastPointsForBacktest(forecastPoints, cutoffAt);

  let latestCabo;
  if (nowcastMode) {
    // Phase 5 stub: use most recent provided Cabo obs (caller supplies live data at re-run time for "today").
    // This makes caboObsAgeMinutes small and feeds current effective/dir into the v3.5 features.
    latestCabo = caboRasoObservations.length > 0
      ? [...caboRasoObservations].sort((a, b) => b.observedAt - a.observedAt)[0]
      : undefined;
  } else {
    latestCabo = latestCaboBeforeCutoff(caboRasoObservations, cutoffAt);
  }

  const calendar = calendarFeatures(dateLocal);
  const hourly = hourlyForecastFeatures(eligiblePoints, dateLocal);
  const spreads = modelSpreadFeatures(hourly);

  const caboEffective = latestCabo ? effectiveWindKnots(latestCabo) ?? 0 : 0;
  const caboDirection = latestCabo?.windDirectionDeg;
  const caboDir = directionSinCos(caboDirection);
  const ageReferenceAt =
    nowcastMode && Number.isFinite(referenceAt) ? referenceAt : cutoffAt;
  const caboObsAgeMinutes = latestCabo
    ? Math.max(0, Math.round((ageReferenceAt - latestCabo.observedAt) / 60_000))
    : 999;

  const named = {
    thresholdKnots: resolvedThreshold,
    month: calendar.month,
    dayOfWeek: calendar.dayOfWeek,
    dayOfYear: calendar.dayOfYear,
    caboEffectiveKnots: caboEffective,
    caboDirectionSin: caboDir.sin,
    caboDirectionCos: caboDir.cos,
    caboObsAgeMinutes,
    ...hourly,
    ...spreads,
  };

  return ML_FEATURE_NAMES.map((name) => named[name] ?? 0);
}

/** Map a feature vector (ML_FEATURE_NAMES order) by name for model inference. */
export function featureVectorByName(featureVector) {
  return Object.fromEntries(ML_FEATURE_NAMES.map((name, index) => [name, featureVector[index] ?? 0]));
}
