/** Days of system scores to keep behind "now". Matches getConditionScoresForSpotSport. */
export const SCORE_CUTOFF_DAYS = 2;
/** Days of system scores to keep ahead of "now". Matches getConditionScoresForSpotSport. */
export const SCORE_FUTURE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export function scoreRetentionBounds(now) {
  return {
    cutoffLow: now - SCORE_CUTOFF_DAYS * DAY_MS,
    cutoffHigh: now + SCORE_FUTURE_DAYS * DAY_MS,
  };
}

/**
 * System scores outside the read window may be deleted.
 * Personalized scores (userId set) stay even when the hour is outside the window.
 */
export function shouldDeleteExpiredSystemScore(row, bounds) {
  if (row == null || typeof row !== "object") return false;
  if (row.userId !== null && row.userId !== undefined) return false;
  if (!Number.isFinite(row.timestamp)) return false;
  return row.timestamp < bounds.cutoffLow || row.timestamp > bounds.cutoffHigh;
}
