import {
  ML_FEATURE_NAMES,
  buildMlFeatureVector,
} from "./mlFeatures.js";
import { DEFAULT_BAY_WIND_ML_MODEL } from "./bayWindMlModelDefaults.js";
import { logistic } from "./prediction.js";
import { resolveRideabilityThreshold } from "./rideabilityThresholds.js";
import { localDayWindowMs } from "./time.js";

const DEFAULT_TIMEZONE = "Europe/Lisbon";
const FEATURE_HOUR_START = 6;
const FEATURE_HOUR_END = 21;

export { DEFAULT_BAY_WIND_ML_MODEL };

const DEFAULT_CALIBRATION = {
  sessionThreshold: 0.55,
  kickInThreshold: 0.6,
  probabilityDamping: 0.85,
};

function featureVectorToMap(featureNames, featureVector) {
  const map = {};
  for (let index = 0; index < featureNames.length; index += 1) {
    map[featureNames[index]] = featureVector[index] ?? 0;
  }
  return map;
}

function traverseTree(node, features) {
  if (node.leaf_value != null) return node.leaf_value;
  const value = features[node.split_feature] ?? 0;
  const threshold = node.threshold ?? 0;
  const goLeft = value <= threshold;
  const child = goLeft ? node.left_child : node.right_child;
  if (!child) return 0;
  return traverseTree(child, features);
}

export function predictLightGbmJson(modelJson, features) {
  const trees = modelJson.tree_info ?? [];
  let score = modelJson.init_score ?? 0;
  for (const tree of trees) {
    score += traverseTree(tree.tree_structure, features);
  }
  return score;
}

export function predictBinaryLightGbmJson(modelJson, features) {
  const raw = predictLightGbmJson(modelJson, features);
  return 1 / (1 + Math.exp(-raw));
}

export function resolveMlCalibration(model, thresholdKnots) {
  const byThreshold = model.calibration?.byThresholdKnots;
  if (!byThreshold) return null;
  return byThreshold[String(thresholdKnots)] ?? byThreshold[thresholdKnots] ?? DEFAULT_CALIBRATION;
}

/**
 * Returns a conservative calibration for day-ahead / multi-day Forecast use.
 * This is the pragmatic Phase 2 path: use the committed v3.5 model (excellent
 * real backtest performance) but raise the sessionThreshold to reduce false
 * positives for planning horizons.
 *
 * Usage in generator/worker:
 *   const calibration = isForecastRun
 *     ? getConservativeForecastCalibration(model, thresholdKnots)
 *     : resolveMlCalibration(model, thresholdKnots);
 */
export function getConservativeForecastCalibration(model, thresholdKnots) {
  const base = resolveMlCalibration(model, thresholdKnots) || DEFAULT_CALIBRATION;
  // Recommended conservative bumps (start here, validate with live scoring):
  // 10kt: 0.55–0.60, 12kt: 0.60–0.65, 15kt: 0.55–0.60
  const conservativeBump = {
    10: 0.60,
    12: 0.65,
    15: 0.60,
  };
  const bumped = { ...base };
  const t = Number(thresholdKnots);
  if (conservativeBump[t] != null) {
    bumped.sessionThreshold = conservativeBump[t];
  }
  return bumped;
}

/**
 * Phase 5 Nowcast calibration resolver.
 * For same-day tightening we deliberately do NOT apply the conservative day-ahead bump.
 * This allows the model to be more responsive when fresh Cabo observations are present.
 * A dedicated nowcastCalibration block can be added to the model JSON later for finer control.
 */
export function resolveNowcastCalibration(model, thresholdKnots) {
  // Phase 5 Nowcast: start with a modest bump over the raw model calibration
  // for safety (user preference: modest bump to start). This is still much
  // more aggressive than the conservative day-ahead Forecast path.
  // Future: support a model.nowcastCalibration?.byThresholdKnots override.
  const base = resolveMlCalibration(model, thresholdKnots) || DEFAULT_CALIBRATION;
  const bumped = { ...base };
  // Modest bump (tunable from live scoring):
  const nowcastBump = {
    10: 0.05,
    12: 0.05,
    15: 0.05,
  };
  const t = Number(thresholdKnots);
  if (nowcastBump[t] != null) {
    bumped.sessionThreshold = Math.min(0.95, (base.sessionThreshold ?? DEFAULT_CALIBRATION.sessionThreshold) + nowcastBump[t]);
  }
  return bumped;
}

export function resolveMlModelVersion(model) {
  return model.calibration ? "bay-wind-v3.5-ml" : "bay-wind-v3-ml";
}

function applyProbabilityDamping(probability, calibration) {
  const damping = calibration?.probabilityDamping ?? 1;
  return round2(Math.max(0.03, Math.min(0.97, probability * damping)));
}

export function predictRideableDayProbability(model, featureVector) {
  if (!model.rideableDayClassifier) return 1;
  const features = featureVectorToMap(model.featureNames, featureVector);
  return predictBinaryLightGbmJson(model.rideableDayClassifier, features);
}

export function predictKickInMinutes(model, featureVector) {
  const features = featureVectorToMap(model.featureNames, featureVector);
  const minutes = predictLightGbmJson(model.kickInRegressor, features);
  if (!Number.isFinite(minutes)) return undefined;
  return Math.max(0, Math.round(minutes));
}

export function predictHourlyRideableProbabilities(model, featureVector, calibration = null) {
  const features = featureVectorToMap(model.featureNames, featureVector);
  const hours = model.featureHours ?? [];
  const kickInThreshold = calibration?.kickInThreshold ?? 0.5;
  const probabilities = [];

  for (const hour of hours) {
    const hourModel = model.hourlyRideableClassifiers?.[`h${hour}`];
    let probability;
    if (hourModel) {
      probability = predictBinaryLightGbmJson(hourModel, features);
    } else {
      const effective = features[`icon7_h${hour}_effective`] ?? 0;
      probability = logistic((effective - (features.thresholdKnots ?? 12)) / 2);
    }
    probability = applyProbabilityDamping(probability, calibration);
    probabilities.push({
      hourLocal: hour,
      rideableProbability: probability,
      meetsKickInThreshold: probability >= kickInThreshold,
    });
  }

  return probabilities;
}

export function buildBayWindPredictionV3({
  targetLocationSlug,
  forecastDateLocal,
  generatedAt,
  points,
  caboRasoObservations = [],
  thresholdKnots,
  preset,
  model = DEFAULT_BAY_WIND_ML_MODEL,
  cutoffHourLocal = 7,
  conservative = false,   // Phase 2 pragmatic: use higher sessionThreshold for day-ahead Forecast
  mode = "day-ahead",     // "day-ahead" (Forecast layer, conservative supported) | "nowcast" (Phase 5 same-day tightening). Controls dynamic Cabo in features + recorded in inputs.
}) {
  const resolvedThreshold = resolveRideabilityThreshold({ thresholdKnots, preset });
  const { startAt } = localDayWindowMs(forecastDateLocal, DEFAULT_TIMEZONE);

  const modelVersion = resolveMlModelVersion(model);
  const isNowcast = mode === "nowcast";

  // Phase 5 Nowcast: use the (non-conservative) nowcast resolver when in nowcast mode.
  // This allows tighter windows with fresh Cabo while keeping the conservative path
  // strictly for day-ahead / multi-day Forecast.
  const calibration = conservative
    ? getConservativeForecastCalibration(model, resolvedThreshold)
    : isNowcast
      ? resolveNowcastCalibration(model, resolvedThreshold)
      : resolveMlCalibration(model, resolvedThreshold);

  const featureVector = buildMlFeatureVector({
    dateLocal: forecastDateLocal,
    forecastPoints: points,
    caboRasoObservations,
    thresholdKnots: resolvedThreshold,
    cutoffHourLocal,
    nowcastMode: isNowcast,   // Phase 5 stub wiring: enables latest-Cabo feature selection when caller passes fresh observations
  });

  const sessionThreshold = calibration?.sessionThreshold ?? DEFAULT_CALIBRATION.sessionThreshold;
  const sessionProbability = predictRideableDayProbability(model, featureVector);
  const sessionAllowed = !model.rideableDayClassifier || sessionProbability >= sessionThreshold;

  const kickInMinutes = sessionAllowed ? predictKickInMinutes(model, featureVector) : undefined;
  const hourlyRaw = predictHourlyRideableProbabilities(model, featureVector, calibration);
  const kickInThreshold = calibration?.kickInThreshold ?? 0.5;

  const probabilityTimeline = hourlyRaw.map(({ hourLocal, rideableProbability }) => ({
    time: startAt + hourLocal * 3_600_000,
    rideableProbability: sessionAllowed ? rideableProbability : round2(rideableProbability * 0.5),
    expectedWindKnots: round1(featureVector[model.featureNames.indexOf(`icon7_h${hourLocal}_effective`)] ?? undefined),
  }));

  const timelineKickIn = probabilityTimeline.find((row) => row.rideableProbability >= kickInThreshold);

  let kickInP50At;
  if (sessionAllowed) {
    if (kickInMinutes != null) {
      kickInP50At = startAt + kickInMinutes * 60_000;
    } else {
      kickInP50At = timelineKickIn?.time;
    }
  }

  const kickInP75At = sessionAllowed
    ? probabilityTimeline.find((row) => row.rideableProbability >= Math.min(0.95, kickInThreshold + 0.15))?.time
    : undefined;
  const peak = probabilityTimeline.reduce((best, row) => {
    if (!best || row.rideableProbability > best.rideableProbability) return row;
    return best;
  }, undefined);

  const confidence = confidenceFromTimeline(probabilityTimeline, sessionProbability, sessionThreshold);

  // Phase 5 Nowcast metadata (richer fields for UI, scoring separation, and observability).
  // These are attached only for nowcast runs so downstream consumers can distinguish
  // the continuous same-day tightening layer from the conservative day-ahead Forecast.
  let nowcastInputs = {};
  if (isNowcast && caboRasoObservations.length > 0) {
    const latestCabo = [...caboRasoObservations].sort((a, b) => b.observedAt - a.observedAt)[0];
    nowcastInputs = {
      caboObsAgeMinutesAtGeneration: Math.round((generatedAt - latestCabo.observedAt) / 60_000),
      caboLastObservedAt: latestCabo.observedAt,
      generatedWithFreshCabo: true,
    };
  }

  return {
    targetLocationSlug,
    sport: "wingfoil",
    generatedAt,
    forecastDateLocal,
    modelVersion,
    thresholdKnots: resolvedThreshold,
    kickInP50At,
    kickInP75At,
    peakStartAt: peak?.time,
    peakEndAt: peak ? peak.time + 60 * 60_000 : undefined,
    probabilityTimeline,
    confidence,
    summary: summaryV3({ kickInP50At, kickInP75At, peak, kickInMinutes, modelVersion, sessionProbability }),
    inputs: {
      mode,   // "day-ahead" (default, Forecast + conservative) or "nowcast" (Phase 5 dynamic Cabo). Now flows through for consumers (UI, scoring separation, generator).
      pointCount: points.length,
      mlModelVersion: model.version,
      syntheticModel: Boolean(model.trainingMeta?.synthetic),
      predictedKickInMinutes: kickInMinutes,
      sessionProbability: round2(sessionProbability),
      sessionThreshold,
      kickInThreshold,
      calibrated: Boolean(calibration),
      ...nowcastInputs,
    },
  };
}

function confidenceFromTimeline(timeline, sessionProbability, sessionThreshold) {
  if (timeline.length === 0) return 0;
  const spread = Math.max(...timeline.map((row) => row.rideableProbability)) -
    Math.min(...timeline.map((row) => row.rideableProbability));
  const sessionBoost = sessionProbability >= sessionThreshold ? 0.1 : -0.15;
  return round2(Math.max(0.2, Math.min(0.9, 0.55 + spread * 0.35 + sessionBoost)));
}

function summaryV3({ kickInP50At, kickInP75At, peak, kickInMinutes, modelVersion, sessionProbability }) {
  if (!kickInP50At) {
    return `Bay rideability is unlikely in the current forecast window (${modelVersion}; session ${Math.round(sessionProbability * 100)}%).`;
  }
  const p50 = new Date(kickInP50At).toISOString();
  const p75 = kickInP75At ? new Date(kickInP75At).toISOString() : "not reached";
  const peakIso = peak ? new Date(peak.time).toISOString() : "not available";
  const minutesNote =
    kickInMinutes != null ? ` Model kick-in estimate: ${kickInMinutes} min from midnight.` : "";
  return `Bay rideability crosses 50% near ${p50}; 75% threshold: ${p75}; peak near ${peakIso}.${minutesNote}`;
}

function round1(value) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : undefined;
}

function round2(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined;
}
