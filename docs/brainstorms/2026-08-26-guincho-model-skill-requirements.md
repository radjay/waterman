---
date: 2026-08-26
topic: guincho-model-skill
---

# Guincho model skill vs Cabo Raso

Design spec: `docs/superpowers/specs/2026-08-26-guincho-model-skill-design.md`  
Handover (current results and rank rule): `docs/forecast-experiment-guincho-model-skill-handover.md`

## Problem Frame

Waterman shows one blended Windy forecast for Praia do Guincho. We need to know which open model best matches Cabo Raso station 3294 (nearby, 2.9 km), not wind on the sand. Convex no longer holds this history. The study runs from the local 2026-08-26 snapshot plus Open-Meteo Previous Runs at the beach.

## Requirements

**Truth and place**
- R1. Ground truth is Cabo Raso `3294` in `archive/jsonl/station_readings/`.
- R2. Sample models at Guincho beach (38.7333°N, 9.4733°W).
- R3. Drop hours with no station reading. Do not impute zeros.
- R4. Score Lisbon hours 07:00–22:00 only.

**Forecasts**
- R5. Fetch Open-Meteo Previous Runs at Guincho for `ecmwf_ifs025`, `icon_eu`, `icon_global`, `gfs_global`. Do not use `ecmwf_ifs` or ARPEGE for Day −1 / Day −2 (those series are all-null at this point).
- R6. Store those runs as gitignored JSONL under `archive/`. No Convex reads or writes.
- R7. Day 0 = unsuffixed hourly keys. Day −1 / Day −2 = `previous_day1` / `previous_day2`.
- R8. Skip a model for a lead that returns error or all-null wind. Preflight non-null counts.
- R9. Score blended Windy Guincho from `forecast_slots_archive` (`timestamp`, `scrapeTimestamp`), bucketed into Day 0 / −1 / −2. Drop leads of 72h or more.

**Ranking**
- R10. Effective wind is `(speed + gust) / 2`.
- R11. Report MAE, RMSE, bias, curve (Cascais detrended Pearson), and nortada MAE from station FROM direction. Nortada is diagnostic, not the winner rule.
- R12. Rideable = 07:00–22:00 hours where Cabo Raso effective wind ≥ 12 kt.
- R13. Winner = lowest MAE on rideable Day −1 among the Day −1 peer set, on shared hours. Caption `n`. Caveat: vs Cabo Raso nearby, not the sand.
- R14. Full-series tables are that peer set only.
- R15. Overlap tables add Windy blended on the shared-hour intersection (scrapes 2025-12-28 → 2026-08-19 minus holes). If rideable `n` < 200, Windy is context only.

**Page**
- R16. New wide page `/experiment/guincho-model-skill`, Research label “Guincho model skill”.
- R17. Page reads a compact summary JSON only.
- R18. Filters: lead day (default Day −1) and hours (default rideable). Winner card stays pinned to R13.
- R19. Winner card, rank bars, two tables (with nortada MAE), lead-day multiples, scatter, sample day (default 2025-08-20), coverage strip.
- R20. Kit components, theme tokens, `font-data` numbers, both themes, 390 and 1440.
- R21. Add ranking-bar and skill-table primitives to the kit in the same change.
- R22. Windy uses the marginal badge. No “beats Windy” winner claim.
- R23. Scatter and sample day show station + one model (default winner) + Windy when in overlap.
- R24. Missing summary → `EmptyState` plus the two commands.

**Isolation**
- R25. Write nothing to Convex and read nothing from Convex. Do not change the live Guincho model.

## Success Criteria

- Fetch and score commands run from local files, with preflight counts.
- The page names a Day −1 rideable shared-hour winner in knots, with `n` and the Cabo Raso caveat.
- Overlap table compares Windy on the same hours, or marks it context if `n` < 200.
- Station holes do not enter the scores.
- Nightglass, Dayglass, 390px, and 1440px all hold.

## Scope Boundaries

- No Convex for this study.
- No production model swap.
- No ICON-D2 / AROME / GFS+ / EXP3 / `ecmwf_ifs` Day −1 / ARPEGE Day −1.
- No Single Runs / exact 0–6h leads.
- Do not commit raw Previous Runs JSONL.
- Do not replace Cascais Model skill.

## Key Decisions

- Local snapshot, not Convex.
- Previous Runs (Day 0 / −1 / −2), not Single Runs. Day 0 uses unsuffixed keys.
- Beach coordinates, Cabo Raso nearby as truth.
- Winner from rideable Day −1 on shared hours.
- ECMWF via `ecmwf_ifs025`.
- Windy only on the overlap intersection, peer only if `n` ≥ 200.
- New kit primitives, not Cascais hex charts.

## Dependencies / Assumptions

- `archive/jsonl/` from 2026-08-26 is on disk.
- Open-Meteo Previous Runs has Day −1 wind at Guincho for the four R5 models.
- `forecast_slots_archive` is the blended line riders saw.

## Outstanding Questions

### Deferred to Planning
- [Affects R6][Technical] Exact gitignored path under `archive/`.
- [Affects R11][Technical] Reuse `analyzeModelSkill` vs a thin local join.
- [Affects R16][Technical] How the wide page leaves `max-w-lg` without restyling Cascais experiment pages.

## Next Steps

→ Implementation plan from the design spec.
