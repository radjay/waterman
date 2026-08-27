# Guincho model skill — handover

**Branch:** `feat/guincho-model-skill`  
**Date:** 2026-08-27  
**Page:** `/experiment/guincho-model-skill`  
**This study does not change the live Guincho forecast.**

Read this file first. Then open the PDF report. Then open the page. The design spec is older than the rank rule in the code.

| Document | Role |
|---|---|
| This file | What we built, what we tried, what we learned, which files to use |
| `docs/forecast-experiment-guincho-model-skill-report.pdf` | Print of the Findings page on 2026-08-27 (3 pages). Winner card and slice ranks. Detail tables were collapsed in the print |
| `docs/brainstorms/2026-08-26-guincho-model-skill-requirements.md` | Original requirements |
| `docs/superpowers/specs/2026-08-26-guincho-model-skill-design.md` | Original design. Rank rule in that file is **stale** |
| `docs/forecast-experiment-model-analysis-learnings.md` | Cascais Model skill. Different spot. Different station |

---

## 1. The question

Waterman shows one blended Windy forecast for Praia do Guincho. We need to know which **open** wind model is best for **planning tomorrow**.

Ground truth is **Cabo Raso** (Windguru station `3294`), 2.9 km from the beach. This is **not** wind on the sand. The live app already treats Cabo Raso as nearby. It does not let that station vote on the Guincho verdict.

The product goal from the last pass:

> Call every session that the station measured. Do not call days that were too light. Extra wind is not a miss (you rig smaller).

A **session day** is a Lisbon daytime (07:00–22:00) with **at least 4 hours** at **12 kt** or more of effective wind. Effective wind is `(speed + gust) / 2`.

The named winner today is **ICON7** (`icon_eu` / slug `icon-eu`) on Day −1, all daytime hours, shared hours.

---

## 2. Hard limits

Keep these. They are not optional.

- Do **not** read or write Convex for this study. Convex now keeps about 30 days. That is too short.
- Do **not** change the production Guincho model.
- Do **not** commit raw Previous Runs JSONL. `.gitignore` already hides `/archive/**` except `archive/README.md`.
- Do **not** sample models at Cabo Raso coordinates. Sample at the beach: **38.7333°N, 9.4733°W**.
- Do **not** use `ecmwf_ifs` or `meteofrance_arpege_europe` for Day −1 / Day −2. Those previous-day series are all-null at this point. Use `ecmwf_ifs025` for ECMWF.
- Do **not** score Open-Meteo Single Runs. We score Previous Runs at Day 0 / −1 / −2 only.
- Do **not** send raw JSONL to the browser. The page reads the compact summary only.
- Do **not** replace Cascais Model skill at `/experiment/model-analysis`.

---

## 3. What we tried (in order)

The rank rule changed three times. The design spec still describes step 1.

### 3.1 Two-way MAE (original spec)

Winner = lowest MAE on **rideable** hours at **Day −1**, on shared hours.

Rideable hour = Cabo Raso effective wind ≥ 12 kt, 07:00–22:00.

This is the Cascais Model skill pattern. It answers “how many knots off is the curve?” It does not answer “did we tell a rider to go?”

### 3.2 Graphic report, then pickers that work

We built a wide report at `/experiment/guincho-model-skill`:

- Findings tab (tables, rank bars, slices)
- Spot check tab (one-day charts)
- Lead-day picker (same day / yesterday / two days ago)
- Hours picker (all daytime hours / station was windy)
- Model picker on the spot check

Pickers broke twice. See §5.3.

### 3.3 Too-light only (underperformance)

The next ask: days where the wind is **weaker than the forecast** matter more than a two-way miss. Extra wind is fine.

We added:

- One-sided MAE (`underMae`): `max(0, forecast − observed)`
- False-go hours: forecast ≥ 12 kt and station < 12 kt
- False-go days: model called a session and the station did not

A winner from **false-go rate alone** picked **ECMWF**. ECMWF almost never calls a session at Day −1. Few false calls, many missed real days. That was rejected.

### 3.4 Session match (current)

The last ask: the ideal model predicts **every** session the station measured, and does not invent sessions.

Rank (highest first):

1. Session F1 (`sessionF1Pct`) — harmonic mean of precision and recall at **day** level
2. Recall (`recallPct`) — share of real session days the model caught
3. False-call rate (`falseGoDayPct`) — share of called days that did not blow
4. One-sided MAE (`underMae`)

Code: `rankTuple` in `lib/forecast-experiment/guinchoModelSkill.js`.

Winner source: Day −1, **all** daytime hours, shared hours. All hours, not rideable-only. Rideable-only **cannot** show a false call: every hour in that set is already windy at the station.

The page default is `hours=all`. The winner card **follows the filters**. The summary still stores a pinned winner at Day −1 / all hours (`summary.winner`).

---

## 4. What we learned

### 4.1 ICON7 matches real sessions best

Day −1, all daytime hours, shared hours (`n` = 11 544 hours). Cabo Raso had **535** real session days.

| Model | Open-Meteo slug | Caught | Missed | False calls | Caught % | False calls % | Match score % |
|---|---|---|---|---|---|---|---|
| ICON7 | `icon_eu` | 498 | 37 | 95 | 93.1 | 16.0 | **88.3** |
| ICON13 | `icon_global` | 466 | 69 | 75 | 87.1 | 13.9 | 86.6 |
| GFS | `gfs_global` | 415 | 120 | 49 | 77.6 | 10.6 | 83.1 |
| ECMWF 0.25° | `ecmwf_ifs025` | 162 | 373 | 5 | 30.3 | 3.0 | 46.2 |

ICON7 catches the most real days. It also calls more empty days than GFS. The match score still ranks it first because missed sessions count.

ECMWF at this point is quiet. Low false-call rate. It misses most real days (373 of 535). Do not treat that as “safe”.

GFS has fewer false calls than ICON7 and misses more real days.

Same order holds at Day 0 and Day −2 on all hours.

### 4.2 Rideable-only hides false calls

On the rideable-hours table, every model has **0** false-call days. That is by construction. Use **all hours** when you judge session calls.

On rideable hours the match score still ranks ICON7 first (94.3% at Day −1). ECMWF stays last (45.3%) because it still misses.

### 4.3 Extra wind is not a miss

If the station is above 12 kt and the forecast was also a go, extra knots are not a false session and not a miss. Tests lock this: `extra wind above the forecast is not a false session`.

### 4.4 ECMWF slug

Use `ecmwf_ifs025`. The `ecmwf_ifs` previous-day keys are empty at Guincho. ARPEGE previous-day keys are empty too.

### 4.5 Windy overlap is short

Windy blended lives in `forecast_slots_archive` (scrapes **2025-12-28 → 2026-08-19**), minus station holes. Shared hours with all four models at Day −1: about **770** hours, **72** real session days.

That is below the original “Windy is a peer if rideable `n` ≥ 200 hours” spirit for **days**. Treat Windy as context. On that short overlap, ICON13 / ICON7 / Windy are close; ECMWF still misses almost all sessions.

### 4.6 Station holes

Cabo Raso in the 2026-08-26 snapshot: **2022-05-05 → 2026-08-26**, with a long hole **2026-06-10 → 2026-08-05**, plus shorter holes in 2025-02 and 2025-10.

Hours with no station reading never enter a score. We do not fill zeros.

Station daytime hours in the summary coverage strip: **20 146**. Hours we could score against Day −1 models: **11 752**. Early station months (2022–2023) have no Previous Runs overlap.

### 4.7 Nortada vs other directions

Nortada = station **FROM** direction 300°–40°. May–September is the nortada season in the slices.

At Day −1, all hours:

- North wind: ICON7 still leads (F1 89.2, recall 90.1 on 385 real days).
- Other directions: ICON13 leads slightly (F1 83.5) over GFS (83.3) and ICON7 (81.8). ICON7 still has the highest recall there (94.7) and more false calls (28%).

The winner card states the slice disagreement when it exists.

### 4.8 Cascais Model skill is a different study

Cascais ranks models at the marina (station 2329) from Convex `fx_*` tables. This Guincho study:

- Uses the **local archive**, not Convex
- Samples the **beach**, not the station
- Scores **Cabo Raso**, not the marina
- Ranks **session match**, not two-way MAE

Do not mix the two pages.

---

## 5. Page and picker notes

### 5.1 Route and layout

- Research index: `/experiment/research` → “Guincho model skill”
- Wide shell: `components/experiment/ExperimentShell.js` uses `max-w-[1440px]` on this path. Other experiment pages stay `max-w-lg`.
- Theme tokens only (`bg-page`, `bg-surface`, `text-ink`). The old experiment layout used `bg-white` / `bg-newsprint`. Do not put those back on this page.
- Numbers use `font-data`.

Tabs:

- **Findings** — winner card, rank bars (match score / caught % / false calls %), session table, Windy overlap, lead-day multiples, nortada and season slices, scatter, coverage strip
- **Spot check** — 24 sample days in four buckets (nortada/other × May–Sep / Oct–Apr). The set leans toward days a model missed a real session or called one that did not blow. Badges: “False call” / “Missed session”

Default sample day **2025-08-20** is in the nortada · May–Sep bucket.

### 5.2 Kit additions (same change)

New primitives live in the kit and in `/ui-kit`, not only on the experiment page:

| Component | Path |
|---|---|
| Rank bars | `components/chart/RankingBars.js` |
| Forecast vs station scatter | `components/chart/ForecastObsScatter.js` |
| Sample day wind | `components/chart/SampleDayWind.js` |
| Month coverage strip | `components/chart/CoverageStrip.js` |
| Skill table | `components/ui/SkillTable.js` |
| Details block | `components/ui/DetailsBlock.js` |

`PillToggle` now accepts `href` on an option. Click calls `onChange` and `preventDefault` when JS runs. Without JS the browser follows the `href`.

### 5.3 Why pickers looked dead

Two separate bugs. Both bit the Tailscale load (`http://100.109.13.15:3010`).

1. **Href reloads.** A picker as `<a href="?lead=1">` reloads the RSC page and jumps to the top. The user hated that. Fix: `preventDefault` + local state. Keep `href` as a fallback.
2. **No hydration on Tailscale.** Next.js 16 blocked `/_next/static` from Origin `100.109.13.15`. HTML rendered. Scripts never ran. Buttons with no href then did nothing. Fix: `allowedDevOrigins` in `next.config.js` for `100.109.13.15` and `192.168.50.68`.

If pickers die again on a new host, add that Origin to `allowedDevOrigins` first. Do not rewrite the picker.

Dev server: `npm run dev` (port **3010**).

---

## 6. Datasets

### 6.1 Gitignored (on this machine, not in git)

From the 2026-08-26 Convex snapshot plus one Open-Meteo fetch. `.gitignore`: `/archive/**` with `!/archive/README.md`.

| File | Size (this machine) | What it is |
|---|---|---|
| `archive/jsonl/station_readings/documents.jsonl` | ~72 MB | Windguru readings. Filter `stationId === "3294"` |
| `archive/jsonl/forecast_slots_archive/documents.jsonl` | ~128 MB | Blended Windy line we showed. Filter `spotId === "jd70a2qnf700nrv9sk736513t17y4y86"`. `timestamp` = valid time, `scrapeTimestamp` = issue time |
| `archive/jsonl/openmeteo_guincho_previous_runs/documents.jsonl` | ~32 MB | Previous Runs at the beach. One JSON object per hour per model per lead. From `npm run fx:fetch:openmeteo-guincho` |

The full zip is `waterman-convex-2026-08-26.zip` (checksum in `archive/README.md`). R2 bucket `waterman-archive` holds the split parts.

Praia do Guincho in the snapshot:

- `_id` / `GUINCHO_SPOT_ID`: `jd70a2qnf700nrv9sk736513t17y4y86`
- `windySpotId`: `20914`
- `liveReportUrl`: Windguru 3294
- Lat/lon: 38.7333, −9.4733

Fetch window for Previous Runs: `FX_GUINCHO_START_DATE` default **2024-01-01** to today. Month chunks. Models: `ecmwf_ifs025`, `icon_eu`, `icon_global`, `gfs_global`.

Day 0 uses unsuffixed hourly keys (`wind_speed_10m`, …). Day −1 / −2 use `*_previous_day1` / `*_previous_day2`. `*_previous_day0` is empty at this point.

### 6.2 Tracked (in git on this branch)

| File | Size | What it is |
|---|---|---|
| `data/forecast-experiment/guincho-model-skill-summary.json` | ~358 KB | Compact scores the page reads. Rebuilt 2026-08-27. **Do not hand-edit.** Rebuild with the analyze command |
| `docs/forecast-experiment-guincho-model-skill-report.pdf` | ~246 KB | Findings print, 2026-08-27. Winner card, nortada/season slices. Detail tables were collapsed |

The summary holds:

- `winner` — Day −1, all hours, session-match winner
- `peerSet` — `ecmwf-ifs025`, `icon-eu`, `icon-global`, `gfs-global`
- `fullSeries.byLead[0|1|2].all|rideable` — tables
- `overlap.byLead[…]` — same plus Windy blended
- `breakdown.byLead[…].nortada|other|maySep|octApr`
- `leadDayMae` — small multiples
- `scatter` — cap 250 points per model per lead
- `sampleDays` — 24 days
- `spotChecks` — four buckets × up to 6 dates
- `coverage` — 51 months of station vs scored hours
- `labels` — display names

The page never opens the JSONL files.

### 6.3 Rebuild

Need the three gitignored JSONL files on disk first.

```bash
npm run fx:fetch:openmeteo-guincho   # writes archive/jsonl/openmeteo_guincho_previous_runs/documents.jsonl
npm run fx:analyze:guincho-skill     # writes data/forecast-experiment/guincho-model-skill-summary.json
```

The analyze script still prints `Winner Day −1 rideable: ICON7 MAE 2.5 kt`. That string is stale. `winner.mae` is `underMae`. The winner is Day −1 **all** hours. Trust the JSON and the page, not that log line.

---

## 7. Code map

| Path | Role |
|---|---|
| `lib/forecast-experiment/guinchoModelSkillConstants.js` | IDs, 12 kt, 4-hour session, paths, model list |
| `lib/forecast-experiment/guinchoModelSkill.js` | Join, score, rank, sample days, summary shape |
| `lib/forecast-experiment/guinchoArchive.js` | JSONL loaders |
| `lib/forecast-experiment/loadGuinchoSkillSummary.js` | Read summary for the page |
| `scripts/fx-fetch-openmeteo-guincho.mjs` | Fetch Previous Runs |
| `scripts/fx-analyze-guincho-model-skill.mjs` | Score and write summary |
| `app/experiment/guincho-model-skill/page.js` | RSC: parse `lead`, `hours`, `tab`, `model` |
| `app/experiment/guincho-model-skill/GuinchoModelSkillView.js` | Findings UI |
| `app/experiment/guincho-model-skill/GuinchoSpotCheck.js` | Spot check UI |
| `app/api/experiment/guincho-model-skill/route.js` | GET summary JSON |
| `next.config.js` | `allowedDevOrigins` for Tailscale / LAN |

Constants to know:

- `RIDEABLE_KNOTS = 12`
- `SESSION_MIN_HOURS = 4` (same value as `SPOT_CHECK_MIN_HOURS`)
- `START_HOUR = 7`, `END_HOUR = 22`
- `OVERLAP_PEER_MIN_N = 200` (Windy context vs peer, by **hour** count)

---

## 8. Tests

```bash
node --test tests/forecast-experiment/guinchoModelSkill.test.mjs
npx vitest run app/experiment/guincho-model-skill components/chart/__tests__/RankingBars.test.js components/chart/__tests__/SampleDayWind.test.js components/ui/__tests__/DetailsBlock.test.js components/ui/__tests__/PillToggle.test.js components/ui/__tests__/SkillTable.test.js
```

The scorer suite includes:

- Lead-day buckets (unsuffixed Day 0 keys)
- Shared-hour intersection
- Windy last-scrape-in-lead
- “A model that misses real sessions loses to one that calls them”
- Extra wind is not a false session
- Missing archive path names the file

**Stale test name:** `winner is the model with the lowest false-go rate on Day −1`. The assertion still passes on that tiny fixture. The **name** describes the old rule. Rename it if you touch the file.

View tests check empty state, session-match copy, and that the view does not import the archive loader.

---

## 9. Known gaps for the next agent

- Design spec R13 still says “lowest MAE on rideable Day −1”. Code ranks session F1 on Day −1 **all** hours.
- Winner card on the page follows filters. Spec said the card stays pinned. `summary.winner` is still the pinned object.
- Analyze-script console line still says “MAE” / “rideable”.
- One test title still says “false-go rate”.
- Windy overlap is too short for a strong “beats Windy” claim. Do not write that claim.
- No production swap. If someone wants ICON7 on the live Guincho forecast, that is a **new** change with its own spec.
- `forecast_model_slots` and Convex `fx_forecast_points` at Guincho are too short to rank models. Do not go back to those.
- Browser checks: Nightglass and Dayglass, 390px and 1440px, Tailscale Origin. Pickers must not reload. Hydration must run.

---

## 10. Suggested next work (not started)

These are open. Do not treat them as decided.

1. Update the design spec so R13 matches session F1, or restore MAE if product intent changed again.
2. Decide whether the live Guincho model should become ICON7. This branch must not do that by itself.
3. Fetch more Windy history, or accept Windy as context only.
4. Score gust vs speed as the call metric (the card already reports which model has the lower too-light MAE on each).
5. Rename the stale test and the analyze log line.

---

## 11. How to inspect in 10 minutes

1. Confirm you are on `feat/guincho-model-skill`.
2. Open `docs/forecast-experiment-guincho-model-skill-report.pdf`. That is the Findings print from 2026-08-27.
3. Confirm `data/forecast-experiment/guincho-model-skill-summary.json` exists.
4. Confirm the three archive JSONL files exist if you need to rebuild.
5. Run `npm run dev` and open `/experiment/guincho-model-skill`.
6. On Tailscale, use `http://100.109.13.15:3010`. Confirm `/_next/static` loads (pickers work, no full reload).
7. Findings: ICON7 should show about **93%** real days caught, **7%** missed, **16%** false calls. That must match the PDF.
8. Hours = “Station was windy”: false calls go to 0. That is expected.
9. Spot check: change the model. The charts must update without a jump to the top. The PDF does not include Spot check.
