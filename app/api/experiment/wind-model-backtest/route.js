import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import {
  buildModelSkillAnalysisCacheKey,
  getCachedModelSkillAnalysis,
  setCachedModelSkillAnalysis,
} from "../../../../lib/forecast-experiment/modelSkillAnalysisCache.js";
import { runModelSkillAnalysis } from "../../../../lib/forecast-experiment/runModelSkillAnalysis.js";

const DEFAULT_START = "2025-05-01";
const DEFAULT_END = "2025-09-30";
const MAX_RANGE_DAYS = 400;

function parseDateParam(value, fallback) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  return value;
}

function rangeDays(startDateLocal, endDateLocal) {
  const start = Date.parse(`${startDateLocal}T12:00:00Z`);
  const end = Date.parse(`${endDateLocal}T12:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

export async function GET(request) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ ok: false, error: "NEXT_PUBLIC_CONVEX_URL is not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const startDateLocal = parseDateParam(searchParams.get("start"), DEFAULT_START);
  const endDateLocal = parseDateParam(searchParams.get("end"), DEFAULT_END);
  const filterMode = searchParams.get("filter") === "windy-nortada" ? "windy-nortada" : "all";
  const minKtParam = Number(searchParams.get("minKt"));
  const minObservedEffectiveKnots =
    Number.isFinite(minKtParam) && minKtParam > 0 ? minKtParam : 12;
  const days = rangeDays(startDateLocal, endDateLocal);

  if (days == null) {
    return NextResponse.json({ ok: false, error: "Invalid date range" }, { status: 400 });
  }
  if (days > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { ok: false, error: `Date range too large (${days} days). Maximum is ${MAX_RANGE_DAYS} days.` },
      { status: 400 }
    );
  }

  const locationSlug = "cascais-bay";
  const cacheKey = buildModelSkillAnalysisCacheKey({
    locationSlug,
    startDateLocal,
    endDateLocal,
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
      startDateLocal,
      endDateLocal,
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
