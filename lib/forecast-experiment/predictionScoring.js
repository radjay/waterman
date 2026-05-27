import { buildDailyLabel } from "./labels.js";
import { computeErrorMinutes } from "./backtest.js";
import { localDayWindowMs, localDateKey } from "./time.js";

const RIDEABLE_LABEL_STATUSES = new Set(["observed", "report-assisted", "lag-inferred"]);

export function isRideableLabel(label) {
  return RIDEABLE_LABEL_STATUSES.has(label.labelStatus) && label.actualKickInAt != null;
}

export function isPredictedRideable(prediction) {
  return prediction?.kickInP50At != null;
}

export function resolveLabelForScoring({
  label,
  observations,
  reports,
  caboRasoObservations,
  thresholdKnots,
}) {
  if (label && label.labelStatus !== "insufficient-data") {
    return label;
  }

  if (reports.length === 0 && observations.length === 0) {
    return label;
  }

  return buildDailyLabel({
    locationSlug: label?.locationSlug ?? "cascais-bay",
    dateLocal: label?.dateLocal,
    observations,
    reports,
    caboRasoObservations,
    thresholdKnots,
  });
}

export function selectDayPrediction(predictions, { forecastDateLocal, modelVersion, thresholdKnots }) {
  const candidates = predictions.filter(
    (prediction) =>
      prediction.forecastDateLocal === forecastDateLocal &&
      prediction.modelVersion === modelVersion &&
      prediction.thresholdKnots === thresholdKnots
  );
  if (candidates.length === 0) return undefined;
  return candidates.sort((a, b) => a.generatedAt - b.generatedAt)[0];
}

export function scorePredictionDay({ label, prediction }) {
  const actualRideable = isRideableLabel(label);
  const predictedRideable = isPredictedRideable(prediction);
  const kickInErrorMinutes = computeErrorMinutes(label.actualKickInAt, prediction?.kickInP50At);
  const rideableOutcome = actualRideable ? 1 : 0;
  const rideableProbability = predictedRideable ? 1 : 0;

  return {
    comparable: actualRideable && predictedRideable && Number.isFinite(kickInErrorMinutes),
    actualRideable,
    predictedRideable,
    kickInErrorMinutes,
    rideableOutcome,
    rideableProbability,
    falsePositive: predictedRideable && !actualRideable,
    falseNegative: actualRideable && !predictedRideable,
    labelStatus: label.labelStatus,
    sourceConfidence: label.sourceConfidence,
    // Phase 5: surface the prediction mode (day-ahead vs nowcast) for separate tracking.
    predictionMode: prediction?.inputs?.mode ?? null,
  };
}

export function summarizePredictionScores(dayScores) {
  const comparable = dayScores.filter((row) => row.comparable);
  const kickInErrors = comparable
    .map((row) => row.kickInErrorMinutes)
    .filter(Number.isFinite);
  const rideableRows = dayScores.filter((row) => row.labelStatus !== "insufficient-data");
  const hits = rideableRows.filter((row) => row.actualRideable === row.predictedRideable).length;

  const rideableBrier =
    rideableRows.length > 0
      ? rideableRows.reduce((sum, row) => {
          const outcome = row.actualRideable ? 1 : 0;
          const probability = row.predictedRideable ? 1 : 0;
          return sum + (probability - outcome) ** 2;
        }, 0) / rideableRows.length
      : undefined;

  return {
    daysScored: dayScores.length,
    daysComparable: comparable.length,
    kickInMaeMinutes:
      kickInErrors.length > 0
        ? Math.round(
            kickInErrors.reduce((sum, value) => sum + Math.abs(value), 0) / kickInErrors.length
          )
        : undefined,
    rideableHitRate:
      rideableRows.length > 0
        ? Math.round((hits / rideableRows.length) * 1000) / 1000
        : undefined,
    rideableBrier: rideableBrier != null ? Math.round(rideableBrier * 1000) / 1000 : undefined,
    falsePositiveCount: dayScores.filter((row) => row.falsePositive).length,
    falseNegativeCount: dayScores.filter((row) => row.falseNegative).length,
    withinHourCount: kickInErrors.filter((value) => Math.abs(value) <= 60).length,
  };
}

export function dateRangeFromDaysBack(now, daysBack, timezone) {
  const dates = [];
  for (let offset = 1; offset <= daysBack; offset += 1) {
    const dayMs = now - offset * 24 * 60 * 60_000;
    dates.push(localDateKey(dayMs, timezone));
  }
  return dates.sort();
}

export function observationsForDate(observations, dateLocal, timezone) {
  const { startAt, endAt } = localDayWindowMs(dateLocal, timezone);
  return observations.filter((obs) => obs.observedAt >= startAt && obs.observedAt < endAt);
}

export function windowBoundsForDates(datesLocal, timezone) {
  if (datesLocal.length === 0) {
    return { startAt: 0, endAt: 0, startDateLocal: "", endDateLocal: "" };
  }
  const sorted = [...datesLocal].sort();
  const { startAt } = localDayWindowMs(sorted[0], timezone);
  const { endAt } = localDayWindowMs(sorted[sorted.length - 1], timezone);
  return {
    startAt: startAt - 2 * 3_600_000,
    endAt: endAt + 2 * 3_600_000,
    startDateLocal: sorted[0],
    endDateLocal: sorted[sorted.length - 1],
  };
}
