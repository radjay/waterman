import { bayLagMinutesFromCaboRaso } from "./prediction.js";
import { effectiveWindKnots } from "./units.js";

/** Historical backfill marks rows stale; backtests and labels treat those as usable. */
export function normalizeObservationsForBacktest(observations) {
  return (observations ?? [])
    .filter((obs) => obs.quality !== "nodata")
    .map((obs) => ({
      ...obs,
      quality: "ok",
    }));
}

export function buildDailyLabel({
  locationSlug,
  dateLocal,
  observations,
  reports,
  thresholdKnots,
  caboRasoObservations = [],
}) {
  const cleanObservations = normalizeObservationsForBacktest(observations)
    .filter((obs) => effectiveWindKnots(obs) !== undefined)
    .sort((a, b) => a.observedAt - b.observedAt);

  if (cleanObservations.length > 0) {
    return labelFromObservations({ locationSlug, dateLocal, observations: cleanObservations, thresholdKnots });
  }

  const cleanReports = reports
    .filter((report) => ["not_in", "marginal", "rideable", "strong"].includes(report.status))
    .sort((a, b) => a.observedAt - b.observedAt);

  if (cleanReports.length > 0) {
    return labelFromReports({ locationSlug, dateLocal, reports: cleanReports, thresholdKnots });
  }

  if (locationSlug === "cascais-bay" && caboRasoObservations.length > 0) {
    return labelFromCaboRasoLag({
      locationSlug,
      dateLocal,
      caboRasoObservations,
      thresholdKnots,
    });
  }

  return {
    locationSlug,
    sport: "wingfoil",
    dateLocal,
    thresholdKnots,
    sourceConfidence: 0,
    labelStatus: "insufficient-data",
    sourceSummary: "No valid observations, user reports, or lag inference were available.",
  };
}

function labelFromObservations({ locationSlug, dateLocal, observations, thresholdKnots }) {
  const sustained = firstSustainedCrossing(observations, thresholdKnots);
  const rideable = observations.filter((obs) => effectiveWindKnots(obs) >= thresholdKnots);
  const max = observations.reduce((best, obs) => {
    const value = effectiveWindKnots(obs);
    if (value === undefined) return best;
    if (!best || value > effectiveWindKnots(best)) return obs;
    return best;
  }, null);

  return {
    locationSlug,
    sport: "wingfoil",
    dateLocal,
    thresholdKnots,
    actualKickInAt: sustained?.observedAt,
    actualKickOutAt: rideable.length > 0 ? rideable[rideable.length - 1].observedAt : undefined,
    peakStartAt: max?.observedAt,
    peakEndAt: max ? max.observedAt + 60 * 60_000 : undefined,
    maxWindKnots: max ? effectiveWindKnots(max) : undefined,
    maxGustKnots: max?.windGustKnots,
    sourceConfidence: sustained ? 0.95 : 0.8,
    labelStatus: sustained ? "observed" : "no-kick",
    sourceSummary: sustained
      ? `Station observations crossed ${thresholdKnots} kt effective at ${new Date(sustained.observedAt).toISOString()}.`
      : `Station observations did not sustain ${thresholdKnots} kt effective.`,
  };
}

function labelFromReports({ locationSlug, dateLocal, reports, thresholdKnots }) {
  const positive = reports.find((report) => report.status === "rideable" || report.status === "strong");
  return {
    locationSlug,
    sport: "wingfoil",
    dateLocal,
    thresholdKnots,
    actualKickInAt: positive?.observedAt,
    sourceConfidence: positive ? Math.min(0.75, positive.confidence ?? 0.6) : 0.55,
    labelStatus: positive ? "report-assisted" : "no-kick",
    sourceSummary: positive
      ? `User report marked the bay ${positive.status} at ${new Date(positive.observedAt).toISOString()}.`
      : "User reports did not mark the bay as rideable.",
  };
}

function labelFromCaboRasoLag({ locationSlug, dateLocal, caboRasoObservations, thresholdKnots }) {
  const clean = normalizeObservationsForBacktest(caboRasoObservations)
    .filter((obs) => effectiveWindKnots(obs) !== undefined)
    .sort((a, b) => a.observedAt - b.observedAt);
  const sustained = firstSustainedCrossing(clean, thresholdKnots);
  if (!sustained) {
    return {
      locationSlug,
      sport: "wingfoil",
      dateLocal,
      thresholdKnots,
      sourceConfidence: 0.5,
      labelStatus: "no-kick",
      sourceSummary: "Cabo Raso did not sustain rideable effective wind for bay lag inference.",
    };
  }

  const lagMinutes = bayLagMinutesFromCaboRaso(sustained);
  const inferredKickIn = sustained.observedAt + lagMinutes * 60_000;

  return {
    locationSlug,
    sport: "wingfoil",
    dateLocal,
    thresholdKnots,
    actualKickInAt: inferredKickIn,
    sourceConfidence: 0.7,
    labelStatus: "lag-inferred",
    sourceSummary: `Cabo Raso crossed ${thresholdKnots} kt effective at ${new Date(sustained.observedAt).toISOString()}; inferred bay kick-in after ${lagMinutes} min.`,
  };
}

export function firstSustainedCrossing(observations, thresholdKnots) {
  for (let index = 0; index < observations.length - 1; index += 1) {
    const current = observations[index];
    const next = observations[index + 1];
    const currentEffective = effectiveWindKnots(current);
    const nextEffective = effectiveWindKnots(next);
    if (
      currentEffective >= thresholdKnots &&
      nextEffective >= thresholdKnots &&
      next.observedAt - current.observedAt <= 45 * 60_000
    ) {
      return current;
    }
  }
  return undefined;
}
