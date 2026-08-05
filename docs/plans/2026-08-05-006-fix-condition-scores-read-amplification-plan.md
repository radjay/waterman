---
title: "fix: stop condition_scores from re-breaching the Convex read limits"
type: fix
status: draft
date: 2026-08-05
origin: docs/plans/2026-04-10-003-fix-convex-query-document-read-limits-plan.md
---

# fix: stop condition_scores from re-breaching the Convex read limits

## Overview

`getReportData` reads **29,747 documents / 15,909,189 bytes** per execution against
Convex hard limits of 32,000 and 16,777,216. That is **93% of the document limit
and 95% of the byte limit**, and it is a hard failure when breached, not a slow
page.

Measured on `adorable-anteater-323`, 2026-08-05, with the three sports the app
actually requests:

| | value |
| --- | --- |
| spots | 7 |
| documents **returned** | 1,907 (567 slots, 266 tides, 1,074 scores) |
| documents **read** | 29,747 |
| amplification | **15.6×** |
| payload | 863 KB returned from 15.9 MB read |

**The next spot breaks it.** Reads are linear in spot count at ~4,250 docs and
~2.27 MB per spot, so an eighth spot projects to ~34,000 documents and ~18.2 MB —
past both limits. This is not a months-away problem.

## This is a recurrence

`2026-04-10-003` fixed exactly this query at 27,951 docs / 13.6 MB (87%). Five
units shipped: the scrape lookup, the tide time bound, a narrower score cutoff,
slot archiving, a log fix. Four months later the same query is **worse**.

That plan's Unit 4 ends with:

> Consider also archiving old `condition_scores` (>14 days) in a follow-up if
> that table grows similarly.

The follow-up was never done. It is the entire problem. Everything April fixed
stayed fixed — the regression is in the one table it deferred.

Two further notes on why April's work did not hold:

- Unit 3 narrowed the **backward** cutoff (`cutoffDays`, now 2). The window that
  grows is the **forward** one — `futureDays` defaults to 11, so the read spans
  13 days regardless.
- Unit 4 archived `forecast_slots` but not their scores. Slots older than 48h now
  leave the active table while their score rows stay forever.

## Root cause

Reads split cleanly. Per spot, the bounded sources account for ~152 documents:

| source | docs/spot | bounded by |
| --- | --- | --- |
| latest scrape's slots | ~81 | `by_spot_and_scrape_timestamp` |
| tides | ~38 | `by_spot_time`, 11-day window |
| scrape lookup | 30 | `.take(30)` |
| spot configs | 3 | point lookups |
| gap slots | ~0 | fixed in `b68d3c8` |

The remaining **~4,100 documents per spot — 96% of all reads — are
`condition_scores`.** The table holds roughly **27 rows for every
`(spotId, sport, timestamp)`** the query returns one of.

The duplication is created by `saveConditionScore`
(`convex/spots.ts:799`). It dedupes system scores like this:

```ts
const existingScore = await ctx.db
    .query("condition_scores")
    .withIndex("by_slot_sport", q => q.eq("slotId", args.slotId).eq("sport", args.sport))
    .filter(q => q.eq(q.field("userId"), null))
    .first();
if (existingScore) { /* archive + patch */ }
// otherwise insert
```

The key is **`slotId`**. But `forecast_slots` writes a *new document* for the same
wall-clock timestamp on every scrape — that is precisely why
`dedupeSlotsByTimestamp` exists and why `getForecastSlotsForSpot` has to reconcile
scrapes at all. So `args.slotId` is new every scrape, the lookup never matches a
previous scrape's score, and the `if` branch is effectively dead code for the
scraper. **Every scrape inserts a fresh score row for a timestamp already scored.**

At 4 scrapes/day (`render.yaml:34`) across a ~7-day forward scoring horizon, that
is ~27 rows per timestamp per sport. Nothing prunes them: `convex/crons.ts` has
retention for magic links and sessions only.

The read path then pays for all of it. `getConditionScoresForSpotSport`
(`convex/queryHelpers/conditionScores.ts:58`) queries the 13-day range on
`by_spot_sport_timestamp`, `.collect()`s every copy, and throws away all but the
newest per timestamp in JS via `dedupeScoresByTimestamp`. That helper's existence
is the tell: it is only necessary because the write path leaks.

Bytes are worse than counts because every duplicate row carries a `reasoning`
string — a sentence or two of generated prose — which is why 863 KB of useful
payload costs 15.9 MB to read.

## The constraint that makes the obvious fix wrong

The obvious fix is to re-key the write to `(spotId, sport, timestamp, userId)` and
collapse to one row. But three readers look scores up **by `slotId`**:

- `convex/journal.ts:474` and `:514` — a logged session's forecast comparison,
  resolved from the `slotId` stored on the entry.
- `convex/spots.ts:1482` — `getConditionScore(slotId, sport)`.

Collapsing duplicates onto the newest slot would leave every past session pointing
at a `slotId` whose score row no longer exists. Journal already coalesces to
`|| null`, so this would not throw — it would **silently blank the forecast
comparison on historical entries**, which is the one thing that table is for.

Any fix has to repoint those readers or preserve slot-level resolution.

## Plan

### 1. Re-key the write, and repoint the three slot-level readers

Change `saveConditionScore` to dedupe on `(spotId, sport, timestamp, userId)`
using the existing `by_spot_sport_timestamp` index. On a hit: patch the newest row
— **including `slotId` and `scrapeTimestamp`, which the current patch does not
update** — and delete the remaining duplicates for that key. This makes the fix
self-healing: every rescore collapses that timestamp's backlog, so the table drains
as the scraper runs rather than needing a big-bang migration.

Then repoint the readers. All three already hold the slot document, so
`spotId`/`timestamp` are in hand and the substitution is mechanical:

```ts
// journal.ts, was: .withIndex("by_slot_sport", q => q.eq("slotId", slot._id)...)
.withIndex("by_spot_sport_timestamp", (q) =>
  q.eq("spotId", slot.spotId).eq("sport", entry.sport).eq("timestamp", slot.timestamp))
```

This is strictly *better* for journal: a session's score currently resolves only if
that exact slot row still exists, and slots are archived after 48h. Keying by
timestamp makes historical comparison work for entries of any age.

`by_slot_sport` on `condition_scores` can then be dropped from the schema.

### 2. Prune what already exists

The self-healing write only touches timestamps still being scored. Rows for
timestamps outside the scoring horizon — the bulk of the 13-day read window's
backlog — need one pass.

An internal mutation, paginated over spots, that keeps the newest system row per
`(spotId, sport, timestamp)` and deletes the rest. Must be:

- **Idempotent** and resumable — it will run against live production.
- **Dry-run first**, reporting counts per spot without deleting, so the blast
  radius is known before anything is destroyed.
- **User scores untouched.** `userId !== null` rows are personalized and are not
  duplicated by the scraper; the prune must filter to `userId === null` only.

Do not archive the deleted duplicates to `score_history`. They are redundant copies
of the same forecast, not superseded values, and archiving ~26 per timestamp would
move the problem rather than solve it.

### 3. Add retention, so this cannot come back a third time

A cron that deletes system scores older than the read window. April's plan
recommended exactly this and deferring it is why we are here.

Retention alone would not have prevented this — the duplication is *within* the
window, not behind it — so it is a backstop, not the fix. Ship it with §1, not
instead of it.

### 4. Bound the forward window

`futureDays` defaults to 11 while the app charts 6 days. Nothing reads days 7–11.
Aligning the default to the horizon is a free ~45% cut on whatever survives §1,
and it removes the mismatch that let Unit 3's backward-only narrowing look
sufficient.

## Expected result

With one row per `(spot, sport, timestamp)`, `condition_scores` reads fall from
~4,100 to ~153 per spot. Total per execution goes from ~29,747 to roughly
**2,100 documents** — about **7% of the limit**, and headroom for a lot more than
one extra spot.

## Verification

- **Before/after read counts from the Convex warning itself**, not inferred. The
  warnings only fire above a threshold, so the check is that they stop appearing
  *and* a measured probe confirms the count.
- **A test pinning the write-path invariant**: scoring the same
  `(spot, sport, timestamp)` twice via different `slotId`s must leave exactly one
  system row. This is the regression that shipped, so it is the one that needs a
  guard.
- **Journal forecast comparison on a pre-existing entry**, checked in the browser
  before and after §1 — this is what the re-key risks, so it cannot be verified by
  unit test alone.
- **Dry-run output reviewed before the prune runs.**

## Risk

Production and development share `adorable-anteater-323`, so every function push
is live immediately and the prune deletes real rows with no separate staging copy.
Sequence accordingly: ship §1 and let the self-healing path run for a scrape cycle,
confirm the invariant holds on live data, and only then run the §2 dry-run and
prune.

§1's delete-duplicates step is the sharp edge — it runs inside the scoring
mutation on every scrape. Gate it so a bug deletes nothing it should not: filter to
`userId === null`, and never delete the row being patched.

## Out of scope

- `getDashboardData` and `getCamsData`, which share `_getConditionScoresForSpot`
  and will benefit automatically. Worth measuring after, not changing here.
- `score_history` growth. It is not read by any hot query; check it once §1 lands
  and the archive path starts firing for real.
- The `reasoning` field's size. Shortening generated prose would cut bytes but not
  document count, and document count is the tighter constraint.
