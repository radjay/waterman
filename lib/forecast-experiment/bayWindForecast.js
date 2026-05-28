import {
  DEFAULT_BAY_WIND_COEFFICIENTS,
  estimateBayLagMinutes,
} from "./bayWindCoefficients.js";
import { buildBayWindPredictionV3 } from "./bayWindPredictionMl.js";
import {
  ANALOG_MODEL_VERSION,
  buildAnalogBayWindPrediction,
} from "./analogKickIn.js";
import { firstSustainedCrossing } from "./labels.js";
import {
  clampKickInToRidingWindow,
  ridingWindowBounds,
  timelineSustainedKickIn,
} from "./ridingWindow.js";
import { effectiveWindKnots } from "./units.js";

export const BAY_WIND_FORECAST_MODEL_VERSION = "bay-wind-forecast-v1";

function applyDayAheadKickInFloors(ml, dateLocal, { startMs, endMs, medianMs }) {
  const { windowStart, windowEnd } = ridingWindowBounds(dateLocal);
  const timelineFloor = timelineSustainedKickIn(
    ml.probabilityTimeline ?? [],
    windowStart,
    windowEnd,
    ml.inputs?.kickInThreshold ?? 0.5
  );

  const clamp = (ms) =>
    ms != null ? clampKickInToRidingWindow(ms, dateLocal) : undefined;

  let start = clamp(startMs);
  let end = clamp(endMs);
  let median = clamp(medianMs);

  if (timelineFloor) {
    if (start != null) start = Math.max(start, timelineFloor);
    if (end != null) end = Math.max(end, timelineFloor);
    if (median != null) median = Math.max(median, timelineFloor);
  }

  if (start != null && end != null && end < start) {
    const point = median ?? end ?? start;
    return { startMs: point, endMs: point, medianMs: point };
  }

  return { startMs: start, endMs: end, medianMs: median ?? start };
}

/** Day-ahead: ML session gate + analog kick-in window. */
export function buildDayAheadBayWindPrediction({
  targetLocationSlug,
  forecastDateLocal,
  generatedAt,
  points,
  thresholdKnots,
  preset,
  model,
  analogIndex,
  analogOptions = {},
}) {
  const ml = buildBayWindPredictionV3({
    targetLocationSlug,
    forecastDateLocal,
    generatedAt,
    points,
    caboRasoObservations: [],
    thresholdKnots,
    preset,
    model,
    mode: "day-ahead",
  });

  const analog = buildAnalogBayWindPrediction({
    targetLocationSlug,
    forecastDateLocal,
    generatedAt,
    points,
    thresholdKnots,
    preset,
    analogIndex,
    ...analogOptions,
  });

  const mlSessionProbability = ml.inputs?.sessionProbability ?? 0;
  const mlSessionThreshold = ml.inputs?.sessionThreshold ?? 0.55;
  const analogSessionProbability = analog.inputs?.sessionProbability ?? 0;
  const mlSessionAllowed = mlSessionProbability >= mlSessionThreshold;
  const analogSessionAllowed = analogSessionProbability >= (analogOptions.sessionThreshold ?? 0.6);
  const flatForecast = analog.inputs?.flatForecast === true;
  const analogReady = Array.isArray(analogIndex) && analogIndex.length > 0;

  const showAnalogKickIn =
    analogReady &&
    mlSessionAllowed &&
    analogSessionAllowed &&
    !flatForecast &&
    analog.predictedKickInAt;
  const showMlKickIn = mlSessionAllowed && ml.predictedKickInAt;
  const showKickIn = showAnalogKickIn || (!analogReady && showMlKickIn);

  const analogWindow = showAnalogKickIn
    ? applyDayAheadKickInFloors(ml, forecastDateLocal, {
        startMs: analog.inputs?.kickInWindowStartMs,
        endMs: analog.inputs?.kickInWindowEndMs,
        medianMs: analog.inputs?.kickInWindowMedianMs ?? analog.predictedKickInAt,
      })
    : null;

  const mlKickInAt =
    showMlKickIn && !showAnalogKickIn
      ? clampKickInToRidingWindow(ml.predictedKickInAt, forecastDateLocal)
      : undefined;

  return {
    ...ml,
    modelVersion: BAY_WIND_FORECAST_MODEL_VERSION,
    predictedKickInAt: showAnalogKickIn
      ? analogWindow?.medianMs
      : mlKickInAt,
    predictedStrongKickInAt: showAnalogKickIn
      ? analog.predictedStrongKickInAt
      : showKickIn
        ? ml.predictedStrongKickInAt
        : undefined,
    summary: showAnalogKickIn
      ? `Day-ahead analog kick-in gated by ML session (${BAY_WIND_FORECAST_MODEL_VERSION}).`
      : showKickIn
        ? ml.summary
        : ml.summary,
    inputs: {
      ...ml.inputs,
      layer: "day-ahead",
      analogModelVersion: analogReady ? ANALOG_MODEL_VERSION : undefined,
      analogReady,
      mlSessionProbability,
      mlSessionThreshold,
      analogSessionProbability: analogReady ? analogSessionProbability : undefined,
      flatForecast: analogReady ? flatForecast : undefined,
      kickInWindowStartMs: showAnalogKickIn ? analogWindow?.startMs : undefined,
      kickInWindowEndMs: showAnalogKickIn ? analogWindow?.endMs : undefined,
      kickInWindowMedianMs: showAnalogKickIn ? analogWindow?.medianMs : undefined,
      neighborDates: showAnalogKickIn ? analog.inputs?.neighborDates : undefined,
      predictedKickInMinutes: showAnalogKickIn
        ? analog.inputs?.predictedKickInMinutes
        : ml.inputs?.predictedKickInMinutes,
    },
  };
}

/** Same-day nowcast: ML timeline + Cabo lag floor (bay cannot kick in before Cabo fills in). */
export function buildNowcastBayWindPrediction({
  targetLocationSlug,
  forecastDateLocal,
  generatedAt,
  points,
  caboRasoObservations = [],
  thresholdKnots,
  preset,
  model,
  nowcastModel,
  coefficients = DEFAULT_BAY_WIND_COEFFICIENTS,
}) {
  const ml = buildBayWindPredictionV3({
    targetLocationSlug,
    forecastDateLocal,
    generatedAt,
    points,
    caboRasoObservations,
    thresholdKnots,
    preset,
    model,
    nowcastModel,
    mode: "nowcast",
  });

  return applyCaboLagFloorToNowcast(ml, {
    caboRasoObservations,
    thresholdKnots: ml.thresholdKnots,
    coefficients,
  });
}

export function applyCaboLagFloorToNowcast(
  prediction,
  { caboRasoObservations = [], thresholdKnots, coefficients = DEFAULT_BAY_WIND_COEFFICIENTS }
) {
  const sortedCabo = [...caboRasoObservations].sort((a, b) => a.observedAt - b.observedAt);
  const sustained = firstSustainedCrossing(sortedCabo, thresholdKnots);
  if (!sustained) {
    return {
      ...prediction,
      inputs: {
        ...prediction.inputs,
        layer: "nowcast",
      },
    };
  }

  const forecastPeak = (prediction.probabilityTimeline ?? []).reduce(
    (peak, row) => Math.max(peak, row.expectedWindKnots ?? 0),
    0
  );
  const lagMinutes = estimateBayLagMinutes({
    caboEffectiveKnots: effectiveWindKnots(sustained),
    forecastPeakKnots: forecastPeak,
    coefficients,
  });
  const caboLagFloorMs = sustained.observedAt + lagMinutes * 60_000;
  const dateLocal = prediction.forecastDateLocal;
  const { windowStart, windowEnd } = ridingWindowBounds(dateLocal);

  let predictedKickInAt = prediction.predictedKickInAt;
  if (
    caboLagFloorMs >= windowStart &&
    caboLagFloorMs <= windowEnd &&
    (predictedKickInAt == null || predictedKickInAt < caboLagFloorMs)
  ) {
    predictedKickInAt = caboLagFloorMs;
  }

  return {
    ...prediction,
    modelVersion: BAY_WIND_FORECAST_MODEL_VERSION,
    predictedKickInAt,
    inputs: {
      ...prediction.inputs,
      layer: "nowcast",
      caboLagFloorMs,
      caboLagMinutes: lagMinutes,
    },
  };
}
