import { DEFAULT_BAY_WIND_COEFFICIENTS } from "./bayWindCoefficients.js";
import { buildBayWindPredictionV2 } from "./bayWindPrediction.js";
import { buildBayWindPredictionV3 } from "./bayWindPredictionMl.js";
import { DEFAULT_BAY_WIND_ML_MODEL } from "./bayWindMlModelDefaults.js";
import { resolveRideabilityThreshold } from "./rideabilityThresholds.js";

export const DEFAULT_V4_ENSEMBLE_OPTIONS = {
  /** v3 must meet this confidence to override a v2 no-kick-in. */
  v3ConfidenceFloor: 0.6,
  /** v3 session probability floor when v2 says no kick-in. */
  v3SessionFloor: 0.7,
  /** Weight on v3 kick-in time when both models predict rideable (non-nortada). */
  v3WeightDefault: 0.65,
  /** Weight on v3 kick-in time on nortada days. */
  v3WeightNortada: 0.75,
};

export function buildBayWindPredictionV4({
  targetLocationSlug,
  forecastDateLocal,
  generatedAt,
  points,
  caboRasoObservations = [],
  thresholdKnots,
  preset,
  coefficients = DEFAULT_BAY_WIND_COEFFICIENTS,
  mlModel = DEFAULT_BAY_WIND_ML_MODEL,
  mode = "day-ahead",
  ensembleOptions = DEFAULT_V4_ENSEMBLE_OPTIONS,
  cutoffHourLocal = 7,
}) {
  const resolvedThreshold = resolveRideabilityThreshold({ thresholdKnots, preset });
  const opts = { ...DEFAULT_V4_ENSEMBLE_OPTIONS, ...ensembleOptions };

  const v2 = buildBayWindPredictionV2({
    targetLocationSlug,
    forecastDateLocal,
    generatedAt,
    points,
    caboRasoObservations,
    thresholdKnots: resolvedThreshold,
    coefficients,
    mode,
  });

  const v3 = buildBayWindPredictionV3({
    targetLocationSlug,
    forecastDateLocal,
    generatedAt,
    points,
    caboRasoObservations,
    thresholdKnots: resolvedThreshold,
    preset,
    model: mlModel,
    cutoffHourLocal,
  });

  const v2Rideable = v2.predictedKickInAt != null;
  const v3Rideable = v3KickInSupportedByTimeline(v3);
  const v3Confident = v3.confidence >= opts.v3ConfidenceFloor;
  const v3SessionStrong =
    (v3.inputs?.sessionProbability ?? 1) >= opts.v3SessionFloor;
  const isNortada = v2.inputs?.biasRegime === "nortada";
  const caboFloorMs = caboLagFloorMs(v2);

  const allowV3Alone = v3Rideable && v3Confident && v3SessionStrong;
  const rideable = v2Rideable || allowV3Alone;

  if (!rideable) {
    return {
      ...v2,
      modelVersion: "bay-wind-v4-ensemble",
      predictedKickInAt: undefined,
      predictedStrongKickInAt: undefined,
      peakStartAt: undefined,
      peakEndAt: undefined,
      probabilityTimeline: mergeTimelines(v2.probabilityTimeline, v3.probabilityTimeline, {
        strategy: "min",
      }),
      confidence: round2(Math.min(v2.confidence, v3.confidence) * 0.9),
      summary: `Bay rideability is unlikely today (v4 ensemble; v2 ${v2Rideable ? "yes" : "no"}, v3 ${v3Rideable ? "yes" : "no"}).`,
      inputs: ensembleInputs(v2, v3, {
        mode,
        blend: "gated-no-kick-in",
        v2Rideable,
        v3Rideable,
        v3Confident,
        caboFloorMs,
      }),
    };
  }

  const v3Weight = isNortada ? opts.v3WeightNortada : opts.v3WeightDefault;
  let predictedKickInAt;
  let predictedStrongKickInAt;

  if (v2Rideable && v3Rideable) {
    predictedKickInAt = blendTimes(v2.predictedKickInAt, v3.predictedKickInAt, v3Weight);
    predictedStrongKickInAt = blendTimes(v2.predictedStrongKickInAt, v3.predictedStrongKickInAt, v3Weight);
  } else if (allowV3Alone) {
    predictedKickInAt = v3.predictedKickInAt;
    predictedStrongKickInAt = v3.predictedStrongKickInAt;
  } else {
    predictedKickInAt = v2.predictedKickInAt;
    predictedStrongKickInAt = v2.predictedStrongKickInAt;
  }

  predictedKickInAt = applyCaboLagFloor(predictedKickInAt, caboFloorMs);
  predictedStrongKickInAt = applyCaboLagFloor(predictedStrongKickInAt, caboFloorMs);

  const probabilityTimeline = mergeTimelines(v2.probabilityTimeline, v3.probabilityTimeline, {
    strategy: "max",
  });
  const confidence = ensembleConfidence(v2, v3, v2Rideable, v3Rideable);
  const peak = probabilityTimeline.reduce((best, row) => {
    if (!best || row.rideableProbability > best.rideableProbability) return row;
    return best;
  }, undefined);

  return {
    targetLocationSlug,
    sport: "wingfoil",
    generatedAt,
    forecastDateLocal,
    modelVersion: "bay-wind-v4-ensemble",
    thresholdKnots: resolvedThreshold,
    predictedKickInAt,
    predictedStrongKickInAt,
    peakStartAt: peak?.time,
    peakEndAt: peak ? peak.time + 60 * 60_000 : undefined,
    probabilityTimeline,
    confidence,
    summary: summaryV4({ predictedKickInAt, predictedStrongKickInAt, peak, v2Rideable, v3Rideable, isNortada }),
    inputs: ensembleInputs(v2, v3, {
      mode,
      blend: v2Rideable && v3Rideable ? "both" : allowV3Alone ? "v3-only" : "v2-only",
      v3Weight,
      v2Rideable,
      v3Rideable,
      v3Confident,
      caboFloorMs,
    }),
  };
}

function v3KickInSupportedByTimeline(v3) {
  if (v3.predictedKickInAt == null) return false;
  const kickInThreshold = v3.inputs?.kickInThreshold ?? 0.6;
  return v3.probabilityTimeline?.some((row) => row.rideableProbability >= kickInThreshold) ?? false;
}

function caboLagFloorMs(v2) {
  if (v2.inputs?.caboRasoObservationAt != null && v2.inputs?.caboLagMinutes != null) {
    return v2.inputs.caboRasoObservationAt + v2.inputs.caboLagMinutes * 60_000;
  }
  return null;
}

function applyCaboLagFloor(kickInAt, floorMs) {
  if (kickInAt == null) return undefined;
  if (floorMs == null) return kickInAt;
  return Math.max(kickInAt, floorMs);
}

function blendTimes(v2Time, v3Time, v3Weight) {
  if (v2Time == null) return v3Time;
  if (v3Time == null) return v2Time;
  return Math.round(v2Time * (1 - v3Weight) + v3Time * v3Weight);
}

function mergeTimelines(v2Timeline = [], v3Timeline = [], { strategy = "max" } = {}) {
  const byTime = new Map();
  for (const row of v2Timeline) {
    byTime.set(row.time, { ...row });
  }
  for (const row of v3Timeline) {
    const existing = byTime.get(row.time);
    if (!existing) {
      byTime.set(row.time, { ...row });
      continue;
    }
    const pick =
      strategy === "min"
        ? Math.min(existing.rideableProbability, row.rideableProbability)
        : Math.max(existing.rideableProbability, row.rideableProbability);
    byTime.set(row.time, {
      ...existing,
      rideableProbability: round2(pick),
      expectedWindKnots: existing.expectedWindKnots ?? row.expectedWindKnots,
    });
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

function ensembleConfidence(v2, v3, v2Rideable, v3Rideable) {
  if (v2Rideable && v3Rideable) {
    return round2(Math.min(0.92, (v2.confidence + v3.confidence) / 2 + 0.08));
  }
  if (v2Rideable) return v2.confidence;
  return v3.confidence;
}

function ensembleInputs(v2, v3, extra) {
  return {
    mode: extra.mode,
    v2ModelVersion: v2.modelVersion,
    v3ModelVersion: v3.modelVersion,
    v2PredictedKickInAt: v2.predictedKickInAt,
    v3PredictedKickInAt: v3.predictedKickInAt,
    v2Confidence: v2.confidence,
    v3Confidence: v3.confidence,
    v3SessionProbability: v3.inputs?.sessionProbability,
    biasRegime: v2.inputs?.biasRegime,
    caboLagMinutes: v2.inputs?.caboLagMinutes,
    caboRasoObservationAt: v2.inputs?.caboRasoObservationAt,
    caboLagFloorMs: extra.caboFloorMs,
    ...extra,
  };
}

function summaryV4({ predictedKickInAt, predictedStrongKickInAt, peak, v2Rideable, v3Rideable, isNortada }) {
  if (!predictedKickInAt) {
    return "Bay rideability is unlikely in the current forecast window (v4 ensemble).";
  }
  const p50 = new Date(predictedKickInAt).toISOString();
  const p75 = predictedStrongKickInAt ? new Date(predictedStrongKickInAt).toISOString() : "not reached";
  const peakIso = peak ? new Date(peak.time).toISOString() : "not available";
  const sources = [
    v2Rideable ? "v2" : null,
    v3Rideable ? "v3" : null,
  ]
    .filter(Boolean)
    .join("+");
  const regimeNote = isNortada ? " Nortada blend favors v3 timing with Cabo lag floor." : "";
  return `Bay rideability crosses 50% near ${p50} (${sources}); 75%: ${p75}; peak ${peakIso}.${regimeNote}`;
}

function round2(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined;
}
