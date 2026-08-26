# Local Convex archive

This folder is gitignored except this README.

| File | What it is |
|------|------------|
| `waterman-convex-YYYY-MM-DD.zip` | Full Convex snapshot (restore with `npx convex import`) |
| `jsonl/` | Unzipped tables for local analysis. No `scoring_logs`. |

R2 bucket `waterman-archive` holds the same snapshot split into 250 MB parts
(`waterman-convex-2026-08-26.zip.part.aa`, `.ab`, …) because Wrangler will not
upload a single object over 300 MB. To restore:

```bash
cat waterman-convex-2026-08-26.zip.part.* > waterman-convex-2026-08-26.zip
shasum -a 256 waterman-convex-2026-08-26.zip
```

Snapshot checksum (SHA-256):

`721afd2a87f06624aa4c18753b30199a3a0640ecb9793fb0b3b8871750c9da80`

## Guincho forecast vs Cabo Raso

- Spot: Praia do Guincho in `jsonl/spots/documents.jsonl`
- Forecast as issued: `jsonl/forecast_slots_archive/documents.jsonl`
  (`scrapeTimestamp` = when we fetched it, `timestamp` = valid time)
- Station truth: `jsonl/station_readings/documents.jsonl` where `stationId` is `3294`
- Experiment series: `jsonl/fx_forecast_points/` and `jsonl/fx_observations/`
