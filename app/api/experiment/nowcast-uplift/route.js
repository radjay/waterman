import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import {
  DEFAULT_ANALYSIS_SEASON_ID,
  resolveAnalysisSeason,
  seasonHasMarinaLabels,
} from "../../../../lib/forecast-experiment/analysisSeasons.js";
import {
  DEFAULT_FORECAST_CUTOFF_HOUR,
  DEFAULT_NOWCAST_CUTOFF_HOUR,
  REGIME_FILTER_NORTADA,
  runNowcastUpliftBacktest,
} from "../../../../lib/forecast-experiment/nowcastUpliftBacktest.js";
import {
  buildNowcastUpliftCacheKey,
  getCachedPredictionBacktest,
  setCachedPredictionBacktest,
} from "../../../../lib/forecast-experiment/predictionBacktestCache.js";
import {
  DEFAULT_RIDEABILITY_PRESET,
  resolveRideabilityThreshold,
} from "../../../../lib/forecast-experiment/rideabilityThresholds.js";

export async function GET(request) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ ok: false, error: "NEXT_PUBLIC_CONVEX_URL is not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const seasonId = resolveAnalysisSeason(searchParams.get("season") ?? DEFAULT_ANALYSIS_SEASON_ID).id;

  if (!seasonHasMarinaLabels(seasonId)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Season "${seasonId}" has no marina-validated labels. Use 2024 or 2025.`,
        hasMarinaLabels: false,
      },
      { status: 400 }
    );
  }

  const presetParam = searchParams.get("preset");
  const preset = presetParam && presetParam.length > 0 ? presetParam : DEFAULT_RIDEABILITY_PRESET;
  const thresholdRaw = searchParams.get("thresholdKnots");
  const thresholdParam =
    thresholdRaw != null && thresholdRaw !== "" ? Number(thresholdRaw) : Number.NaN;
  const thresholdKnots = resolveRideabilityThreshold({
    thresholdKnots: Number.isFinite(thresholdParam) ? thresholdParam : undefined,
    preset,
  });

  const forecastCutoffHour = Number(searchParams.get("forecastHour") ?? DEFAULT_FORECAST_CUTOFF_HOUR);
  const nowcastCutoffHour = Number(searchParams.get("nowcastHour") ?? DEFAULT_NOWCAST_CUTOFF_HOUR);
  const regimeFilter = searchParams.get("regime") === "nortada" ? REGIME_FILTER_NORTADA : "all";

  const cacheKey = buildNowcastUpliftCacheKey({
    locationSlug: "cascais-bay",
    seasonId,
    thresholdKnots,
    preset,
    forecastCutoffHour,
    nowcastCutoffHour,
  });

  const cached = getCachedPredictionBacktest(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  const convex = new ConvexHttpClient(convexUrl);
  const result = await runNowcastUpliftBacktest(convex, {
    seasonId,
    thresholdKnots,
    preset,
    forecastCutoffHour,
    nowcastCutoffHour,
    regimeFilter,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  const payload = { ...result, cached: false };
  setCachedPredictionBacktest(cacheKey, payload);
  return NextResponse.json(payload);
}
