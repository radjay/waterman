import assert from "node:assert/strict";
import test from "node:test";
import {
  buildModelSkillAnalysisCacheKey,
  getCachedModelSkillAnalysis,
  setCachedModelSkillAnalysis,
} from "../../lib/forecast-experiment/modelSkillAnalysisCache.js";

test("buildModelSkillAnalysisCacheKey varies with all analysis params", () => {
  const base = {
    locationSlug: "cascais-bay",
    seasonId: "2025",
    filterMode: "all",
    minObservedEffectiveKnots: 12,
  };
  const keyA = buildModelSkillAnalysisCacheKey(base);
  const keyB = buildModelSkillAnalysisCacheKey({ ...base, filterMode: "windy-nortada" });
  const keyC = buildModelSkillAnalysisCacheKey({ ...base, minObservedEffectiveKnots: 15 });
  const keyD = buildModelSkillAnalysisCacheKey({ ...base, seasonId: "2024" });
  assert.notEqual(keyA, keyB);
  assert.notEqual(keyA, keyC);
  assert.notEqual(keyA, keyD);
});

test("getCachedModelSkillAnalysis returns stored value until expired", () => {
  const key = buildModelSkillAnalysisCacheKey({
    locationSlug: "cascais-bay",
    seasonId: "2026",
    filterMode: "all",
    minObservedEffectiveKnots: 12,
  });
  const payload = { ok: true, winnerOverall: { model: "test" } };
  setCachedModelSkillAnalysis(key, payload);
  assert.deepEqual(getCachedModelSkillAnalysis(key), payload);
});
