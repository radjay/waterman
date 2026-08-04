/**
 * Surf criteria matching, for the Confidence screen's surf variant.
 *
 * The model grid is hidden for surfing: Windy.app serves wave data from
 * separate models and it is byte-identical across all five wind models, so
 * there is no swell spread to show. What surf has instead is a richer set of
 * per-slot criteria than wing does — spotConfigs carries swell height bounds,
 * period, swell direction and optimal tide.
 *
 * So the question shifts from "how many models agree" to "how many conditions
 * line up", which is the same question with different evidence.
 */

import { isDirectionInRange } from "./criteria";

const oneDecimal = (n) => Math.round(n * 10) / 10;

/**
 * Build the criteria rows for a slot.
 *
 * `met` is tri-state: true, false, or null for "this spot does not specify it".
 * A null renders as track-coloured rather than as a failure — an unspecified
 * criterion is not an unmet one.
 *
 * @param {object} slot - forecast slot with wave fields
 * @param {object} config - spotConfigs row for this spot/sport
 * @param {object|null} tide - { state: "high"|"low"|"mid" }
 * @returns {Array<{label:string,value:string,met:boolean|null,range:string}>}
 */
export function surfCriteria(slot, config, tide) {
  if (!slot || !config) return [];

  const rows = [];

  const height = slot.waveHeight;
  if (height !== null && height !== undefined) {
    const min = config.minSwellHeight;
    const max = config.maxSwellHeight;
    const hasBounds = min !== undefined || max !== undefined;
    rows.push({
      label: "SWELL",
      value: `${oneDecimal(height)} m`,
      met: hasBounds
        ? height >= (min ?? 0) && height <= (max ?? Infinity)
        : null,
      range: hasBounds ? `${min ?? 0}–${max ?? "∞"} m` : "not specified",
    });
  }

  const period = slot.wavePeriod;
  if (period !== null && period !== undefined) {
    const min = config.minPeriod;
    rows.push({
      label: "PERIOD",
      value: `${Math.round(period)} s`,
      met: min !== undefined ? period >= min : null,
      range: min !== undefined ? `${min}s+` : "not specified",
    });
  }

  const swellDir = slot.waveDirection;
  if (swellDir !== null && swellDir !== undefined) {
    const from = config.swellDirectionFrom;
    const to = config.swellDirectionTo;
    const hasRange = from !== undefined && to !== undefined;
    rows.push({
      label: "SWELL DIR",
      value: `${Math.round(swellDir)}°`,
      met: hasRange ? isDirectionInRange(swellDir, from, to) : null,
      range: hasRange ? `${from}°–${to}°` : "not specified",
    });
  }

  if (tide?.state) {
    const optimal = config.optimalTide;
    rows.push({
      label: "TIDE",
      value: tide.state.toUpperCase(),
      met:
        optimal === undefined || optimal === null
          ? null
          : optimal === "both" || optimal === tide.state,
      range: optimal ? `${optimal}` : "not specified",
    });
  }

  return rows;
}

/**
 * The confidence line for surf.
 *
 * It must never claim model agreement it cannot show — for surfing there is no
 * model spread, so the sentence reads from criteria matched instead.
 */
export function surfConfidenceLabel(criteria) {
  const specified = criteria.filter((c) => c.met !== null);
  if (specified.length === 0) return { label: "Unknown", reason: "This spot has no surf criteria set." };

  const matched = specified.filter((c) => c.met).length;
  const ratio = matched / specified.length;

  if (ratio === 1) {
    return { label: "High confidence", reason: `All ${specified.length} conditions line up.` };
  }
  if (ratio >= 0.6) {
    return {
      label: "Some confidence",
      reason: `${matched} of ${specified.length} conditions line up.`,
    };
  }
  return {
    label: "Low confidence",
    reason: `Only ${matched} of ${specified.length} conditions line up.`,
  };
}
