import { localDayWindowMs } from "./time.js";

export const RIDING_WINDOW_START_HOUR = 8;
export const RIDING_WINDOW_END_HOUR = 20;
export const RIDING_WINDOW_TIMEZONE = "Europe/Lisbon";

export function ridingWindowBounds(dateLocal, timezone = RIDING_WINDOW_TIMEZONE) {
  const { startAt } = localDayWindowMs(dateLocal, timezone);
  return {
    startAt,
    windowStart: startAt + RIDING_WINDOW_START_HOUR * 3_600_000,
    windowEnd: startAt + RIDING_WINDOW_END_HOUR * 3_600_000,
  };
}

export function isWithinRidingWindow(timestamp, dateLocal, timezone = RIDING_WINDOW_TIMEZONE) {
  if (!Number.isFinite(timestamp)) return false;
  const { windowStart, windowEnd } = ridingWindowBounds(dateLocal, timezone);
  return timestamp >= windowStart && timestamp <= windowEnd;
}

/** First hour with two consecutive rideable probabilities (matches sustained label logic). */
export function timelineSustainedKickIn(
  probabilityTimeline,
  windowStart,
  windowEnd,
  kickInThreshold
) {
  const inWindow = probabilityTimeline.filter(
    (row) => row.time >= windowStart && row.time <= windowEnd
  );
  for (let index = 0; index < inWindow.length - 1; index += 1) {
    if (
      inWindow[index].rideableProbability >= kickInThreshold &&
      inWindow[index + 1].rideableProbability >= kickInThreshold
    ) {
      return inWindow[index].time;
    }
  }
  return inWindow.find((row) => row.rideableProbability >= kickInThreshold)?.time;
}

/** Kick-in: hourly sustained timeline is the floor; regressor adds sub-hour detail when not earlier. */
export function resolveKickInInRidingWindow({
  dateLocal,
  kickInMinutes,
  probabilityTimeline = [],
  kickInThreshold = 0.5,
  sessionAllowed = true,
  timezone = RIDING_WINDOW_TIMEZONE,
}) {
  if (!sessionAllowed) return undefined;

  const { startAt, windowStart, windowEnd } = ridingWindowBounds(dateLocal, timezone);

  const timelineKickIn = timelineSustainedKickIn(
    probabilityTimeline,
    windowStart,
    windowEnd,
    kickInThreshold
  );

  let fromRegressor;
  if (kickInMinutes != null) {
    const candidate = startAt + kickInMinutes * 60_000;
    if (candidate >= windowStart && candidate <= windowEnd) {
      fromRegressor = candidate;
    }
  }

  if (timelineKickIn != null && fromRegressor != null) {
    return fromRegressor >= timelineKickIn ? fromRegressor : timelineKickIn;
  }

  if (fromRegressor != null) {
    return fromRegressor;
  }

  return timelineKickIn;
}
