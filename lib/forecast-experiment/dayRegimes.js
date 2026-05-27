/**
 * Day-level regime classification for Phase 1.2 analysis.
 *
 * Heuristics (from the Phase 2 plan):
 * - nortada: Cabo sustained ≥ threshold before 12:00, bay kicks later
 * - flat: No bay kick, Cabo weak
 * - sea-breeze: Late bay kick, weak Cabo morning
 * - other: Residual
 */

import { localDayWindowMs } from "./time.js";
import { effectiveWindKnots } from "./units.js";
import { firstSustainedCrossing } from "./labels.js";

const DEFAULT_TIMEZONE = "Europe/Lisbon";
const MORNING_END_HOUR = 12;
const LATE_KICK_START_HOUR = 14; // after 14:00 is "late" for this heuristic
const WEAK_CABO_THRESHOLD_FACTOR = 0.8; // Cabo peak < 80% of bay threshold is "weak"

export const REGIME_NORTADA = "nortada";
export const REGIME_FLAT = "flat";
export const REGIME_SEA_BREEZE = "sea-breeze";
export const REGIME_OTHER = "other";

/**
 * Returns true if Cabo had a sustained crossing before `endHourLocal` (Lisbon local time).
 */
function hadSustainedCaboBeforeHour(caboObservations, thresholdKnots, endHourLocal, dateLocal, timezone = DEFAULT_TIMEZONE) {
  const { startAt } = localDayWindowMs(dateLocal, timezone);
  const cutoffAt = startAt + endHourLocal * 3_600_000;

  const earlyCabo = (caboObservations || []).filter((o) => o.observedAt < cutoffAt);
  return !!firstSustainedCrossing(earlyCabo, thresholdKnots);
}

/**
 * Classify a single day into a regime.
 *
 * @param {Object} params
 * @param {Object} params.label - fx_daily_labels row for the day (cascais-bay)
 * @param {Array} params.caboObservations - hourly or raw Cabo observations for the day
 * @param {number} params.thresholdKnots
 * @param {string} [params.timezone]
 * @returns {string} one of REGIME_*
 */
export function classifyDayRegime({
  label,
  caboObservations = [],
  thresholdKnots,
  timezone = DEFAULT_TIMEZONE,
}) {
  const hasBayKick = !!label?.actualKickInAt;
  let kickInHourLocal = null;

  if (hasBayKick) {
    const kickDate = new Date(label.actualKickInAt);
    // Lisbon is UTC+0 standard / UTC+1 daylight. For analysis we use a simple offset.
    // Better would be to use Intl.DateTimeFormat with 'Europe/Lisbon'.
    const offsetHours = 1; // conservative for now
    kickInHourLocal = (kickDate.getUTCHours() + offsetHours + 24) % 24;
  }

  // Clean Cabo observations
  const cleanCabo = (caboObservations || [])
    .filter((o) => o.quality === "ok")
    .map((o) => ({
      ...o,
      effective: effectiveWindKnots(o),
    }))
    .filter((o) => o.effective != null);

  if (cleanCabo.length === 0) {
    return REGIME_OTHER;
  }

  const caboPeak = Math.max(...cleanCabo.map((o) => o.effective));
  const caboSustainedEarly = hadSustainedCaboBeforeHour(
    cleanCabo,
    thresholdKnots,
    MORNING_END_HOUR,
    label.dateLocal,
    timezone
  );

  const caboWeakMorning = caboPeak < thresholdKnots * WEAK_CABO_THRESHOLD_FACTOR;

  if (!hasBayKick) {
    if (caboPeak < thresholdKnots * 0.7) {
      return REGIME_FLAT;
    }
    return REGIME_OTHER;
  }

  const isLateKick = kickInHourLocal != null && kickInHourLocal >= LATE_KICK_START_HOUR;

  if (caboSustainedEarly && isLateKick) {
    return REGIME_NORTADA;
  }

  if (isLateKick && caboWeakMorning) {
    return REGIME_SEA_BREEZE;
  }

  return REGIME_OTHER;
}

/**
 * Tag an array of daily labels with regimes for a season.
 * Returns a map dateLocal -> regime.
 */
export function tagSeasonRegimes({
  labels,
  caboObservationsByDate, // { dateLocal: [...] }
  thresholdKnots,
}) {
  const tagged = {};
  for (const label of labels) {
    const date = label.dateLocal;
    const cabo = caboObservationsByDate?.[date] || [];
    tagged[date] = classifyDayRegime({
      label,
      caboObservations: cabo,
      thresholdKnots,
    });
  }
  return tagged;
}

export const REGIMES = [REGIME_NORTADA, REGIME_FLAT, REGIME_SEA_BREEZE, REGIME_OTHER];

/**
 * Compute per-regime counts and false positive/negative rates.
 * Expects an array of day objects that have at minimum:
 *   { dateLocal, regime, predictedRideable, actualRideable }
 *
 * Returns an object with counts and FP/FN rates per regime.
 */
export function computeRegimeStats(days) {
  const stats = {};
  for (const r of REGIMES) {
    stats[r] = { count: 0, falsePositive: 0, falseNegative: 0, truePositive: 0, trueNegative: 0 };
  }

  for (const day of days) {
    const r = day.regime || REGIME_OTHER;
    if (!stats[r]) continue;

    stats[r].count += 1;

    const pred = !!day.predictedRideable;
    const actual = !!day.actualRideable;

    if (pred && !actual) stats[r].falsePositive += 1;
    if (!pred && actual) stats[r].falseNegative += 1;
    if (pred && actual) stats[r].truePositive += 1;
    if (!pred && !actual) stats[r].trueNegative += 1;
  }

  // Add rates
  for (const r of REGIMES) {
    const s = stats[r];
    s.falsePositiveRate = s.count > 0 ? s.falsePositive / s.count : 0;
    s.precision = (s.truePositive + s.falsePositive) > 0 
      ? s.truePositive / (s.truePositive + s.falsePositive) 
      : 0;
  }

  return stats;
}