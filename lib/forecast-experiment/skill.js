import { effectiveWindKnots, isUsableForecastPoint } from "./units.js";

export function bucketLeadHours(hours) {
  if (hours <= 6) return "0-6";
  if (hours <= 12) return "6-12";
  if (hours <= 24) return "12-24";
  if (hours <= 48) return "24-48";
  return "48-72";
}

export function meanAbsoluteError(actual, predicted) {
  const pairs = actual.map((value, index) => [value, predicted[index]])
    .filter(([a, p]) => Number.isFinite(a) && Number.isFinite(p));
  if (pairs.length === 0) return undefined;
  return round2(pairs.reduce((sum, [a, p]) => sum + Math.abs(a - p), 0) / pairs.length);
}

export function rootMeanSquaredError(actual, predicted) {
  const pairs = actual.map((value, index) => [value, predicted[index]])
    .filter(([a, p]) => Number.isFinite(a) && Number.isFinite(p));
  if (pairs.length === 0) return undefined;
  return round2(Math.sqrt(pairs.reduce((sum, [a, p]) => sum + (a - p) ** 2, 0) / pairs.length));
}

export function brierScore(probabilities, outcomes) {
  const pairs = probabilities.map((value, index) => [value, outcomes[index]])
    .filter(([p, o]) => Number.isFinite(p) && (o === 0 || o === 1));
  if (pairs.length === 0) return undefined;
  return round2(pairs.reduce((sum, [p, o]) => sum + (p - o) ** 2, 0) / pairs.length);
}

export function onsetErrorMinutes(actualKickInAt, predictedKickInAt) {
  if (!Number.isFinite(actualKickInAt) || !Number.isFinite(predictedKickInAt)) return undefined;
  return Math.round(Math.abs(actualKickInAt - predictedKickInAt) / 60_000);
}

export function forecastRideableProbability(point, thresholdKnots) {
  if (!isUsableForecastPoint(point)) return undefined;
  const effective = effectiveWindKnots(point);
  if (!Number.isFinite(effective)) return undefined;
  const distance = effective - thresholdKnots;
  return Math.max(0.05, Math.min(0.95, 0.5 + distance * 0.08));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
