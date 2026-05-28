import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import {
  DEFAULT_ANALYSIS_SEASON_ID,
  resolveAnalysisSeason,
  seasonHasMarinaLabels,
} from "../../../../lib/forecast-experiment/analysisSeasons.js";
import {
  PREDICTION_MODEL_V1,
  PREDICTION_MODEL_V2,
  PREDICTION_MODEL_V3,
  PREDICTION_MODEL_V4,
  runPredictionSeasonBacktest,
} from "../../../../lib/forecast-experiment/predictionBacktest.js";
import {
  buildPredictionBacktestCacheKey,
  getCachedPredictionBacktest,
  setCachedPredictionBacktest,
} from "../../../../lib/forecast-experiment/predictionBacktestCache.js";
import {
  DEFAULT_RIDEABILITY_PRESET,
  resolveRideabilityThreshold,
} from "../../../../lib/forecast-experiment/rideabilityThresholds.js";

function parseModelVersion(value) {
  if (value === PREDICTION_MODEL_V4) return PREDICTION_MODEL_V4;
  if (value === PREDICTION_MODEL_V3) return PREDICTION_MODEL_V3;
  if (value === PREDICTION_MODEL_V2) return PREDICTION_MODEL_V2;
  return PREDICTION_MODEL_V1;
}

export async function GET(request) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ ok: false, error: "NEXT_PUBLIC_CONVEX_URL is not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const seasonId = resolveAnalysisSeason(searchParams.get("season") ?? DEFAULT_ANALYSIS_SEASON_ID).id;
  const modelVersion = parseModelVersion(searchParams.get("model"));
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
  const cacheKey = buildPredictionBacktestCacheKey({
    locationSlug,
    seasonId,
    modelVersion,
    thresholdKnots,
    preset: Number.isFinite(thresholdParam) ? null : preset,
  });

  const cached = getCachedPredictionBacktest(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const result = await runPredictionSeasonBacktest(convex, {
      locationSlug,
      seasonId,
      modelVersion,
      thresholdKnots,
      preset: Number.isFinite(thresholdParam) ? undefined : preset,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 404, headers: { "X-Cache": "MISS" } });
    }

    const response = {
      ...result,
      hasMarinaLabels: seasonHasMarinaLabels(seasonId),
      marinaLabelYears: [2024, 2025], // for UI messaging
    };

    setCachedPredictionBacktest(cacheKey, response);
    return NextResponse.json(response, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Prediction backtest failed" },
      { status: 500, headers: { "X-Cache": "MISS" } }
    );
  }
}
