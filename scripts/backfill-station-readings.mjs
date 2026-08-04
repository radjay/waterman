import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";
import { dateRangeWeeks } from "../lib/forecast-experiment/time.js";

dotenv.config({ path: ".env.local" });

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

/**
 * fx locations that are Windguru stations. cascais-region is the IPMA surface
 * feed, not a station, so it is not backfilled.
 */
const TARGETS = [
  { locationSlug: "cabo-raso", stationId: "3294", startDate: "2022-01-01" },
  { locationSlug: "cascais-bay", stationId: "2329", startDate: "2020-01-01" },
];

const BATCH_SIZE = 500;
const startOverride = process.env.BACKFILL_START_DATE;
const endDate = process.env.BACKFILL_END_DATE || new Date().toISOString().slice(0, 10);
const stationFilter = process.env.BACKFILL_STATION_ID;

const DAY_MS = 24 * 60 * 60 * 1000;
const toMs = (date) => new Date(`${date}T00:00:00Z`).getTime();
/**
 * dateRangeWeeks returns an inclusive last day, so the window has to run to
 * the END of week.to. Using its midnight would silently drop the final day of
 * every chunk — about a seventh of the archive, with nothing to show for it.
 */
const endOfDayMs = (date) => toMs(date) + DAY_MS;

async function flush(stationId, readings) {
  let inserted = 0;
  for (let i = 0; i < readings.length; i += BATCH_SIZE) {
    const result = await convex.mutation(api.stations.saveStationReadings, {
      stationId,
      readings: readings.slice(i, i + BATCH_SIZE),
    });
    inserted += result.inserted;
  }
  return inserted;
}

for (const target of TARGETS) {
  if (stationFilter && target.stationId !== stationFilter) continue;

  const from = startOverride || target.startDate;
  let inserted = 0;
  let scanned = 0;

  for (const week of dateRangeWeeks(from, endDate)) {
    const rows = await convex.query(api.forecastExperiment.listObservationsForWindow, {
      locationSlug: target.locationSlug,
      startAt: toMs(week.from),
      endAt: endOfDayMs(week.to),
    });

    scanned += rows.length;

    const readings = rows
      // Matches fx-backfill-windguru-history.mjs: suspect rows are the
      // 0/0-with-temperature pattern, which is not a real calm reading.
      .filter((row) => row.quality !== "suspect")
      .filter((row) => Number.isFinite(row.windSpeedKnots))
      .map((row) => ({
        time: row.observedAt,
        speed: row.windSpeedKnots,
        gust: Number.isFinite(row.windGustKnots) ? row.windGustKnots : undefined,
        direction: Number.isFinite(row.windDirectionDeg) ? row.windDirectionDeg : undefined,
        tempC: Number.isFinite(row.temperatureC) ? row.temperatureC : undefined,
      }));

    if (readings.length > 0) {
      inserted += await flush(target.stationId, readings);
    }

    console.log(
      `${target.stationId} ${week.from}..${week.to} scanned=${scanned} inserted=${inserted}`
    );
  }

  console.log(`${target.stationId} done: scanned=${scanned} inserted=${inserted}`);
}
