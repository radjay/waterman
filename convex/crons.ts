import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up expired magic links daily at 3 AM
crons.daily(
  "cleanup expired magic links",
  { hourUTC: 3, minuteUTC: 0 },
  internal.auth.cleanupExpiredMagicLinks,
  {}
);

// Clean up expired sessions daily at 3:30 AM
crons.daily(
  "cleanup expired sessions",
  { hourUTC: 3, minuteUTC: 30 },
  internal.auth.cleanupExpiredSessions,
  {}
);

// Live station readings. Five minutes matches the stations' own cadence.
// This runs in Convex rather than as a Render worker deliberately: the
// forecast-experiment observations worker died on 2026-06-10 and went
// unnoticed for eight weeks, because it was a separate service that could
// stop without anything noticing.
crons.interval(
  "poll windguru stations",
  { minutes: 5 },
  internal.stations.pollStations,
  {}
);

// Drop system scores outside the 2-back / 7-forward read window so hot
// queries cannot grow back into the 32k-document limit.
crons.daily(
  "retain condition scores",
  { hourUTC: 4, minuteUTC: 0 },
  internal.scoreRetention.retainConditionScores,
  {}
);

export default crons;
