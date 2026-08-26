# Convex archive and 30-day retention

Date: 2026-08-26
Status: approved

## Problem

Lab plus prod hold two full copies of history (~48 GB billed, mostly indexes
plus `scoring_logs`). The live app does not read that history. Convex Free
disabled both deployments after the lab → prod copy.

## Decision

1. Keep a full snapshot on this machine and on R2.
2. Keep about 30 days in Convex on lab and on prod.
3. Delete older Convex rows after the snapshot is in both places.
4. Run the Guincho vs Cabo Raso forecast study from the snapshot, not from Convex.

## Snapshot

- Local: `archive/waterman-convex-2026-08-26.zip` (gitignored).
- R2: bucket `waterman-archive`, zip split into 250 MB parts (Wrangler
  object put max is 300 MB). Concatenate parts to restore.
- Source: Convex export of lab on 2026-08-26 (prod is that copy).
- Analysis tables unzipped under `archive/jsonl/` (no `scoring_logs`; that
  file is 4.6 GB uncompressed and is not needed for forecast vs station).

`archive/` is gitignored except `archive/README.md`.

## Keep in Convex

| Table | Window |
|-------|--------|
| `condition_scores` | existing 2 days back / 7 days forward |
| `scoring_logs` | 7 days (prompt debug only) |
| `station_readings` | 30 days |
| `forecast_slots_archive` | 30 days |
| `score_history` | 30 days |
| `fx_observations` | 30 days |
| `fx_forecast_points` | 30 days |
| `fx_forecast_runs` | 30 days |
| `fx_worker_runs` | 30 days |
| `scrapes` | 30 days |
| spots, configs, users, prompts | keep all |

Do not delete rows until the local zip checksum matches the R2 object.

## Guincho vs Cabo Raso

Join later, locally:

- Windy issued forecast: `forecast_slots_archive` (`scrapeTimestamp` vs `timestamp`)
  for Praia do Guincho.
- Truth: `station_readings` where `stationId` is `3294` (Cabo Raso).
- Per-model / lead time: `fx_forecast_points` plus `fx_observations`
  for the cabo-raso location.

DuckDB or a notebook on `archive/jsonl/` is enough. Do not put this study
back into Convex.
