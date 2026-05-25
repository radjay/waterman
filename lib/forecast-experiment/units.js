export function kmhToKnots(value) {
  return round1(value / 1.852);
}

export function msToKnots(value) {
  return round1(value * 1.94384);
}

export function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

/** Parse API numeric wind values; null/undefined must not become 0 kt. */
export function parseNumericKnots(value) {
  if (value == null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? round1(number) : undefined;
}

/** True when a forecast point has real wind data (excludes null-ingested 0/0 gaps). */
export function isUsableForecastPoint(point) {
  const speed = point?.windSpeedKnots;
  const gust = point?.windGustKnots;
  const hasSpeed = Number.isFinite(speed);
  const hasGust = Number.isFinite(gust);
  if (!hasSpeed && !hasGust) return false;
  if (hasSpeed && hasGust && speed === 0 && gust === 0) return false;
  return true;
}

export function normalizeDegrees(value) {
  const degrees = Number(value);
  if (!Number.isFinite(degrees)) return null;
  return ((degrees % 360) + 360) % 360;
}

export function degreesToCompass8(value) {
  const degrees = normalizeDegrees(value);
  if (degrees === null) return null;
  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return labels[Math.round(degrees / 45) % 8];
}

export function circularDirectionError(actual, predicted) {
  const a = normalizeDegrees(actual);
  const p = normalizeDegrees(predicted);
  if (a === null || p === null) return null;
  const diff = Math.abs(a - p);
  return Math.min(diff, 360 - diff);
}

/** Average of base wind and gust; fallback to whichever is present. */
export function effectiveWindKnots(observation) {
  const speed = observation?.windSpeedKnots;
  const gust = observation?.windGustKnots;
  if (Number.isFinite(speed) && Number.isFinite(gust)) {
    return round1((speed + gust) / 2);
  }
  if (Number.isFinite(speed)) return round1(speed);
  if (Number.isFinite(gust)) return round1(gust);
  return undefined;
}

export function isValidWindReading(value) {
  return Number.isFinite(value) && value >= 0;
}
