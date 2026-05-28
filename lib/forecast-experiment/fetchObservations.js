import { api } from "../../convex/_generated/api.js";
import { dateRangeWeeks, localDateKey, localDayWindowMs } from "./time.js";

const DEFAULT_TIMEZONE = "Europe/Lisbon";
const DEFAULT_PADDING_MS = 2 * 3_600_000;

/**
 * Fetch observations in weekly chunks (Convex query caps at 5000 rows per call).
 * Returns Map(dateLocal -> observations[]).
 */
export async function fetchObservationsGroupedByDate(
  convex,
  {
    locationSlug,
    startDateLocal,
    endDateLocal,
    timezone = DEFAULT_TIMEZONE,
    paddingMs = DEFAULT_PADDING_MS,
  }
) {
  const byDate = new Map();

  for (const week of dateRangeWeeks(startDateLocal, endDateLocal)) {
    const { startAt } = localDayWindowMs(week.from, timezone);
    const { endAt } = localDayWindowMs(week.to, timezone);
    const rows = await convex.query(api.forecastExperiment.listObservationsForWindow, {
      locationSlug,
      startAt: startAt - paddingMs,
      endAt: endAt + paddingMs,
    });

    for (const obs of rows || []) {
      const dateLocal = localDateKey(obs.observedAt, timezone);
      if (!byDate.has(dateLocal)) byDate.set(dateLocal, []);
      byDate.get(dateLocal).push(obs);
    }
  }

  return byDate;
}

/**
 * Fetch observations for all ranges in a season config, grouped by local date.
 */
export async function fetchSeasonObservationsGroupedByDate(
  convex,
  { locationSlug, ranges, timezone = DEFAULT_TIMEZONE, paddingMs = DEFAULT_PADDING_MS }
) {
  const byDate = new Map();

  for (const range of ranges) {
    const chunk = await fetchObservationsGroupedByDate(convex, {
      locationSlug,
      startDateLocal: range.startDateLocal,
      endDateLocal: range.endDateLocal,
      timezone,
      paddingMs,
    });

    for (const [dateLocal, observations] of chunk.entries()) {
      if (!byDate.has(dateLocal)) byDate.set(dateLocal, []);
      byDate.get(dateLocal).push(...observations);
    }
  }

  return byDate;
}
