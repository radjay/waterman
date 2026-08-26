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

// Drop history older than 30 days (scoring logs: 7 days). Full copy is in
// archive/ and R2 waterman-archive.
crons.daily(
  "retain history",
  { hourUTC: 4, minuteUTC: 20 },
  internal.historyRetention.retainHistory,
  {}
);

// Forecast scrape. Same UTC hours as the old Render waterman-scraper.
crons.cron(
  "scrape forecasts",
  "0 0,6,12,18 * * *",
  internal.ingest.scrapeAllSpots
);

// Forecast-experiment ingest. Split the old combined labels Render job so
// each step can finish before the next starts.
crons.hourly(
  "fx openmeteo runs",
  { minuteUTC: 30 },
  internal.fxJobs.fetchOpenMeteoRuns
);
crons.hourly(
  "fx build labels",
  { minuteUTC: 10 },
  internal.fxJobs.buildLabels
);
crons.hourly(
  "fx score models",
  { minuteUTC: 20 },
  internal.fxJobs.scoreModels
);
crons.hourly(
  "fx score predictions",
  { minuteUTC: 25 },
  internal.fxJobs.scorePredictions
);
crons.hourly(
  "fx generate predictions",
  { minuteUTC: 35 },
  internal.fxJobs.generatePredictions,
  {}
);
crons.interval(
  "fx observations",
  { minutes: 5 },
  internal.fxJobs.fetchObservations
);
crons.interval(
  "fx nowcast predictions",
  { minutes: 20 },
  internal.fxJobs.generatePredictions,
  { layers: "nowcast" }
);

export default crons;
