# Live station readings: ingestion, read path, and the stationEvidence flag

Date: 2026-08-04
Branch: `feat/station-readings-ingest`, based on `feat/task-led-ia`
Status: design approved, ready for planning

## Problem

`station_readings` has been defined in the schema since commit 5311534 but has
never been written. No mutation writes it, no cron fills it, and nothing reads
it. Its only mention outside `convex/schema.ts:189` is `lib/flags.js:42`, where
the `stationEvidence` flag is held off "until `station_readings` has accumulated
a few days".

The live wind the app already shows is not stored. `/api/live-wind/[stationId]`
proxies Windguru with `cache: "no-store"` and discards the reading. So the
90-minute sparkline, the "+2 vs forecast" pill, and the per-spot bias line are
all impossible to compute rather than merely switched off.

Separately, `fx_observations` holds years of Windguru history for two of the
same stations, in the same Convex deployment, unused by the product.

## What exists today

Verified against the live deployment and the Windguru iAPI on 2026-08-04.

Five spots carry a `liveReportUrl`, across three distinct stations:

| Station | Spots | Live now | History in `fx_observations` |
|---|---|---|---|
| 2329 | Marina de Cascais, Praia das Moitas | yes | 2020-06 → 2026-05-24, 10-min |
| 3294 | Praia do Guincho, Guincho (N) | yes | ~2022-07 → 2026-06-10, ~750/wk |
| 15435 | Lagoa da Albufeira | **no, dead** | none, never ingested |

Roughly 470k station-readings of history exist across 2329 and 3294.

The fx ingestion pipeline stopped on 2026-06-10; the last
`fx-fetch-observations` worker run was 15:42Z that day. Why it stopped is
unexplained and out of scope here — this design routes around it rather than
fixing it.

The UI half is already built and unreachable. `StationCard`
(`components/now/EvidenceStack.js:98`) renders speed, gust, direction, an
`agoLabel`, a delta pill, a sparkline and a caption. `EvidenceStack` degrades
cleanly when `station` is null. But `components/now/useNowData.js` hardcodes
`stationDelta: null` at lines 117 and 146 and never sets `data.station`, so the
card is dead code regardless of the flag.

## Decisions

1. **Scope**: ingestion, read path, and the flag on. Not ingestion alone.
2. **Runtime**: a Convex cron plus internal action, every 5 minutes. Not a
   Render worker. The Render fx worker died silently and went unnoticed for
   eight weeks; a Convex cron has no separate service to die.
3. **Station list**: derived at run time from `spots.liveReportUrl`. Not a
   static config. New spots are picked up with no code change, and a station
   whose hardware is replaced under the same ID resumes on its own.
4. **Backfill**: full history from `fx_observations`, not a bounded window.
5. **Retention**: none. Nothing is pruned.
6. **Row keying**: one row per station reading, not per spot. Halves the table
   and stops presenting one physical measurement as two independent ones.
7. **Observability**: Convex logs only. No `fx_worker_runs` writes, no UI
   staleness surface beyond the existing 60-minute convention.

## Architecture

### Schema change

`station_readings.spotId` becomes `v.optional(v.id("spots"))`. Rows are keyed by
`stationId` and `time`; the existing `by_station_time` index serves both dedupe
and reads. Additive and optional-safe, which matters because production and
development share one Convex deployment — a schema push is a production push.

The table is believed empty. The plan must verify that before pushing rather
than assume it, since there is currently no query that can observe it.

### `lib/windguru.js` (new)

The current-station fetch and parse move here from
`lib/forecast-experiment/windguruClient.js`, which re-exports them so the fx
scripts keep working unchanged. One source of truth for the iAPI call, and the
main app stops reaching into an fx-namespaced module.

The parse layer gains one rule that the existing code lacks, described under
"Dead stations" below.

### `lib/stations.js` (new, pure)

- `stationIdFromUrl(url)` — extracts the ID from `windguru.cz/station/<id>`,
  returning null for anything unparseable.
- `stationTargetsFromSpots(spots)` — dedupes to `[{stationId, spotIds}]`.
  Three targets from five spots today.

No Convex imports, so it unit-tests directly under vitest.

### `convex/stations.ts` (new)

- `internalQuery listStationSpots` — spots with a parseable `liveReportUrl`.
- `internalAction pollStations` — derives targets, fetches each station, hands
  results to the mutation. Per-station `try/catch`.
- `internalMutation saveStationReadings` — dedupes on `(stationId, time)` via
  `by_station_time`, then inserts. No pruning.
- `query getStationReadings({stationId, sinceAt, limit})` — newest-first.

### `convex/crons.ts`

Adds `crons.interval("poll windguru stations", { minutes: 5 },
internal.stations.pollStations, {})` alongside the two existing auth cleanup
jobs. Three stations at twelve polls an hour is 36 fetches an hour.

### `lib/station.js` (new, pure)

Builds the `StationCard` shape from raw readings plus the spot's forecast slots:

- `speed`, `gust`, `directionLabel` (reusing the compass helper in
  `lib/utils.js`), `agoLabel` — from the newest reading.
- `history` — trailing 90 minutes bucketed to 5-minute steps, giving the ~18
  bars `StationCard` renders.
- `delta` — newest reading minus the current forecast slot's speed.
- `caption` — the trailing bias over **14 days**, pairing each past reading with
  the forecast that was live *at that time*, meaning the most recent
  `scrapeTimestamp` at or before the reading, then averaging the difference.
  That is the number a rider would actually have been shown, not a
  retrospectively corrected one. Rendered in the existing caption style, as
  `RUNS 2.3 KN OVER FORECAST · 14D` (or `UNDER`). Returns null below 48 paired
  samples, so a thin window says nothing rather than asserting a bias it cannot
  support.

This is computable because `forecast_slots` retains history by
`scrapeTimestamp` (`convex/spots.ts:195`). The aggressive three-scrape pruning
in the codebase applies to `model_slots` (`convex/models.ts:19`), not to
`forecast_slots`.

### `components/now/useNowData.js`

Resolves `chosen.spot.liveReportUrl` to a station ID, queries readings, builds
the card via `lib/station.js`, and replaces both `stationDelta: null` sites with
the real value.

## Dead stations

Station 15435 returns `{"datetime":"2026-08-04 17:43:00 WEST"}` — no
`unixtime`, no wind fields at all.

Run that through the existing parse path and it yields a fresh-timestamped
zero-knot reading. `observedAt` falls back to `Date.now()` because `unixtime` is
absent, and `sanitizeWind(data.wind_avg ?? 0)` turns an absent wind field into
0. Dedupe cannot catch it, because the timestamp is new on every poll. Left
alone, this writes a fabricated calm reading every five minutes forever.

The `?? 0` is correct for its original purpose: a live station reporting calm
omits `wind_avg` entirely, as the comment in
`app/api/live-wind/[stationId]/route.js` records. A live-and-calm station and a
dead station are identical *in the wind fields*.

**The discriminator is `unixtime`.** Present means a real reading, including a
legitimate zero-knot one. Absent means no reading at all. A reading is rejected
unless it carries a usable `unixtime`.

Note that fx's own `assessQuality` would not have caught this either: its
"suspect" rule requires a finite `temperature`, and 15435 omits that too.

## Failure handling

A reading is rejected when:

- `unixtime` is absent or unusable;
- both wind fields are absent, which is distinct from present-and-zero;
- the timestamp is in the future, or more than 24 hours before the poll.

The 24-hour bound applies to the live cron only. The backfill writes historic
timestamps by definition and uses the same guards minus this one.

`pollStations` wraps each station in its own `try/catch`, so Lagoa's dead feed
cannot stop Guincho and Marina from ingesting. This follows the isolation
precedent set for model ingest in commit 5311534, where a failure degrades to
"no data" rather than taking down the core path.

## Backfill

`scripts/backfill-station-readings.mjs`, run manually once, never scheduled.

Maps fx `locationSlug` to station: `cabo-raso` → 3294, `cascais-bay` → 2329.
`cascais-region` is the IPMA surface feed, not a Windguru station, and is
skipped.

Reads `fx_observations` in weekly chunks, following the chunking already used in
`lib/forecast-experiment/fetchObservations.js`, since the Convex query caps out
around 5k rows per call. Drops rows already marked `quality: "suspect"`, as
`scripts/fx-backfill-windguru-history.mjs` does. Writes station-keyed rows with
no `spotId`.

Idempotent through the same `(stationId, time)` dedupe as the live path, and
resumable via date-range arguments, so an interrupted run of ~470k rows can be
re-run without duplicating.

## The behavioural change

`stationDelta` is not only a card input. In `lib/verdict.js:54`, a score in the
50–59 band combined with a station running 2 or more knots over forecast flips
the verdict from **NO to MARGINAL**, and `verdictReason` (line 116) then renders
`STATION RUNNING n KN OVER FORECAST`.

Turning this on therefore changes what the app tells riders to do, not only what
it shows them. The path is currently unreachable because `stationDelta` is
hardcoded null. It is clearly the intended design, but it is the part that most
warrants a real-data sanity check before the flag goes on. Stations 2329 and
3294 can both supply that.

## Staleness

The read path reuses the existing convention rather than inventing one:
readings older than 60 minutes are hidden rather than dimmed, matching
`components/wind/LiveWindIndicator.js:68`.

## Testing

Under vitest, in `__tests__` directories:

- `lib/stations.js` — URL parsing, including junk and non-Windguru input, and
  target deduplication across spots sharing a station.
- `lib/windguru.js` — the real 15435 payload as a fixture, asserting it yields
  no reading; a live-but-calm payload asserting it yields 0 knots; a normal
  payload asserting correct field extraction.
- `lib/station.js` — card shape, sparkline bucketing, bias pairing against the
  forecast live at the time, and the empty-history case.

Under `node:test` in `tests/convex/`, mirroring the existing
`forecastSlotDedupe.test.mjs`: dedupe on `(stationId, time)`, and rejection of
readings that fail the guards above.

## Out of scope

- **Why the fx workers stopped on 2026-06-10.** Still unexplained.
- **`FX_OBSERVATION_SOURCES` is stale.** `lib/forecast-experiment/locations.js`
  marks `windguru-2329` as `enabled: false` with `status: "sensor_offline"`.
  The hardware has been replaced and the station is live again. The fx pipeline
  is stopped anyway, so this design does not touch it, but the entry is now
  actively misleading.
- **A live bug in `/api/live-wind/[stationId]`.** The same `unixtime` fallback
  means dead station 15435 is stamped with `Date.now()` and reported as 0 knots,
  so the 60-minute staleness guard in `LiveWindIndicator` never fires and Lagoa
  da Albufeira currently renders a live-looking "0 kn". This design fixes the
  class of bug in the new path only. The route is untouched.
- **Rider counts and `cam_rider_counts`.** Unrelated, still fixtures.

## Verification before enabling the flag

1. Confirm `station_readings` is empty before the schema push.
2. Run the cron for long enough to see rows from 2329 and 3294, and confirm
   15435 produces none.
3. Run the backfill and spot-check row counts against the `fx_observations`
   spans in the table above.
4. Eyeball the delta and bias on a real spot before flipping `stationEvidence`,
   given the NO-to-MARGINAL effect described above.
