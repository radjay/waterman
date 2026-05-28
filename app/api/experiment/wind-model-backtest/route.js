import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import {
  DEFAULT_ANALYSIS_SEASON_ID,
  resolveAnalysisSeason,
} from "../../../../lib/forecast-experiment/analysisSeasons.js";
import {
  buildModelSkillAnalysisCacheKey,
  getCachedModelSkillAnalysis,
  setCachedModelSkillAnalysis,
} from "../../../../lib/forecast-experiment/modelSkillAnalysisCache.js";
import { runModelSkillAnalysis } from "../../../../lib/forecast-experiment/runModelSkillAnalysis.js";

function parseSeasonId(value) {
  const season = resolveAnalysisSeason(value);
  return season.id;
}

export async function GET(request) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ ok: false, error: "NEXT_PUBLIC_CONVEX_URL is not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const seasonId = parseSeasonId(searchParams.get("season") ?? DEFAULT_ANALYSIS_SEASON_ID);
  const season = resolveAnalysisSeason(seasonId);
  const filterMode = searchParams.get("filter") === "windy-nortada" ? "windy-nortada" : "all";
  const minKtParam = Number(searchParams.get("minKt"));
  const minObservedEffectiveKnots =
    Number.isFinite(minKtParam) && minKtParam > 0 ? minKtParam : 12;

  const locationSlug = "cascais-bay";
  const cacheKey = buildModelSkillAnalysisCacheKey({
    locationSlug,
    seasonId,
    filterMode,
    minObservedEffectiveKnots,
  });

  const cached = getCachedModelSkillAnalysis(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const result = await runModelSkillAnalysis(convex, {
      locationSlug,
      seasonId,
      seasonRanges: season.ranges,
      filterMode,
      minObservedEffectiveKnots,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 404, headers: { "X-Cache": "MISS" } });
    }

    setCachedModelSkillAnalysis(cacheKey, result);
    return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500, headers: { "X-Cache": "MISS" } }
    );
  }
}
