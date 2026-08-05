import { Id } from "../_generated/dataModel";
import {
  dedupeSlotsByTimestamp,
  filterSlotsOverlappingWindow,
} from "../../lib/convex/forecastSlotDedupe.js";

type QueryCtx = { db: any };

const SLOT_DURATION_MS = 3 * 60 * 60 * 1000;
const RECENT_SCRAPE_LOOKBACK = 30;

export async function resolveLatestSuccessfulScrapeTimestamp(
  ctx: QueryCtx,
  spotId: Id<"spots">
): Promise<number | null> {
  const recentScrapes = await ctx.db
    .query("scrapes")
    .withIndex("by_spot_and_timestamp", (q: any) => q.eq("spotId", spotId))
    .order("desc")
    .take(RECENT_SCRAPE_LOOKBACK);

  for (const scrape of recentScrapes) {
    if (scrape.isSuccessful) {
      return scrape.scrapeTimestamp;
    }
  }

  return recentScrapes[0]?.scrapeTimestamp ?? null;
}

export async function getSlotsForScrape(
  ctx: QueryCtx,
  spotId: Id<"spots">,
  scrapeTimestamp: number
) {
  return ctx.db
    .query("forecast_slots")
    .withIndex("by_spot_and_scrape_timestamp", (q: any) =>
      q.eq("spotId", spotId).eq("scrapeTimestamp", scrapeTimestamp)
    )
    .collect();
}

/**
 * Report/dashboard slot load: latest successful scrape + today's past hours
 * from earlier scrapes (preserves elapsed forecast on the current day).
 */
export async function getForecastSlotsForSpot(
  ctx: QueryCtx,
  spotId: Id<"spots">
) {
  const targetScrapeTimestamp = await resolveLatestSuccessfulScrapeTimestamp(
    ctx,
    spotId
  );
  if (targetScrapeTimestamp === null) {
    return [];
  }

  const latestSlots = await getSlotsForScrape(
    ctx,
    spotId,
    targetScrapeTimestamp
  );
  if (latestSlots.length === 0) {
    return [];
  }

  const now = Date.now();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const latestTimestamps = new Set(latestSlots.map((s: any) => s.timestamp));

  // Only the GAP is worth reading.
  //
  // This exists to recover hours that have already passed today but are no
  // longer in the latest scrape, because a scrape only forecasts forward. That
  // gap runs from midnight to whichever comes first: now, or the earliest slot
  // the latest scrape does carry.
  //
  // It used to read every slot in the whole of today across EVERY scrape and
  // then discard the ones at or after `now` in JS. Because each scrape writes
  // ~10 days of slots, today's timestamps appear in every scrape from the past
  // ten days — so this was reading hundreds of documents per spot to recover a
  // handful, and it was ~62% of getReportData's total time.
  //
  // The bound below is exactly the JS filter that followed, applied in the
  // index instead: every slot it now excludes was already being thrown away.
  const earliestLatest = latestSlots.reduce(
    (min: number, s: any) => (s.timestamp < min ? s.timestamp : min),
    Number.POSITIVE_INFINITY
  );
  const gapEnd = Math.min(now, earliestLatest);

  // Commonly empty: when the latest scrape still carries this morning's hours
  // there is no gap at all, and the second query is skipped entirely.
  if (gapEnd <= todayStart.getTime()) {
    return latestSlots;
  }

  const gapSlots = await ctx.db
    .query("forecast_slots")
    .withIndex("by_spot_timestamp", (q: any) =>
      q
        .eq("spotId", spotId)
        .gte("timestamp", todayStart.getTime())
        .lt("timestamp", gapEnd)
    )
    .collect();

  const pastFromOtherScrapes = gapSlots.filter(
    (slot: any) =>
      !latestTimestamps.has(slot.timestamp) &&
      slot.scrapeTimestamp !== targetScrapeTimestamp
  );

  return [...latestSlots, ...dedupeSlotsByTimestamp(pastFromOtherScrapes)];
}

export async function getLatestScrapeSlotsInWindow(
  ctx: QueryCtx,
  spotId: Id<"spots">,
  startTime: number,
  endTime: number
) {
  const scrapeTimestamp = await resolveLatestSuccessfulScrapeTimestamp(
    ctx,
    spotId
  );
  if (scrapeTimestamp === null) {
    return [];
  }

  const rangeStart = Math.min(startTime, endTime);
  const rangeEnd = Math.max(startTime, endTime);

  const slots = await ctx.db
    .query("forecast_slots")
    .withIndex("by_spot_timestamp", (q: any) =>
      q
        .eq("spotId", spotId)
        .gte("timestamp", rangeStart)
        .lte("timestamp", rangeEnd)
    )
    .collect();

  return slots
    .filter(
      (slot: any) =>
        slot.scrapeTimestamp === scrapeTimestamp &&
        slot.timestamp >= startTime &&
        slot.timestamp <= endTime
    )
    .sort((a: any, b: any) => a.timestamp - b.timestamp);
}

export async function getSlotsOverlappingTimeWindow(
  ctx: QueryCtx,
  spotId: Id<"spots">,
  startTime: number,
  endTime: number,
  slotDurationMs: number = SLOT_DURATION_MS
) {
  const rangeStart = startTime - slotDurationMs;
  const rangeEnd = endTime;

  const slots = await ctx.db
    .query("forecast_slots")
    .withIndex("by_spot_timestamp", (q: any) =>
      q
        .eq("spotId", spotId)
        .gte("timestamp", rangeStart)
        .lte("timestamp", rangeEnd)
    )
    .collect();

  const overlapping = filterSlotsOverlappingWindow(
    slots,
    startTime,
    endTime,
    slotDurationMs
  );

  return dedupeSlotsByTimestamp(overlapping);
}
