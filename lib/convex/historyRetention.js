const DAY_MS = 24 * 60 * 60 * 1000;

/** Days of station, forecast-archive, and fx history to keep in Convex. */
export const HISTORY_KEEP_DAYS = 30;
/** Scoring prompt logs are debug-only and huge. Keep a short window. */
export const SCORING_LOG_KEEP_DAYS = 7;

export function historyCutoff(now, days = HISTORY_KEEP_DAYS) {
  return now - days * DAY_MS;
}

export function scoringLogCutoff(now) {
  return historyCutoff(now, SCORING_LOG_KEEP_DAYS);
}

/** True when the row's time field is older than the cutoff. */
export function isOlderThanCutoff(row, timeField, cutoff) {
  if (row == null || typeof row !== "object") return false;
  const t = row[timeField];
  if (!Number.isFinite(t)) return false;
  return t < cutoff;
}
