import { api } from "../../convex/_generated/api.js";
import { filterDatesToSeasonRanges } from "./analysisSeasons.js";
import {
  analyzeModelSkill,
  computeWindSpeedRegimeBreakdown,
  inferAnalysisWindow,
  listModelsForSkillAnalysis,
  computeRideabilityAnomalies,
  listWindyNortadaDates,
  rankModels,
  rankModelsByCurve,
  windyNortadaPairFilter,
} from "./modelSkillAnalysis.js";
import { localDayWindowMs } from "./time.js";

const CHUNK_MS = 14 * 24 * 60 * 60 * 1000;
const DEFAULT_LOCATION = "cascais-bay";
const DEFAULT_MIN_OBSERVED_EFFECTIVE_KNOTS = 12;

/**
 * Fetch rows from Convex in 14-day windows (stays under per-query limits).
 */
export async function fetchForecastExperimentWindow(convex, { locationSlug, kind, startAt, endAt }) {
  const rows = [];
  for (let cursor = startAt; cursor < endAt; cursor += CHUNK_MS) {
    const chunkEnd = Math.min(cursor + CHUNK_MS - 1, endAt - 1);
    const page =
      kind === "observations"
        ? await convex.query(api.forecastExperiment.listObservationsForWindow, {
            locationSlug,
            startAt: cursor,
            endAt: chunkEnd,
          })
        : await convex.query(api.forecastExperiment.listForecastPointsForWindow, {
            locationSlug,
            startAt: cursor,
            endAt: chunkEnd,
          });
    rows.push(...page);
  }
  return rows;
}

function rankByRegime(analysis, regime) {
  return Object.entries(analysis.byModel)
    .map(([model, scores]) => ({
      model,
      sampleCount: scores[regime].sampleCount,
      effectiveMae: scores[regime].effective?.mae,
    }))
    .filter((row) => Number.isFinite(row.effectiveMae) && row.sampleCount > 0)
    .sort((a, b) => a.effectiveMae - b.effectiveMae);
}

/**
 * Load obs + forecast from Convex, run skill analysis, return compact JSON-safe summary.
 */
export async function runModelSkillAnalysis(
  convex,
  {
    locationSlug = DEFAULT_LOCATION,
    startDateLocal,
    endDateLocal,
    seasonRanges = null,
    seasonId = null,
    filterMode = "all",
    minObservedEffectiveKnots = DEFAULT_MIN_OBSERVED_EFFECTIVE_KNOTS,
  }
) {
  const ranges =
    seasonRanges ??
    (startDateLocal && endDateLocal
      ? [{ startDateLocal, endDateLocal }]
      : null);

  if (!ranges?.length) {
    return { ok: false, error: "No analysis date range configured" };
  }

  let observations = [];
  let forecastPoints = [];

  for (const range of ranges) {
    const { startAt } = localDayWindowMs(range.startDateLocal);
    const { endAt } = localDayWindowMs(range.endDateLocal);

    observations.push(
      ...(await fetchForecastExperimentWindow(convex, {
        locationSlug,
        kind: "observations",
        startAt,
        endAt,
      }))
    );

    forecastPoints.push(
      ...(await fetchForecastExperimentWindow(convex, {
        locationSlug,
        kind: "forecast",
        startAt: startAt + 6 * 3_600_000,
        endAt,
      }))
    );
  }

  const window = inferAnalysisWindow({ observations, forecastPoints });
  if (!window) {
    return { ok: false, error: "No overlapping observation and forecast data found" };
  }

  const models = listModelsForSkillAnalysis(forecastPoints);
  if (models.length === 0) {
    return { ok: false, error: "No forecast models found in overlap window" };
  }

  const overlapDates = filterDatesToSeasonRanges(window.datesLocal, ranges);

  const analysisCommon = {
    observations,
    forecastPoints,
    models,
  };

  let analysisDates = overlapDates;
  let pairFilter = null;

  if (filterMode === "windy-nortada") {
    analysisDates = listWindyNortadaDates({
      observations,
      datesLocal: overlapDates,
      minEffectiveKnots: minObservedEffectiveKnots,
    });
    if (analysisDates.length === 0) {
      return {
        ok: false,
        error: `No windy nortada days (${minObservedEffectiveKnots}+ kt peak) found in this range`,
      };
    }
    pairFilter = windyNortadaPairFilter(minObservedEffectiveKnots);
  }

  const analysis = analyzeModelSkill({
    ...analysisCommon,
    datesLocal: analysisDates,
    pairFilter,
  });

  if (analysis.models.length === 0 || (analysis.totals?.overall ?? 0) === 0) {
    return {
      ok: false,
      error: "No comparable forecast hours after applying filters",
    };
  }

  const nortadaRanking = rankByRegime(analysis, "nortada");
  const nonNortadaRanking = rankByRegime(analysis, "nonNortada");
  const curveRanking = analysis.curveModels ?? rankModelsByCurve(analysis.byModel);

  let windClimatology = null;
  let comparison = null;

  if (filterMode === "all") {
    windClimatology = computeWindSpeedRegimeBreakdown({
      observations,
      datesLocal: overlapDates,
    });
  } else if (filterMode === "windy-nortada") {
    const baseline = analyzeModelSkill({
      ...analysisCommon,
      datesLocal: overlapDates,
      includeChartData: false,
      includeCurveMetrics: false,
    });
    const baselineWinner = baseline.models[0] ?? null;
    const filteredWinner = analysis.models[0] ?? null;
    comparison = {
      minObservedEffectiveKnots,
      daysInRange: overlapDates.length,
      windyNortadaDays: analysisDates.length,
      allHourSamples: baseline.totals?.overall ?? 0,
      filteredHourSamples: analysis.totals?.overall ?? 0,
      allHoursWinner: baselineWinner,
      filteredWinner,
      maeImprovementKt:
        Number.isFinite(baselineWinner?.effectiveMae) && Number.isFinite(filteredWinner?.effectiveMae)
          ? round1(baselineWinner.effectiveMae - filteredWinner.effectiveMae)
          : undefined,
    };
    windClimatology = computeWindSpeedRegimeBreakdown({
      observations,
      datesLocal: analysisDates,
    });
  }

  const rideabilityAnomalies =
    filterMode === "all"
      ? computeRideabilityAnomalies({
          datesLocal: overlapDates,
          observations,
          forecastPoints,
          models,
        })
      : null;

  return {
    ok: true,
    filterMode,
    locationSlug,
    seasonId,
    startDateLocal: ranges[0].startDateLocal,
    endDateLocal: ranges[ranges.length - 1].endDateLocal,
    seasonRanges: ranges,
    window: {
      startDateLocal: window.startDateLocal,
      endDateLocal: window.endDateLocal,
      daysAnalyzed: analysisDates.length,
      daysInRange: overlapDates.length,
    },
    modelsAnalyzed: models,
    analysis,
    nortadaRanking,
    nonNortadaRanking,
    curveRanking,
    winnerOverall: analysis.models[0] ?? null,
    winnerNortada: nortadaRanking[0] ?? null,
    winnerNonNortada: nonNortadaRanking[0] ?? null,
    winnerCurve: curveRanking[0] ?? null,
    windClimatology,
    comparison,
    rideabilityAnomalies,
  };
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

export { rankModels, rankModelsByCurve };
