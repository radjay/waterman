import { cacheLife, cacheTag } from "next/cache";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Module-level singleton — created once, reused across all cached function
// calls so we don't pay instantiation cost on every cache hit or miss.
const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

/**
 * Cached wrapper for getReportData.
 *
 * Fetches anonymous (no userId) forecast data for the given sports.
 * Cached for ~1 minute. Clients re-fetch with userId for personalization
 * once the user is known.
 *
 * @param {string[]} sports - e.g. ["wingfoil"]
 */
export async function getCachedReportData(sports) {
  "use cache";
  cacheLife("minutes");
  cacheTag("report-data");
  return client.query(api.spots.getReportData, { sports });
}

/**
 * Cached wrapper for getCamsData.
 *
 * Fetches anonymous webcam + forecast data for all webcam-eligible spots
 * (no sport filter, no userId). Cached for ~1 minute.
 * Clients re-fetch with sport filter / userId as the user interacts.
 */
export async function getCachedCamsData() {
  "use cache";
  cacheLife("minutes");
  cacheTag("cams-data");
  return client.query(api.spots.getCamsData, {});
}

/**
 * Cached wrapper for getDashboardData.
 *
 * Fetches anonymous top-10 spot data across all sports.
 * Cached for ~1 minute. Clients re-fetch with user preferences once
 * authentication resolves.
 */
export async function getCachedDashboardData() {
  "use cache";
  cacheLife("minutes");
  cacheTag("dashboard-data");
  return client.query(api.spots.getDashboardData, {
    sports: ["wingfoil", "kitesurfing", "surfing"],
  });
}
