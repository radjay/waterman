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
  // Caution reads as "borderline" where the accent-2 magenta read as "warning".
  // Note this diverges from the week strip, where a sub-60 band is still
  // painted in the accent-2 hue.
  MARGINAL: "caution",
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

/** Calendar day key in a given timezone, for same-day comparisons. */
const dayKey = (ms, timeZone) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));

/**
 * "Today" / "Tomorrow" / the weekday name.
 *
 * Naming the weekday when it IS today reads as a bug to a rider — "next window
 * Tuesday" on a Tuesday afternoon sounds like it means next week.
 */
export function relativeDay(ms, timeZone = "Europe/Lisbon", nowMs = Date.now()) {
  const target = dayKey(ms, timeZone);
  if (target === dayKey(nowMs, timeZone)) return "today";
  if (target === dayKey(nowMs + 24 * 60 * 60 * 1000, timeZone)) return "tomorrow";
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone }).format(new Date(ms));
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
  holdsUntil,
  agreement,
  stationDelta,
  nextWindowStart,
  timeZone = "Europe/Lisbon",
}) {
  // The spot name is in the verdict headline now ("GO @ Guincho"), so
  // repeating it here just says the same thing twice.
  if (verdict === VERDICT.GO) {
    return holdsUntil
      ? `Holding until about ${timeOfDay(holdsUntil, timeZone)}.`
      : null;
  }

  if (verdict === VERDICT.MARGINAL) {
    if (agreement?.band === BANDS.SPLIT) {
      return `Models split — ${agreement.agreed} of ${agreement.total} agree.`;
    }
    if (stationDelta >= 2) {
      return `The station is running ${Math.round(stationDelta)} kn over forecast.`;
    }
    return "Worth a look.";
  }

  // NO. The next-windows list below carries the "or else what", so the reason
  // only has to say that right now is not it.
  return nextWindowStart ? "Nothing on right now." : "Nothing on this week.";
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
