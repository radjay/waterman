/** In-memory cache for expensive model skill analysis API responses. */

export const MODEL_SKILL_ANALYSIS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const store = new Map();

/**
 * Stable cache key for all params that affect analysis output.
 */
export function buildModelSkillAnalysisCacheKey({
  locationSlug,
  seasonId,
  filterMode,
  minObservedEffectiveKnots,
}) {
  return JSON.stringify({
    locationSlug,
    seasonId,
    filterMode,
    minObservedEffectiveKnots,
  });
}

export function getCachedModelSkillAnalysis(cacheKey) {
  const entry = store.get(cacheKey);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    store.delete(cacheKey);
    return null;
  }
  return entry.value;
}

export function setCachedModelSkillAnalysis(cacheKey, value) {
  store.set(cacheKey, {
    value,
    expiresAt: Date.now() + MODEL_SKILL_ANALYSIS_CACHE_TTL_MS,
  });
}
