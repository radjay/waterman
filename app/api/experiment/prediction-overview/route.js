import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import {
  DEFAULT_ANALYSIS_SEASON_ID,
  resolveAnalysisSeason,
  seasonHasMarinaLabels,
} from "../../../../lib/forecast-experiment/analysisSeasons.js";
import {
  runPredictionOverviewAllPresets,
  runPredictionVersionComparison,
} from "../../../../lib/forecast-experiment/predictionBacktest.js";
import {
  buildPredictionOverviewCacheKey,
  getCachedPredictionBacktest,
  setCachedPredictionBacktest,
} from "../../../../lib/forecast-experiment/predictionBacktestCache.js";
import {
  DEFAULT_RIDEABILITY_PRESET,
  resolveRideabilityThreshold,
} from "../../../../lib/forecast-experiment/rideabilityThresholds.js";

/** Allow long first-load backtests in dev (all presets × 3 models). */
export const maxDuration = 300;

export async function GET(request) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ ok: false, error: "NEXT_PUBLIC_CONVEX_URL is not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const seasonId = resolveAnalysisSeason(searchParams.get("season") ?? DEFAULT_ANALYSIS_SEASON_ID).id;
  const allPresets = searchParams.get("allPresets") === "1" || searchParams.get("allPresets") === "true";
  const presetParam = searchParams.get("preset");
  const preset = presetParam && presetParam.length > 0 ? presetParam : DEFAULT_RIDEABILITY_PRESET;
  const thresholdRaw = searchParams.get("thresholdKnots");
  const thresholdParam =
    thresholdRaw != null && thresholdRaw !== "" ? Number(thresholdRaw) : Number.NaN;
  const thresholdKnots = resolveRideabilityThreshold({
    thresholdKnots: Number.isFinite(thresholdParam) ? thresholdParam : undefined,
    preset,
  });

  const locationSlug = "cascais-bay";
  const cacheKey = buildPredictionOverviewCacheKey({
    locationSlug,
    seasonId,
    thresholdKnots: allPresets ? null : thresholdKnots,
    preset: allPresets ? "all" : Number.isFinite(thresholdParam) ? null : preset,
  });

  const cached = getCachedPredictionBacktest(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const result = allPresets
      ? await runPredictionOverviewAllPresets(convex, { seasonId })
      : await runPredictionVersionComparison(convex, {
          seasonId,
          thresholdKnots,
          preset: Number.isFinite(thresholdParam) ? undefined : preset,
        });

    if (!result.ok) {
      return NextResponse.json(result, { status: 404, headers: { "X-Cache": "MISS" } });
    }

    const response = {
      ...result,
      hasMarinaLabels: seasonHasMarinaLabels(seasonId),
    };

    setCachedPredictionBacktest(cacheKey, response);
    return NextResponse.json(response, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Prediction overview failed" },
      { status: 500, headers: { "X-Cache": "MISS" } }
    );
  }
}
