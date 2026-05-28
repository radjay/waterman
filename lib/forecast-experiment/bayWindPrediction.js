import {
  applyForecastBias,
  DEFAULT_BAY_WIND_COEFFICIENTS,
  DEFAULT_FORECAST_MODEL,
  estimateBayLagMinutes,
} from "./bayWindCoefficients.js";
import {
  classifyWindRegime,
  WIND_REGIME_NORTADA,
} from "./modelSkillAnalysis.js";
import { logistic } from "./prediction.js";
import { resolveRideabilityThreshold } from "./rideabilityThresholds.js";
import { localDayWindowMs } from "./time.js";
import { effectiveWindKnots, isUsableForecastPoint } from "./units.js";

const DEFAULT_TIMEZONE = "Europe/Lisbon";

export function buildBayWindPredictionV2({
  targetLocationSlug,
  forecastDateLocal,
  generatedAt,
  points,
  caboRasoObservations = [],
  thresholdKnots,
  preset,
  coefficients = DEFAULT_BAY_WIND_COEFFICIENTS,
  mode = "day-ahead",
}) {
  const resolvedThreshold = resolveRideabilityThreshold({ thresholdKnots, preset });
  // Phase 3.1 (Track A2): Multi-model blend for v2 (ICON7 + ICON13 + GFS previous-day1,
  // same set as v3 features). We now pull the blended previous-day1 runs and average
  // effective wind per valid time (matching the v1 approach described in the plan).
  const V2_BLEND_MODELS = [
    "gfs-global-previous-day1",
    "icon-global-previous-day1",
    "icon-eu-previous-day1",
  ];

  const usablePoints = points
    .filter(isUsableForecastPoint)
    .filter((point) => V2_BLEND_MODELS.includes(point.model));
  const latestCabo = [...caboRasoObservations].sort((a, b) => b.observedAt - a.observedAt)[0];

  const probabilityTimeline = buildCorrectedTimeline({
    points: usablePoints,
    forecastDateLocal,
    coefficients,
    thresholdKnots: resolvedThreshold,
    latestCabo,
    mode,
  });

  let caboKickInAt;
  let caboLagMinutes;
  let biasRegime = dominantRegimeFromPoints(usablePoints, latestCabo);

  if (mode === "nowcast" && latestCabo) {
    const sortedCabo = [...caboRasoObservations].sort((a, b) => a.observedAt - b.observedAt);
    const sustained = firstSustainedCrossing(sortedCabo, resolvedThreshold);
    if (sustained) {
      caboKickInAt = sustained.observedAt;
      const caboEffective = effectiveWindKnots(sustained) ?? 0;
      const forecastPeak = probabilityTimeline.reduce(
        (peak, row) => Math.max(peak, row.expectedWindKnots ?? 0),
        0
      );
      caboLagMinutes = estimateBayLagMinutes({
        caboEffectiveKnots: caboEffective,
        forecastPeakKnots: forecastPeak,
        coefficients,
      });
      applyNowcastAdjustments({
        probabilityTimeline,
        caboKickInAt,
        caboLagMinutes,
      });
      if (classifyWindRegime(sustained.windDirectionDeg) === WIND_REGIME_NORTADA) {
        biasRegime = "nortada";
      }
    }
  }

  const confidence = confidenceFromTimeline(probabilityTimeline, {
    caboAligned: Boolean(caboKickInAt && biasRegime === "nortada"),
  });
  const firstLikely = probabilityTimeline.find((row) => row.rideableProbability >= 0.5);
  const firstHigh = probabilityTimeline.find((row) => row.rideableProbability >= 0.75);
  const peak = probabilityTimeline.reduce((best, row) => {
    if (!best || row.rideableProbability > best.rideableProbability) return row;
    return best;
  }, undefined);

  let predictedKickInAt = firstLikely?.time;
  if (mode === "nowcast" && caboKickInAt != null && caboLagMinutes != null) {
    const inferredKickIn = caboKickInAt + caboLagMinutes * 60_000;
    if (!predictedKickInAt || inferredKickIn < predictedKickInAt) {
      predictedKickInAt = inferredKickIn;
    }
  }

  let predictedStrongKickInAt = firstHigh?.time;
  if (mode === "nowcast" && caboKickInAt != null && caboLagMinutes != null && predictedKickInAt) {
    const inferredKickIn = caboKickInAt + caboLagMinutes * 60_000;
    if (!predictedStrongKickInAt || inferredKickIn < predictedStrongKickInAt) {
      predictedStrongKickInAt = inferredKickIn;
    }
  }

  return {
    targetLocationSlug,
    sport: "wingfoil",
    generatedAt,
    forecastDateLocal,
    modelVersion: "bay-wind-v2",
    thresholdKnots: resolvedThreshold,
    predictedKickInAt,
    predictedStrongKickInAt,
    peakStartAt: peak?.time,
    peakEndAt: peak ? peak.time + 60 * 60_000 : undefined,
    probabilityTimeline: probabilityTimeline.map(({ spread, ...row }) => row),
    confidence,
    summary: summaryV2({
      firstLikely: predictedKickInAt ? { time: predictedKickInAt } : undefined,
      firstHigh: predictedStrongKickInAt ? { time: predictedStrongKickInAt } : undefined,
      peak,
      latestCabo,
      caboLagMinutes,
      mode,
    }),
    inputs: {
      forecastModel: DEFAULT_FORECAST_MODEL,
      mode,
      pointCount: usablePoints.length,
      caboRasoObservationAt: latestCabo?.observedAt,
      caboLagMinutes,
      biasRegime,
    },
  };
}

function buildCorrectedTimeline({
  points,
  forecastDateLocal,
  coefficients,
  thresholdKnots,
  latestCabo,
  mode,
}) {
  const byValidTime = groupBy(points, (point) => point.validTime);
  const { startAt } = localDayWindowMs(forecastDateLocal, DEFAULT_TIMEZONE);

  return [...byValidTime.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, rows]) => {
      const winds = rows.map((row) => effectiveWindKnots(row)).filter(Number.isFinite);
      const rawExpected = average(winds);
      const direction = directionFromRows(rows, latestCabo, mode);
      const regime = classifyWindRegime(direction) === WIND_REGIME_NORTADA ? "nortada" : "non-nortada";
      const hourLocal = Math.round((time - startAt) / 3_600_000);
      const corrected = applyForecastBias({
        forecastEffectiveKnots: rawExpected,
        hourLocal,
        regime,
        coefficients,
      });
      const spread = quantile(winds, 0.9) - quantile(winds, 0.1);
      const modelProbability = logistic((corrected - thresholdKnots) / 2);

      return {
        time,
        rideableProbability: round2(Math.max(0.03, Math.min(0.97, modelProbability))),
        expectedWindKnots: round1(corrected),
        p10WindKnots: round1(quantile(winds, 0.1)),
        p90WindKnots: round1(quantile(winds, 0.9)),
        spread,
      };
    });
}

function applyNowcastAdjustments({ probabilityTimeline, caboKickInAt, caboLagMinutes }) {
  const lagAt = caboKickInAt + caboLagMinutes * 60_000;
  for (const row of probabilityTimeline) {
    if (row.time >= lagAt) {
      row.rideableProbability = round2(Math.min(0.97, row.rideableProbability + 0.12));
    }
  }
}

function directionFromRows(rows, latestCabo, mode) {
  if (mode === "nowcast" && Number.isFinite(latestCabo?.windDirectionDeg)) {
    return latestCabo.windDirectionDeg;
  }
  const directions = rows.map((row) => row.windDirectionDeg).filter(Number.isFinite);
  if (directions.length === 0) return undefined;
  return directions[0];
}

function dominantRegimeFromPoints(points, latestCabo) {
  const direction = latestCabo?.windDirectionDeg ?? points.find((p) => Number.isFinite(p.windDirectionDeg))?.windDirectionDeg;
  return classifyWindRegime(direction) === WIND_REGIME_NORTADA ? "nortada" : "non-nortada";
}

function firstSustainedCrossing(observations, thresholdKnots) {
  for (let index = 0; index < observations.length - 1; index += 1) {
    const current = observations[index];
    const next = observations[index + 1];
    const currentEffective = effectiveWindKnots(current);
    const nextEffective = effectiveWindKnots(next);
    if (
      currentEffective >= thresholdKnots &&
      nextEffective >= thresholdKnots &&
      next.observedAt - current.observedAt <= 45 * 60_000
    ) {
      return current;
    }
  }
  return undefined;
}

function confidenceFromTimeline(timeline, { caboAligned = false } = {}) {
  if (timeline.length === 0) return 0;
  const avgSpread = average(timeline.map((row) => row.spread).filter(Number.isFinite));
  if (!Number.isFinite(avgSpread)) return 0.4;
  let confidence = Math.max(0.25, Math.min(0.9, 0.85 - avgSpread * 0.04));
  if (caboAligned) confidence = Math.min(0.92, confidence + 0.08);
  return round2(confidence);
}

function summaryV2({ firstLikely, firstHigh, peak, latestCabo, caboLagMinutes, mode }) {
  if (!firstLikely) {
    return "Bay rideability is unlikely in the current forecast window.";
  }
  const p50 = new Date(firstLikely.time).toISOString();
  const p75 = firstHigh ? new Date(firstHigh.time).toISOString() : "not reached";
  const peakIso = peak ? new Date(peak.time).toISOString() : "not available";
  const cabo =
    mode === "nowcast" && latestCabo && caboLagMinutes != null
      ? ` Cabo Raso nowcast suggests bay lag near ${caboLagMinutes} minutes.`
      : "";
  return `Bay rideability crosses 50% near ${p50}; 75% threshold: ${p75}; peak near ${peakIso}.${cabo}`;
}

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function average(values) {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function quantile(values, q) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return undefined;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * q)));
  return sorted[index];
}

function round1(value) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : undefined;
}

function round2(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined;
}
