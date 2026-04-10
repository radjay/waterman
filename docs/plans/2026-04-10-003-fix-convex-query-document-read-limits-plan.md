---
title: "fix: Reduce Convex query document reads approaching 32K/16MB limits"
type: "fix"
status: "active"
date: "2026-04-10"
origin: "docs/plans/2026-04-05-002-fix-dashboard-report-cams-slow-page-loads-plan.md"
markup_reviewed: true
markup_reviewed_at: "2026-04-10T10:07:40.748Z"
markup_status: "changes_requested"
---
# fix: Reduce Convex query document reads approaching 32K/16MB limits

## Overview

`getDashboardData` and `getReportData` are reading ~28,000 documents (~14MB) per execution, dangerously close to Convex hard limits (32,000 docs / 16MB). The previous optimization plan (2026-04-05) fixed indexes, parallelized queries, and added caching, but three hot spots remain that account for the bulk of reads. Additionally, `scoreForecastSlots` logs are misleading (showing more scored than total slots) and old forecast data accumulates forever.

## Problem Statement

Console warnings show every page load hitting:
- `getDashboardData`: 27,761 docs / 13.5MB (87% of limit)
- `getReportData`: 27,951 docs / 13.6MB (87% of limit)

At current growth rate (~200 new slots + scores per scrape cycle), queries will breach the 32K limit within weeks, causing **hard failures** -- not just slow pages.

### Root Causes

1. **`_getForecastSlotsForSpot` collects ALL scrapes for each spot** (`convex/spots.ts:1850-1854`). Uses `.collect()` + `Math.max()` to find the latest successful scrape timestamp. With 4 scrapes/day, this reads ~1,400+ scrape docs per spot. Across 10 spots = ~14,000 unnecessary reads.

2. **`getReportData` tides query has no time bound** (`convex/spots.ts:2121-2124`). Uses `by_spot` index instead of `by_spot_time`, reading ALL historical tide records per spot.

3. **`_getConditionScoresForSpot` uses a 7-day window everywhere** (`convex/spots.ts:1907`). Dashboard and cams only need current forecast data (~48h), but query reads 7 days of scores regardless.

4. **Old `forecast_slots` accumulate indefinitely**. Each scrape inserts ~80 new slots without deleting old ones. The 48h `_getForecastSlotsForSpot` window limits query reads, but the table grows ~320 rows/day. Note: old slots are intentionally kept for future forecast-evolution analysis -- the fix is ensuring queries never read them, not deleting them.

5. **`scoreForecastSlots` log is misleading** (`convex/spots.ts:1383`). Reports "156/156 successful from 80 total slots" because it scores each slot for every sport (80 slots x 2 sports = 160 scorable). The log makes it look like slots are being double-scored.

## Proposed Solution

Five targeted fixes, ordered by impact. No schema changes needed -- all existing indexes are sufficient.

### Unit 1: Fix `_getForecastSlotsForSpot` scrape lookup (highest impact)

**File:** `convex/spots.ts:1850-1854`

**Current:** Reads ALL scrape records for a spot, filters for successful ones in JS, then takes `Math.max()`:
```typescript
const successfulScrapes = await ctx.db
    .query("scrapes")
    .withIndex("by_spot_and_timestamp", (q: any) => q.eq("spotId", spotId))
    .filter((q: any) => q.eq(q.field("isSuccessful"), true))
    .collect();
// ... Math.max(...successfulScrapes.map(s => s.scrapeTimestamp))
```

**Fix:** Use `.order("desc").first()` to read exactly 1 document instead of hundreds:
```typescript
const latestSuccessfulScrape = await ctx.db
    .query("scrapes")
    .withIndex("by_success_timestamp", (q: any) => q.eq("isSuccessful", true))
    .order("desc")
    .first();

// Then compare with slot scrape timestamps to find target
const lastSuccessfulTimestamp = latestSuccessfulScrape?.scrapeTimestamp ?? 0;
```

Wait -- this loses the per-spot filtering. We need the latest successful scrape **for this spot**. Two options:

**Option A:** Use `by_spot_and_timestamp` with `.order("desc")` + post-filter for `isSuccessful`:
```typescript
// Read scrapes for this spot in reverse order, find first successful one
const latestScrapes = await ctx.db
    .query("scrapes")
    .withIndex("by_spot_and_timestamp", (q: any) => q.eq("spotId", spotId))
    .order("desc")
    .collect();
const latestSuccessful = latestScrapes.find((s: any) => s.isSuccessful);
```
This still reads many docs if recent scrapes failed. But successful scrapes are the norm, so typically reads 1-2 docs.

**Option B (better):** Since we already have `allSlots` with their `scrapeTimestamp` values from the indexed query, and we know those slots came from the 48h window, we can just check if the max slot scrapeTimestamp corresponds to a successful scrape:
```typescript
// We already know the scrape timestamps from the slots we loaded
// Just need to verify the latest one was successful
const maxSlotScrapeTs = Math.max(...slotScrapeTimestamps);
const latestScrape = await ctx.db
    .query("scrapes")
    .withIndex("by_spot_and_timestamp", (q: any) =>
        q.eq("spotId", spotId).eq("scrapeTimestamp", maxSlotScrapeTs)
    )
    .first();
```
But `by_spot_and_timestamp` indexes `["spotId", "scrapeTimestamp"]` so this is a point lookup -- 1 document read.

**Chosen approach: Option B.** Point-lookup the scrape record for the max scrapeTimestamp we already derived from the slots. If it's successful, use it. If not, fall back to scanning the slot timestamps in descending order until we find a successful scrape. In practice, the latest scrape is almost always successful (the logs show 0 failures), so this reads 1-2 documents instead of hundreds.

**Estimated savings:** ~14,000 fewer document reads per query (1,400 scrapes/spot x 10 spots).

### Unit 2: Add time bound to tides query in `getReportData`

**File:** `convex/spots.ts:2121-2124`

**Current:**
```typescript
ctx.db
    .query("tides")
    .withIndex("by_spot", (q: any) => q.eq("spotId", spot._id))
    .collect()
```

**Fix:** Use the `by_spot_time` index with a time window (24h ago through 10 days ahead):
```typescript
const tidesStart = Date.now() - 24 * 60 * 60 * 1000;
const tidesEnd = Date.now() + 10 * 24 * 60 * 60 * 1000;
ctx.db
    .query("tides")
    .withIndex("by_spot_time", (q: any) =>
        q.eq("spotId", spot._id).gte("time", tidesStart).lte("time", tidesEnd)
    )
    .collect()
```

**Estimated savings:** Depends on historical tide data volume. With 4-6 tides/day accumulating since launch, could be 500+ docs per spot.

### Unit 3: Narrow condition_scores window for dashboard/cams

**File:** `convex/spots.ts:1900-1943` (the shared `_getConditionScoresForSpot` function)

**Current:** Always uses 7-day cutoff regardless of caller.

**Fix:** Add an optional `cutoffDays` parameter, defaulting to 7:
```typescript
async function _getConditionScoresForSpot(
    ctx: any,
    spotId: Id<"spots">,
    sport: string,
    userId?: string,
    cutoffDays: number = 7
) {
    const cutoff = Date.now() - cutoffDays * 24 * 60 * 60 * 1000;
    // ... rest unchanged
}
```

Then in `_buildSpotData` (used by `getDashboardData` and `getCamsData`), pass `cutoffDays: 2`:
```typescript
_getConditionScoresForSpot(ctx, spot._id, sport, userId, 2)
```

Keep `getReportData` at 7 days since it shows a full weekly forecast.

**Estimated savings:** ~70% fewer condition_score reads for dashboard/cams views.

### Unit 4: Archive old forecast_slots to a history table

Old forecast_slots are valuable for analyzing how forecasts evolve over time, but keeping them in the active table bloats it (~320 rows/day). Move them to a dedicated archive table that the app never reads from.

**Schema change** (`convex/schema.ts`): Add a `forecast_slots_archive` table with the same fields plus an `archivedAt` timestamp:
```typescript
forecast_slots_archive: defineTable({
    spotId: v.id("spots"),
    timestamp: v.number(),
    scrapeTimestamp: v.optional(v.number()),
    speed: v.optional(v.number()),
    gust: v.optional(v.number()),
    direction: v.optional(v.number()),
    waveHeight: v.optional(v.number()),
    wavePeriod: v.optional(v.number()),
    waveDirection: v.optional(v.number()),
    tideHeight: v.optional(v.number()),
    tideType: v.optional(v.string()),
    tideTime: v.optional(v.number()),
    archivedAt: v.number(),
}).index("by_spot", ["spotId"])
  .index("by_spot_and_scrape_timestamp", ["spotId", "scrapeTimestamp"]),
```

**Archive mutation** (`convex/spots.ts`): Add to `saveForecastSlots`, after inserting new slots. Copy slots older than 48h to the archive table, then delete from the active table:
```typescript
const archiveCutoff = Date.now() - 48 * 60 * 60 * 1000;
const oldSlots = await ctx.db
    .query("forecast_slots")
    .withIndex("by_spot_and_scrape_timestamp", (q: any) =>
        q.eq("spotId", args.spotId).lt("scrapeTimestamp", archiveCutoff)
    )
    .collect();

const archivedAt = Date.now();
for (const slot of oldSlots) {
    const { _id, _creationTime, ...fields } = slot;
    await ctx.db.insert("forecast_slots_archive", { ...fields, archivedAt });
    await ctx.db.delete(slot._id);
}
```

**Note:** The archive table is write-only for the app. Future analysis queries can read from it directly via the Convex dashboard or a dedicated analytics endpoint. Consider also archiving old `condition_scores` (>14 days) in a follow-up if that table grows similarly.

### Unit 5: Fix misleading scoreForecastSlots log

**File:** `convex/spots.ts:1383`

**Current:**
```typescript
console.log(`Batch scoring complete: ${successCount}/${total} successful, ${failureCount}/${total} failed (from ${args.slotIds.length} total slots)`);
```

**Fix:**
```typescript
console.log(`Batch scoring complete: ${successCount}/${total} successful, ${failureCount}/${total} failed (${args.slotIds.length} slots x ${sports.length} sports)`);
```

## Acceptance Criteria

- [ ] `getDashboardData` reads fewer than 5,000 documents per execution (down from ~28,000)
- [ ] `getReportData` reads fewer than 8,000 documents per execution (down from ~28,000)
- [ ] No `[WARN] Many documents read` warnings in Convex console after deploy
- [ ] No `[WARN] Many bytes read` warnings in Convex console after deploy
- [ ] `scoreForecastSlots` log accurately reflects slots x sports breakdown
- [ ] Old forecast_slots (>48h) are archived to `forecast_slots_archive` and removed from the active table after each scrape
- [ ] All existing page functionality unchanged (dashboard, report, cams)
- [ ] Unit 1 scrape lookup reads 1-2 documents instead of hundreds

## Implementation Order

1. **Unit 1** first (highest impact, fixes ~50% of reads)
2. **Unit 2** second (tides time bound)
3. **Unit 3** third (narrower score window for dashboard/cams)
4. **Unit 5** fourth (log fix, trivial)
5. **Unit 4** last (schema change + archive logic, needs careful testing against in-flight scoring)

## Risk Analysis

- **Unit 1:** Low risk. The scrape lookup is only used to determine which scrapeTimestamp has the latest data. Point-lookup is semantically equivalent to collect+max. Edge case: if the latest scrapeTimestamp in slots doesn't have a matching scrape record (data inconsistency), fall back to using the max slot timestamp directly (current behavior).

- **Unit 2:** Low risk. Tides outside the forecast window are never displayed. A 10-day forward window covers any reasonable forecast range.

- **Unit 3:** Low risk. Dashboard shows at most 2-3 days of forecast. A 2-day score window is sufficient. If a user hasn't loaded the page in >2 days, scores will still be available from the latest scrape.

- **Unit 4:** Low-medium risk. Archiving runs inside `saveForecastSlots` after inserting new slots. The 48h cutoff is conservative -- scoring completes within minutes, so archived slots won't be in active use. Race condition mitigated by Convex's transactional model (the archive+delete is atomic within the mutation). The new `forecast_slots_archive` table is write-only for the app, so no query performance impact.

- **Unit 5:** No risk. Log-only change.

## Sources

- **Origin document:** [docs/plans/2026-04-05-002-fix-dashboard-report-cams-slow-page-loads-plan.md](docs/plans/2026-04-05-002-fix-dashboard-report-cams-slow-page-loads-plan.md) -- original optimization plan that fixed indexes, parallelization, and caching. This plan addresses the remaining hot spots.
- Key file: `convex/spots.ts` -- all query functions and scoring logic
- Key file: `convex/schema.ts` -- table definitions and indexes
<!-- @markup {"id":"JbxuZEtngSc1rbtjIhd2B","type":"inline","anchor":"p:Old forecast_slots accumulate indefinitely. Each scrape inserts ~80 new slots wi","author":"","ts":"2026-04-10T10:07:40.415Z"} We want to keep a copy of old forecasts, to later analyze how forecasts evolve over time. However we shouldn't read all of them in the app to display data! -->