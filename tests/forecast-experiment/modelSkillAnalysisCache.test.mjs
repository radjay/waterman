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
    startDateLocal: "2025-05-01",
    endDateLocal: "2025-09-30",
    filterMode: "all",
    minObservedEffectiveKnots: 12,
  };
  const keyA = buildModelSkillAnalysisCacheKey(base);
  const keyB = buildModelSkillAnalysisCacheKey({ ...base, filterMode: "windy-nortada" });
  const keyC = buildModelSkillAnalysisCacheKey({ ...base, minObservedEffectiveKnots: 15 });
  assert.notEqual(keyA, keyB);
  assert.notEqual(keyA, keyC);
});

test("getCachedModelSkillAnalysis returns stored value until expired", () => {
  const key = buildModelSkillAnalysisCacheKey({
    locationSlug: "cascais-bay",
    startDateLocal: "2025-06-01",
    endDateLocal: "2025-06-30",
    filterMode: "all",
    minObservedEffectiveKnots: 12,
  });
  const payload = { ok: true, winnerOverall: { model: "test" } };
  setCachedModelSkillAnalysis(key, payload);
  assert.deepEqual(getCachedModelSkillAnalysis(key), payload);
});
