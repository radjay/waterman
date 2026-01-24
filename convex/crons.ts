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

export default crons;
