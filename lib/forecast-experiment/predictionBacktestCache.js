/** In-memory cache for expensive prediction backtest API responses. */

export const PREDICTION_BACKTEST_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const store = new Map();

export function buildPredictionBacktestCacheKey({
  locationSlug,
  seasonId,
  modelVersion,
  thresholdKnots,
  preset,
}) {
  return JSON.stringify({
    locationSlug,
    seasonId,
    modelVersion,
    thresholdKnots: thresholdKnots ?? null,
    preset: preset ?? null,
  });
}

export function buildPredictionOverviewCacheKey({
  locationSlug,
  seasonId,
  thresholdKnots,
  preset,
}) {
  return JSON.stringify({
    type: "overview",
    locationSlug,
    seasonId,
    thresholdKnots: thresholdKnots ?? null,
    preset: preset ?? null,
  });
}

export function buildNowcastUpliftCacheKey({
  locationSlug,
  seasonId,
  thresholdKnots,
  preset,
  forecastCutoffHour,
  nowcastCutoffHour,
}) {
  return JSON.stringify({
    type: "nowcast-uplift",
    locationSlug,
    seasonId,
    thresholdKnots: thresholdKnots ?? null,
    preset: preset ?? null,
    forecastCutoffHour,
    nowcastCutoffHour,
  });
}

export function getCachedPredictionBacktest(cacheKey) {
  const entry = store.get(cacheKey);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    store.delete(cacheKey);
    return null;
  }
  return entry.value;
}

export function setCachedPredictionBacktest(cacheKey, value) {
  store.set(cacheKey, {
    value,
    expiresAt: Date.now() + PREDICTION_BACKTEST_CACHE_TTL_MS,
  });
}
