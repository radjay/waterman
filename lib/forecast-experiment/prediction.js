import { effectiveWindKnots } from "./units.js";

export function buildBaselinePrediction({
  targetLocationSlug,
  forecastDateLocal,
  generatedAt,
  points,
  caboRasoObservations,
  thresholdKnots,
}) {
  const byValidTime = groupBy(points, (point) => point.validTime);
  const latestCaboRaso = caboRasoObservations[0];
  const lagMinutes = latestCaboRaso ? bayLagMinutesFromCaboRaso(latestCaboRaso) : undefined;

  const probabilityTimeline = [...byValidTime.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, rows]) => {
      const winds = rows.map((row) => effectiveWindKnots(row)).filter(Number.isFinite);
      const expected = average(winds);
      const spread = quantile(winds, 0.9) - quantile(winds, 0.1);
      const modelProbability = logistic((expected - thresholdKnots) / 2);
      const nowcastBoost = latestCaboRaso && time >= latestCaboRaso.observedAt + (lagMinutes ?? 90) * 60_000 ? 0.12 : 0;
      return {
        time,
        rideableProbability: round2(Math.max(0.03, Math.min(0.97, modelProbability + nowcastBoost))),
        expectedWindKnots: round1(expected),
        p10WindKnots: round1(quantile(winds, 0.1)),
        p90WindKnots: round1(quantile(winds, 0.9)),
        spread,
      };
    });

  const confidence = confidenceFromTimeline(probabilityTimeline);
  const firstLikely = probabilityTimeline.find((row) => row.rideableProbability >= 0.5);
  const firstHigh = probabilityTimeline.find((row) => row.rideableProbability >= 0.75);
  const peak = probabilityTimeline.reduce((best, row) => {
    if (!best || row.rideableProbability > best.rideableProbability) return row;
    return best;
  }, undefined);

  return {
    targetLocationSlug,
    sport: "wingfoil",
    generatedAt,
    forecastDateLocal,
    modelVersion: "baseline-ensemble-v1",
    thresholdKnots,
    kickInP50At: firstLikely?.time,
    kickInP75At: firstHigh?.time,
    peakStartAt: peak?.time,
    peakEndAt: peak ? peak.time + 60 * 60_000 : undefined,
    probabilityTimeline: probabilityTimeline.map(({ spread, ...row }) => row),
    confidence,
    summary: summary({ firstLikely, firstHigh, peak, latestCaboRaso, lagMinutes }),
    inputs: {
      pointCount: points.length,
      caboRasoObservationAt: latestCaboRaso?.observedAt,
      caboRasoLagMinutes: lagMinutes,
    },
  };
}

export function bayLagMinutesFromCaboRaso(observation) {
  const wind = effectiveWindKnots(observation) ?? 0;
  const direction = observation.windDirectionDeg ?? 0;
  const isNortadaDirection = direction >= 300 || direction <= 40;
  if (!isNortadaDirection) return 120;
  if (wind >= 20) return 45;
  if (wind >= 16) return 60;
  return 90;
}

function confidenceFromTimeline(timeline) {
  if (timeline.length === 0) return 0;
  const avgSpread = average(timeline.map((row) => row.spread).filter(Number.isFinite));
  if (!Number.isFinite(avgSpread)) return 0.4;
  return round2(Math.max(0.25, Math.min(0.9, 0.85 - avgSpread * 0.04)));
}

function summary({ firstLikely, firstHigh, peak, latestCaboRaso, lagMinutes }) {
  if (!firstLikely) return "Bay rideability is unlikely in the current forecast window.";
  const p50 = new Date(firstLikely.time).toISOString();
  const p75 = firstHigh ? new Date(firstHigh.time).toISOString() : "not reached";
  const peakIso = peak ? new Date(peak.time).toISOString() : "not available";
  const cabo = latestCaboRaso
    ? ` Cabo Raso latest wind suggests an estimated bay lag near ${lagMinutes} minutes.`
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

function logistic(value) {
  return 1 / (1 + Math.exp(-value));
}

function round1(value) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : undefined;
}

function round2(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined;
}
