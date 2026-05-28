import { filterDatesToSeasonRanges, summerSeasonRange } from "./analysisSeasons.js";
import { buildDayBacktest, computeErrorMinutes } from "./backtest.js";
import {
  ANALOG_MODEL_VERSION,
  buildAnalogBayWindPrediction,
  buildAnalogIndex,
} from "./analogKickIn.js";
import { buildBayWindPredictionV3 } from "./bayWindPredictionMl.js";
import { loadBayWindMlModel } from "./loadBayWindMlModel.js";
import { inferAnalysisWindow } from "./modelSkillAnalysis.js";
import { summarizePredictionBacktest } from "./predictionBacktest.js";
import { fetchForecastExperimentWindow } from "./runModelSkillAnalysis.js";
import { resolveRideabilityThreshold } from "./rideabilityThresholds.js";
import { localDayWindowMs } from "./time.js";

const DEFAULT_LOCATION = "cascais-bay";
const DEFAULT_TRAIN_YEAR = 2024;
const DEFAULT_TEST_YEAR = 2025;

function seasonDatesForYear(windowDates, year) {
  const range = summerSeasonRange(year);
  return filterDatesToSeasonRanges(windowDates, [range]);
}

function summarizeAnalogDays(days) {
  return summarizePredictionBacktest(
    days.map((day) => ({
      ...day,
      hasForecastData: day.hasForecastData !== false,
      predicted: day.predicted,
      actual: day.actual,
      errorMinutes: day.errorMinutes,
    }))
  );
}

function buildComparisonDay({
  dateLocal,
  marinaObservations,
  caboRasoObservations,
  forecastPoints,
  thresholdKnots,
  preset,
  analogIndex,
  mlModel,
  analogOptions = {},
}) {
  const { startAt, endAt } = localDayWindowMs(dateLocal);
  const baseDay = buildDayBacktest({
    dateLocal,
    marinaObservations,
    caboRasoObservations,
    forecastPoints,
    thresholdKnots,
    preset,
    buildPrediction: () => null,
  });

  const generatedAt = startAt + 7 * 3_600_000;
  const analogPrediction = buildAnalogBayWindPrediction({
    targetLocationSlug: DEFAULT_LOCATION,
    forecastDateLocal: dateLocal,
    generatedAt,
    points: forecastPoints,
    thresholdKnots,
    preset,
    analogIndex,
    ...analogOptions,
  });

  const mlPrediction = buildBayWindPredictionV3({
    targetLocationSlug: DEFAULT_LOCATION,
    forecastDateLocal: dateLocal,
    generatedAt,
    points: forecastPoints,
    caboRasoObservations: [],
    thresholdKnots,
    preset,
    model: mlModel,
    mode: "day-ahead",
  });

  return {
    dateLocal,
    actual: baseDay.actual,
    hasForecastData: baseDay.hasForecastData,
    analog: {
      predictedKickInAt: analogPrediction.predictedKickInAt,
      predictedStrongKickInAt: analogPrediction.predictedStrongKickInAt,
      sessionProbability: analogPrediction.inputs?.sessionProbability,
      neighborDates: analogPrediction.inputs?.neighborDates ?? [],
      errorMinutes: computeErrorMinutes(baseDay.actual.kickInAt, analogPrediction.predictedKickInAt),
    },
    ml: {
      modelVersion: mlPrediction.modelVersion,
      predictedKickInAt: mlPrediction.predictedKickInAt,
      sessionProbability: mlPrediction.inputs?.sessionProbability,
      errorMinutes: computeErrorMinutes(baseDay.actual.kickInAt, mlPrediction.predictedKickInAt),
    },
  };
}

export async function runAnalogHoldoutComparison(
  convex,
  {
    locationSlug = DEFAULT_LOCATION,
    trainYear = DEFAULT_TRAIN_YEAR,
    testYear = DEFAULT_TEST_YEAR,
    thresholdKnots,
    preset,
    analogOptions = {},
  }
) {
  const resolvedThreshold = resolveRideabilityThreshold({ thresholdKnots, preset });
  const trainRange = summerSeasonRange(trainYear);
  const testRange = summerSeasonRange(testYear);
  const loadStart = localDayWindowMs(trainRange.startDateLocal).startAt;
  const loadEnd = localDayWindowMs(testRange.endDateLocal).endAt;

  const [marinaObservations, caboRasoObservations, guinchoObservations, forecastPoints] =
    await Promise.all([
      fetchForecastExperimentWindow(convex, {
        locationSlug,
        kind: "observations",
        startAt: loadStart,
        endAt: loadEnd,
      }),
      fetchForecastExperimentWindow(convex, {
        locationSlug: "cabo-raso",
        kind: "observations",
        startAt: loadStart,
        endAt: loadEnd,
      }),
      fetchForecastExperimentWindow(convex, {
        locationSlug: "guincho",
        kind: "observations",
        startAt: loadStart,
        endAt: loadEnd,
      }),
      fetchForecastExperimentWindow(convex, {
        locationSlug,
        kind: "forecast",
        startAt: loadStart + 6 * 3_600_000,
        endAt: loadEnd,
      }),
    ]);

  const window = inferAnalysisWindow({ observations: marinaObservations, forecastPoints });
  if (!window) {
    return { ok: false, error: "No overlapping observation and forecast data found" };
  }

  const trainDates = seasonDatesForYear(window.datesLocal, trainYear);
  const testDates = seasonDatesForYear(window.datesLocal, testYear);

  const analogIndex = buildAnalogIndex({
    datesLocal: trainDates,
    forecastPoints,
    marinaObservations,
    caboRasoObservations,
    guinchoObservations,
    thresholdKnots: resolvedThreshold,
    preset,
    requireObservedLabels: true,
  });

  const mlModel = loadBayWindMlModel();
  const days = testDates.map((dateLocal) =>
    buildComparisonDay({
      dateLocal,
      marinaObservations,
      caboRasoObservations,
      forecastPoints,
      thresholdKnots: resolvedThreshold,
      preset,
      analogIndex,
      mlModel,
      analogOptions,
    })
  );

  const analogDays = days.map((day) => ({
    dateLocal: day.dateLocal,
    hasForecastData: day.hasForecastData,
    actual: day.actual,
    predicted: {
      predictedKickInAt: day.analog.predictedKickInAt,
      predictedStrongKickInAt: day.analog.predictedStrongKickInAt,
    },
    errorMinutes: day.analog.errorMinutes,
  }));

  const mlDays = days.map((day) => ({
    dateLocal: day.dateLocal,
    hasForecastData: day.hasForecastData,
    actual: day.actual,
    predicted: {
      predictedKickInAt: day.ml.predictedKickInAt,
    },
    errorMinutes: day.ml.errorMinutes,
  }));

  return {
    ok: true,
    trainYear,
    testYear,
    thresholdKnots: resolvedThreshold,
    analogIndexSize: analogIndex.length,
    testDayCount: days.length,
    analog: {
      modelVersion: ANALOG_MODEL_VERSION,
      summary: summarizeAnalogDays(analogDays),
      days: analogDays,
    },
    ml: {
      modelVersion: mlModel.modelVersion ?? "bay-wind-v3.6-ml",
      summary: summarizeAnalogDays(mlDays),
      days: mlDays,
    },
    comparisonDays: days,
  };
}
