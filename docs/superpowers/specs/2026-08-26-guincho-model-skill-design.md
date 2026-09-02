---
date: 2026-08-26
topic: guincho-model-skill
status: implemented
markup_status: approved
---

# Guincho model skill vs Cabo Raso

**Related:** [Handover (current rank rule and results)](../../forecast-experiment-guincho-model-skill-handover.md), [Convex archive and 30-day retention](2026-08-26-convex-archive-retention-design.md), [Model analysis learnings](../../forecast-experiment-model-analysis-learnings.md), [Cascais Model skill](../../../app/experiment/model-analysis/page.js), [Going-forward forecast eval logging spec](../../forecast-eval-logging-spec.md)

> The rank rule in this spec (lowest MAE on rideable Day −1) is **stale**. The code ranks session match (F1 of catch vs false call) on Day −1, all daytime hours. Read the handover first.

## Problem

Waterman shows one blended Windy forecast for Praia do Guincho. We do not know which open model is closest to **Cabo Raso**, the nearest reliable station (Windguru 3294, 2.9 km from the beach).

This is not wind on the sand. The live app already treats Cabo Raso as nearby, not at-spot, and does not let it vote on the Guincho verdict. This study ranks models against that nearby sensor so we can pick what to show for Guincho planning. The winner card must state that caveat.

Cabo Raso has holes, including 2026-06-10 → 2026-08-05. Convex now keeps about 30 days of history. The 2026-08-26 snapshot under `archive/jsonl/` is the local source of truth.

Cascais Model skill ranks models at the marina. It does not answer Guincho. Open-Meteo previous-day runs in that experiment sit at Cascais Bay, not at the beach.

## Goal

Rank open wind models sampled at Guincho beach against Cabo Raso station readings. Also score the blended Windy line we showed riders, on the months where that archive exists.

The page names the lowest Day −1 rideable MAE model vs Cabo Raso. It does not change the live forecast in this change.

## Worked example

Take 15:00 Lisbon on 20 August 2025. Cabo Raso has readings that month. Windy blended is absent (that archive starts 2025-12-28).

| Forecast | Meaning | Compared to |
|---|---|---|
| Day 0 | Model on the 20th, before 15:00 | Cabo Raso at 15:00 |
| Day −1 | Model on the 19th for 15:00 on the 20th | Same station hour |
| Day −2 | Model on the 18th for 15:00 on the 20th | Same station hour |

Repeat for every hour 07:00–22:00 that has a station reading. The rank is the mean miss across all such hours from 2024 onward, not the winner of one day.

## Requirements

**Truth and place**
- R1. Ground truth is Cabo Raso station `3294` in `archive/jsonl/station_readings/` (`time`, `speed`, `gust`, `direction`).
- R2. Sample models at Guincho beach (38.7333°N, 9.4733°W), the Windy Guincho spot. Do not sample at the station.
- R3. Drop hours with no station reading. Do not fill gaps with zeros. The 2026-06-10 → 2026-08-05 hole is missing rows.
- R4. Score Lisbon hours 07:00–22:00 only, to match the day chart. If code reuses `analyzeModelSkill` from `lib/forecast-experiment/modelSkillAnalysis.js`, pass `startHour: 7` and `endHour: 22` (defaults are 06–21).

**Forecasts**
- R5. Fetch Open-Meteo Previous Runs for Guincho for models that return non-null Day −1 wind at this point: `ecmwf_ifs025` (ECMWF 0.25°), `icon_eu` (ICON7), `icon_global` (ICON13), `gfs_global` (GFS). Do **not** use `ecmwf_ifs` or `meteofrance_arpege_europe` for Day −1 / Day −2; live checks at Guincho show those `*_previous_day1` / `*_previous_day2` series all null. `ecmwf_ifs` Day 0 still fills; that is not enough to rank tomorrow’s forecast.
- R6. Store those runs as gitignored JSONL under `archive/`. Do not write them to Convex. Do not read Convex for this study.
- R7. Score three lead days. **Day 0** is the unsuffixed hourly keys (`wind_speed_10m`, `wind_gusts_10m`, `wind_direction_10m`) — Open-Meteo Previous Runs at Guincho does not fill `*_previous_day0`. **Day −1** is `*_previous_day1`. **Day −2** is `*_previous_day2`.
- R8. If a model returns HTTP error or all-null wind for a lead, skip that model for that lead and keep the rest. Preflight: log non-null counts per model and lead before scoring.
- R9. Score the blended Windy Guincho series in `archive/jsonl/forecast_slots_archive/` for spot Praia do Guincho (`jd70a2qnf700nrv9sk736513t17y4y86`). Archive fields: `timestamp` = valid time, `scrapeTimestamp` = issue time. Lead day = `floor((timestamp − scrapeTimestamp) / 24h)` mapped to Day 0 / −1 / −2. If several scrapes fall in the same lead day for one hour, keep the scrape with the latest `scrapeTimestamp`. Drop Windy hours whose lead is 72h or more.

**Ranking**
- R10. Effective wind is `(speed + gust) / 2`. Use speed or gust alone when only one exists.
- R11. Report MAE, RMSE, bias, and daily-curve skill (same curve metric as Cascais Model skill: detrended Pearson of the daytime shape; higher is better, shown in the table `curve` column). Split nortada vs other using **Cabo Raso observed FROM direction** (300–40°), never forecast direction. The split is diagnostic: extra table columns, not the winner rule. If the nortada ranking disagrees with the overall winner, the winner card says so.
- R12. **Rideable hours** are R4 daytime hours where Cabo Raso effective wind ≥ 12 kt. Show all daytime hours and rideable hours. Rideable here means the sensor was ≥ 12 kt, not proven wind on the sand.
- R13. The named winner is the Open-Meteo model with the lowest MAE on rideable hours at Day −1, on the **shared-hour** full series (hours where the station and every model in the Day −1 peer set have a value). Peer set = models in R5 that passed preflight for Day −1. Caption states `n`. This is “best vs Cabo Raso”, not a production swap.
- R14. Full-series tables include that peer set only. Per-model coverage (hours a model has when others do not) may appear as a secondary note, labeled not comparable.
- R15. Overlap tables include the peer set plus Windy blended. Shared hours = station reading **and** Windy scrape **and** every peer-set model for that lead day. Windy window: scrapes **2025-12-28 → 2026-08-19**, minus station holes (including 2026-06-10 → 2026-08-05). Caption states `n` and that the June–August 2026 hole removes peak-season weeks. If `n` is under 200 rideable hours, show Windy as context only and do not rank it as a peer.

**Page**
- R16. New route `/experiment/guincho-model-skill`. Research index link label: **Guincho model skill**, next to Cascais Model skill. The page is wide (desktop ~1440). It does not sit in the current `max-w-lg` experiment column. The Guincho shell uses theme tokens (`bg-page` / `bg-surface`), not `bg-white`.
- R17. The page reads a compact summary JSON only. Raw JSONL never goes to the browser.
- R18. Filters: lead day (Day 0 / Day −1 / Day −2, default Day −1) and hours (rideable / all, default rideable). Use kit `PillToggle` + `FilterGroup`. The **winner card stays pinned to R13** (Day −1, rideable, full shared series) and does not follow the filters. Rank bars, tables, and scatter follow the filters. Lead-day small multiples always show Day 0 / −1 / −2; the hours filter still applies.
- R19. Blocks, in order: winner card (with Cabo Raso nearby caveat); rank bars; full-series table (MAE, RMSE, bias, curve, nortada MAE); overlap table with Windy; lead-day small multiples; forecast vs station scatter; sample day; station coverage month strip.
- R20. Compose from the kit (`Card`, `Heading`, `Text`, `MicroLabel`, `Badge`, `EmptyState`). Numbers use `font-data`. Colours are theme tokens. No hex. Nightglass and Dayglass both have to read. At 390px: stack filters; rank bars full width; lead-day charts stack; scatter and sample day full width; tables and the coverage strip scroll sideways. Rank bars and tables expose values in text, not colour alone. PillToggle is keyboard operable.
- R21. The kit has no ranking bars and no skill table. Add those primitives (and `/ui-kit` fixtures) in the same change.
- R22. Winner and other Open-Meteo models use accent vs ink on `bg-track`. Windy blended uses the marginal badge. It is “what we showed”, not a peer open model. Do not write “beats Windy” as a winner claim.
- R23. Scatter and sample-day charts show the station, one selected model, and Windy when the day sits in the overlap. Do not draw every model at once. Default selected model = R13 winner. Default sample day = 2025-08-20. Sample-day picker over the three to five days in the summary. Reuse the same model PillToggle for scatter and sample day.
- R24. If the summary file is missing, show `EmptyState` and the fetch + score commands. While the summary loads, show the kit loader. If a filter combo has zero hours, say to switch lead day or hours. Skipped models (R8) stay out of bars/tables; a `MicroLabel` lists them.

**Isolation**
- R25. Write nothing to Convex and read nothing from Convex. Do not change the live Guincho forecast model.

## Success criteria

- A local command fetches Previous Runs for Guincho and writes gitignored JSONL. Preflight logs non-null counts per model and lead.
- A second command joins that file to Cabo Raso `station_readings` and Windy `forecast_slots_archive`, then writes a compact summary.
- `/experiment/guincho-model-skill` names a Day −1 rideable-hours winner among the Day −1 peer set, with MAE in knots, shared hour count, and the Cabo Raso nearby caveat.
- The overlap table places Windy blended on the same hours as the peer set, or marks Windy as context when `n` < 200 rideable hours.
- Hours with no Cabo Raso reading do not appear in any score.
- The page still renders when Open-Meteo JSONL is absent, as long as the summary exists.
- Both themes and both breakpoints (390 and 1440) hold.

## Scope boundaries

- No Convex writes or reads for this study.
- No change to the production Guincho model.
- No ICON-D2, AROME HD, HARMONIE, ICON 2I, GFS+, EXP3, `ecmwf_ifs` Day −1, or ARPEGE Day −1.
- No Open-Meteo Single Runs. We do not score exact 0–6h leads. Day 0 / Day −1 / Day −2 is the lead split.
- Do not commit raw Previous Runs JSONL.
- Do not replace Cascais Model skill.
- Do not sample at Cabo Raso coordinates.

## Data flow

```
Open-Meteo Previous Runs (Guincho beach)
        │
        ▼
archive/…/openmeteo_guincho_previous_runs/   (gitignored)
        │
        │   archive/jsonl/station_readings/   (3294)
        │   archive/jsonl/forecast_slots_archive/  (Guincho)
        ▼
join + score (reuse analyzeModelSkill in modelSkillAnalysis.js
              with startHour 7, endHour 22, or the same MAE helpers)
        │
        ▼
data/forecast-experiment/guincho-model-skill-summary.json
        │
        ▼
GET /experiment/guincho-model-skill
```

Praia do Guincho in the snapshot: `_id` `jd70a2qnf700nrv9sk736513t17y4y86`, `liveReportUrl` Windguru 3294, `windySpotId` 20914.

Known local coverage (2026-08-26 snapshot):

| Series | Range | Note |
|---|---|---|
| Station 3294 | 2022-05-05 → 2026-08-26 | Long hole 2026-06-10 → 2026-08-05; shorter holes in 2025-02 and 2025-10 |
| Windy blended Guincho | scrapes 2025-12-28 → 2026-08-19 | One line, not split by model |
| Open-Meteo at Guincho in `fx_forecast_points` | 12 days in 2026-05/06 | Too short. Fetch Previous Runs instead |
| `forecast_model_slots` | ~3 scrapes | Cannot rank models |

Open-Meteo Previous Runs archive starts around January 2024, but starts differ by model (e.g. `ecmwf_ifs025` Day −1 was empty in a 2024-02 probe and filled by 2024-06). Shared-hour ranking uses the overlap of whatever each model actually has.

Live Previous Runs check at 38.7333°N, 9.4733°W (2024-06 and 2025-08 samples): `icon_eu`, `icon_global`, `gfs_global`, `ecmwf_ifs025` have Day 0 / −1 / −2 wind. `ecmwf_ifs` and `meteofrance_arpege_europe` have Day 0 only.

## Summary JSON (must stay small)

Cascais Model skill crashed a tab when it sent raw years of points. The Guincho summary holds:

- Rankings and tables (full series + overlap), with hour counts
- Lead-day MAE per model
- Nortada vs other MAE (station direction)
- Scatter: a cap of sampled hours, not every hour
- Three to five sample days, including 2025-08-20
- Monthly coverage counts (station hours vs scored hours)
- Skipped models and preflight non-null counts

A few hundred KB at most. The page never opens the JSONL files.

## Page layout

Winner card (`Card` accent): one sentence with the R13 winner, MAE, `n`, and “vs Cabo Raso, 2.9 km from the beach”. Does not change with filters.

Rank bars: horizontal MAE, lower is better. Follows lead-day and hours filters.

Full-series table: model, hours, MAE, RMSE, bias, curve, nortada MAE. Winner gets the accent badge.

Overlap table: same columns plus Windy blended. Caption states 2025-12-28 → 2026-08-19 minus holes, the June–August 2026 hole, and the shared hour count.

Lead-day small multiples: three rank-bar charts (Day 0 / −1 / −2).

Forecast vs station: scatter, model picker is a `PillToggle`, default R13 winner.

Sample day: 07→22 clock, station trail vs selected model vs Windy when in overlap. Default day 2025-08-20. Picker for the other sample days.

Coverage: month strip. Filled cells have station hours we could score. Empty cells are downtime.

## Errors

- Missing archive JSONL: the score script stops and prints the path.
- Open-Meteo failure or all-null wind for a lead: skip that model for that lead.
- Missing summary: `EmptyState` plus the two commands.
- Empty Day 0 after reading unsuffixed keys: skip that cell; Day −1 and Day −2 still score.
- Overlap `n` under 200 rideable hours: still draw Windy, as context, not as a ranked peer.

## Tests

- Lead-day bucket (including unsuffixed Day 0 keys), rideable filter (≥ 12 kt, 07–22), MAE/bias, downtime drop, shared-hour intersection, Windy `scrapeTimestamp`/`timestamp` mapping. Fixtures only. No live Open-Meteo in unit tests.
- Page: empty state, winner card pinned to R13, both tables. Nightglass and Dayglass. 390px and 1440px.

## Key decisions

- Local snapshot, not Convex: retention already dropped Convex history to ~30 days.
- Previous Runs, not Single Runs: we pick a model for planning tomorrow, not a nowcast.
- Beach coordinates, not station coordinates: the product question is what to show for Guincho. Truth remains Cabo Raso nearby.
- Winner from rideable Day −1 on **shared hours**: calm hours and unequal samples can hide a model that fails when it matters.
- ECMWF via `ecmwf_ifs025`, not `ecmwf_ifs`: only the 0.25° slug has Day −1 archive at Guincho.
- Windy on the overlap intersection only, and only as a peer when `n` ≥ 200 rideable hours.
- New kit primitives rather than Cascais hex charts: both themes, no third score-chip problem.

## Dependencies / assumptions

- `archive/jsonl/` from the 2026-08-26 snapshot is present on this machine.
- Open-Meteo Previous Runs keeps serving wind at 38.7333°N, 9.4733°W for `ecmwf_ifs025`, `icon_eu`, `icon_global`, and `gfs_global` on Day −1.
- Windy `forecast_slots_archive` is the blended line riders saw, not per-model Windy.

## Outstanding questions

### Deferred to planning

- Exact gitignored path for Previous Runs JSONL under `archive/`.
- Whether to reuse `analyzeModelSkill` with a local loader that maps archive `time` / `speed` / `gust` / `direction` into experiment observation fields, or a thin join that only calls the MAE helpers.
- How the wide experiment page opts out of `app/experiment/layout.js` `max-w-lg` without restyling Cascais pages.

## Next steps

→ Implementation plan, then build.
