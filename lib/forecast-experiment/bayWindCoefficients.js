export const DEFAULT_FORECAST_MODEL = "icon-eu-previous-day1";

export const DEFAULT_BAY_WIND_COEFFICIENTS = {
  version: 1,
  forecastModel: DEFAULT_FORECAST_MODEL,
  biasByRegimeHour: {
    nortada: { "6-11": 0, "12-17": -1, "18-21": -0.5 },
    "non-nortada": { "6-11": 0, "12-17": 0, "18-21": 0 },
  },
  lagMinutesByForecastPeak: [
    { minKnots: 0, maxKnots: 16, lagMinutes: 90 },
    { minKnots: 16, maxKnots: 20, lagMinutes: 75 },
    { minKnots: 20, maxKnots: 999, lagMinutes: 55 },
  ],
};

export function hourBucket(hourLocal) {
  if (hourLocal < 12) return "6-11";
  if (hourLocal < 18) return "12-17";
  return "18-21";
}

export function applyForecastBias({ forecastEffectiveKnots, hourLocal, regime, coefficients }) {
  const bucket = coefficients.biasByRegimeHour[regime]?.[hourBucket(hourLocal)] ?? 0;
  return Math.max(0, forecastEffectiveKnots + bucket);
}

export function estimateBayLagMinutes({
  caboEffectiveKnots,
  forecastPeakKnots,
  coefficients = DEFAULT_BAY_WIND_COEFFICIENTS,
}) {
  const peak = Math.max(caboEffectiveKnots ?? 0, forecastPeakKnots ?? 0);
  const row = coefficients.lagMinutesByForecastPeak.find(
    (entry) => peak >= entry.minKnots && peak < entry.maxKnots
  );
  return row?.lagMinutes ?? 90;
}
