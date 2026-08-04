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

Only two of those five spots can ever show a delta against forecast. Praia das
Moitas and Praia do Guincho (N) are `webcamOnly`, so they are not scraped and
have no forecast — Moitas returns zero forecast slots. Lagoa da Albufeira has a
forecast but a dead station. That leaves Marina de Cascais and Praia do Guincho.

Station siting differs between those two, and it matters:

| Spot | Station | Distance | Character |
|---|---|---|---|
| Marina de Cascais (38.6919, -9.4203) | 2329, at the marina | co-located | measures the spot |
| Praia do Guincho (38.7333, -9.4733) | 3294, Cabo Raso (38.7089, -9.4859) | ~2.9 km | exposed headland |

`lib/forecast-experiment/locations.js` classifies Cabo Raso as
`role: "lead-indicator"`, not a co-located sensor for anywhere.

Forecast history is shallow. Querying `forecast_slots` for Guincho by timestamp
range returns rows at 3 and 7 days back, and nothing at 14, 30 or 60. So roughly
a week of past forecast exists, which bounds what any forecast-versus-actual
comparison can do.

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
8. **No bias caption.** There is not enough forecast history to pair against.
   The card ships with a sparkline and a delta pill only.
9. **Proximity gates the verdict effect.** Only a co-located station feeds
   `stationDelta` into `deriveVerdict`. A nearby station shows its reading,
   attributed, but does not change the verdict.

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
- `STATIONS` — a small static map of `stationId` to `{name, latitude,
  longitude}`. Three entries today. Station coordinates are not in the database
  and are not worth a schema change for three rows.
- `classifyProximity(stationId, spot)` — returns `"at-spot"` under 1 km, else
  `"nearby"` with distance and compass bearing.

An unmapped station classifies as `"nearby"`, never `"at-spot"`. This is the
safety property that matters: adding a spot with an unknown station cannot
silently start flipping verdicts.

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

Builds the `StationCard` shape from raw readings plus the spot's current
forecast slot:

- `speed`, `gust`, `directionLabel` (reusing the compass helper in
  `lib/utils.js`), `agoLabel` — from the newest reading.
- `history` — trailing 90 minutes bucketed to 5-minute steps, giving the ~18
  bars `StationCard` renders.
- `delta` — newest reading minus the current forecast slot's speed, **only for
  an `at-spot` station**. Null for a `nearby` one, because the pill reads
  "vs forecast" and a sensor 2.9 km away on a headland is not measuring that
  spot's forecast error.
- `caption` — station provenance, not bias. `AT THE SPOT` for a co-located
  station, `CABO RASO · 2.9 KM NW` for a nearby one. The rider is told which
  sensor they are looking at rather than being left to assume it is theirs.

No bias line. See "Out of scope".

### `components/now/useNowData.js`

Resolves `chosen.spot.liveReportUrl` to a station ID, queries readings, builds
the card via `lib/station.js`, and replaces both `stationDelta: null` sites
(lines 117 and 146) with the card's `delta` — which is null for a nearby
station, preserving today's behaviour there exactly.

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

With the bias caption cut, the backfill no longer serves the Now card at all —
that needs only the last 90 minutes. It is worth doing anyway, for the reason
this work started: a queryable archive of what the wind actually did, which is
what makes charting it possible. Nothing in this branch consumes it.

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
warrants a real-data sanity check before the flag goes on.

Because of decision 9, exactly one spot reaches this path today: Marina de
Cascais, whose station is at the marina. Guincho's Cabo Raso reading is shown
and attributed but does not vote. Without that gate, Cabo Raso's headland
exposure would put a persistent positive offset into Guincho's delta and flip it
from NO to MARGINAL on a standing basis — reading as a wrong forecast when it is
really a sensor 2.9 km away in windier terrain.

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
- `lib/stations.js` proximity — Marina/2329 classifies `at-spot`,
  Guincho/3294 classifies `nearby` at ~2.9 km, and an unmapped station
  classifies `nearby` rather than `at-spot`.
- `lib/station.js` — card shape, sparkline bucketing, the empty-history case,
  and specifically that `delta` is null for a nearby station so the verdict
  path stays untouched there.

Under `node:test` in `tests/convex/`, mirroring the existing
`forecastSlotDedupe.test.mjs`: dedupe on `(stationId, time)`, and rejection of
readings that fail the guards above.

## Out of scope

- **The bias caption.** `forecast_slots` holds roughly a week of past forecast,
  verified empty at 14, 30 and 60 days back. A trailing bias has almost nothing
  to pair against, and the deep reading archive this branch backfills cannot
  help, because the forecasts it would need were never kept. Building it now
  would produce a caption that renders null in practice. It needs forecast
  retention to be addressed first, which is its own piece of work.
- **Why `forecast_slots` stops at about a week.** Line 195 of `convex/spots.ts`
  says it keeps historical data, and the aggressive three-scrape pruning is on
  `model_slots` (`convex/models.ts:19`), not here. So the shallow depth is
  unexplained and worth a look independently of this branch.
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
4. Eyeball Marina de Cascais' delta against a live reading before flipping
   `stationEvidence`, given the NO-to-MARGINAL effect described above. Confirm
   Guincho shows its Cabo Raso reading with no delta pill and no verdict change.

The flag itself is a Render env var, `NEXT_PUBLIC_FLAG_STATION_EVIDENCE`, not a
code default. `lib/flags.js` records why: production and development share one
Convex deployment, so the Render service's env vars are the only environment
boundary that exists. Enabling it is a deploy-time action, not part of the diff.
