import { BANDS } from "./agreement";

/**
 * The verdict: can I go, right now.
 *
 * Derived, never stored. The reason string is generated here rather than in the
 * component so the copy stays consistent with the score, and so Now and the
 * (deferred) alerts evaluator cannot disagree about what "GO" means. That is
 * the whole point of it living in one place.
 *
 * Per sport, not per day. Switching sports can flip GO to NO on the same
 * weather; that is intended.
 */

export const VERDICT = {
  GO: "GO",
  MARGINAL: "MARGINAL",
  NO: "NO",
};

/** Which token the verdict paints with. */
export const VERDICT_TONE = {
  GO: "accent",
  MARGINAL: "marginal",
  NO: "dim",
};

/**
 * @param {object} input
 * @param {number|null} input.score - blended LLM score for the current slot
 * @param {object|null} input.agreement - from agreementFor()
 * @param {number|null} input.stationDelta - station knots minus forecast knots
 * @returns {"GO"|"MARGINAL"|"NO"}
 */
export function deriveVerdict({ score, agreement, stationDelta }) {
  const value = score ?? 0;
  const agreed = agreement?.agreed ?? 0;
  const total = agreement?.total ?? 0;
  const hasModels = total > 0 && agreement?.band !== BANDS.UNKNOWN;

  // Strong score with the models behind it.
  if (value >= 75 && (!hasModels || agreed >= 4)) return VERDICT.GO;

  // Strong score but the models are split — say so rather than promising a GO
  // the evidence does not support.
  if (value >= 75) return VERDICT.MARGINAL;

  if (value >= 60) return VERDICT.MARGINAL;

  // The station is the tiebreaker: forecast says middling, the water says more.
  if (value >= 50 && stationDelta !== null && stationDelta !== undefined && stationDelta >= 2) {
    return VERDICT.MARGINAL;
  }

  return VERDICT.NO;
}

const timeOfDay = (ms, timeZone) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(ms));

/**
 * The one line under the verdict. Server-generated so it cannot drift from the
 * number it is explaining.
 *
 * @returns {string}
 */
export function verdictReason({
  verdict,
  spotName,
  holdsUntil,
  agreement,
  stationDelta,
  nextWindowStart,
  timeZone = "Europe/Lisbon",
}) {
  const spot = (spotName || "").toUpperCase();

  if (verdict === VERDICT.GO) {
    if (holdsUntil) {
      return `${spot} · HOLDING UNTIL ABOUT ${timeOfDay(holdsUntil, timeZone)}`;
    }
    return spot;
  }

  if (verdict === VERDICT.MARGINAL) {
    if (agreement?.band === BANDS.SPLIT) {
      return `${spot} · MODELS SPLIT, ${agreement.agreed} OF ${agreement.total}`;
    }
    if (stationDelta >= 2) {
      return `${spot} · STATION RUNNING ${Math.round(stationDelta)} KN OVER FORECAST`;
    }
    return `${spot} · WORTH A LOOK`;
  }

  // NO. The screen pivots to the next window, so the reason should point there.
  if (nextWindowStart) {
    const day = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone }).format(
      new Date(nextWindowStart)
    );
    return `NOTHING ON · NEXT WINDOW ${day.toUpperCase()}`;
  }
  return "NOTHING ON THIS WEEK";
}

/**
 * Pick the spot Now speaks for: the best-scoring candidate right now.
 *
 * The spot name always appears in the caption because it is free to change from
 * hour to hour as conditions move down the coast. That is the intent — Now
 * answers "can I go", not "how is my usual spot".
 *
 * The cam and station shown MUST come from the returned spot; a verdict for one
 * spot beside another spot's cam would be actively misleading.
 */
export function pickNowSpot(candidates) {
  if (!candidates || candidates.length === 0) return null;
  return candidates.reduce((best, candidate) =>
    (candidate.score ?? -1) > (best.score ?? -1) ? candidate : best
  );
}
