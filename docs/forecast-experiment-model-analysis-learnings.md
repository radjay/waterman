# Forecast Experiment — Model Analysis Learnings

Notes from building and running the wingfoil forecast experiment and **Model skill** analysis for Cascais Bay. Intended as a reference so we do not repeat mistakes (especially around model geography and Open-Meteo coverage).

**Related:** implementation plan at [`docs/superpowers/plans/2026-05-24-wingfoil-forecast-experiment.md`](superpowers/plans/2026-05-24-wingfoil-forecast-experiment.md). Model list and domain comment live in [`lib/forecast-experiment/locations.js`](../lib/forecast-experiment/locations.js). Guincho vs Cabo Raso is a separate local-archive study: [`docs/forecast-experiment-guincho-model-skill-handover.md`](forecast-experiment-guincho-model-skill-handover.md).

---

## What we are trying to do

Compare numerical weather prediction (NWP) models against **real wind observations** at Cascais Bay, using the same kind of “what did the model say ~1 day ahead?” data that a backtest needs. The internal UI is **Model skill** at `/experiment/model-analysis`.

Goals:

- Rank models by forecast accuracy (typical miss, shape of the daily wind curve).
- Align with what users see in apps like Windy (ICON7, ICON13, ECMWF, GFS, etc.).
- Avoid pulling proprietary or non-replayable Windy-only products into the experiment.

---

## Target site and ground truth

| Item | Value |
|------|--------|
| **Analysis location** | Cascais Bay — `38.6919°N, 9.4203°W` (`cascais-bay`) |
| **Primary ground truth** | Windguru station **2329** (Marina CNC), mapped to `cascais-bay` |
| **Lead indicator** | Windguru **3294** (Cabo Raso) — used elsewhere in the experiment, not the Model skill default |
| **Timezone** | `Europe/Lisbon` |
| **Rideable threshold** | 12 kt (experiment default) |

**Station status:** Windguru 2329 is **disabled for live fetch** (`sensor_offline` in config) but **historical backfill** from 2020 onward is still the main obs series for analysis. Replacing the physical sensor at the marina is expected to restore live data under the same Windguru ID.

Always confirm which obs source is in Convex for the analysis window before trusting rankings.

---

## Architecture (short)

```
Open-Meteo Previous Runs API  ──►  backfill scripts  ──►  Convex (fx_ forecast points)
Windguru / IPMA obs workers   ──►  Convex (fx_ observations)
                                                              │
                                                              ▼
                    GET /api/experiment/wind-model-backtest  (server-side, ~3 min)
                                                              │
                                                              ▼
                         /experiment/model-analysis  (small JSON summary + charts)
```

**Why server-side:** Loading ~13 months of raw obs + forecast in the browser and running analysis client-side **crashed the tab**. Analysis now runs in `lib/forecast-experiment/runModelSkillAnalysis.js` via the API route; the page only receives a compact summary (~3–8 KB).

**Canonical routes**

| Path | Role |
|------|------|
| `/experiment/model-analysis` | Model skill UI |
| `/experiment/wind-model-backtest` | Redirects to model-analysis |
| `/api/experiment/wind-model-backtest` | Server analysis API (name unchanged) |

---

## Open-Meteo data sources we use

Three endpoints matter; they are **not** interchangeable for backtesting.

| API | Host | Use case |
|-----|------|----------|
| **Previous Runs** | `previous-runs-api.open-meteo.com` | Historic forecasts at fixed lead times (`previous_day0`, `previous_day1`, …). **This is what backfill uses.** |
| **Historical Forecast** | `historical-forecast-api.open-meteo.com` | Continuous stitched “best estimate” timeseries from model first hours — good for ML, not the same as fixed lead-time skill. |
| **Single Runs** | `single-runs-api.open-meteo.com` | Full output of one model run (`run=2025-05-01T00:00`). |

Previous Runs archive start is roughly **January 2024** for most models (GFS wind back to March 2021). Not every model on the forecast docs page has Previous Runs wind archived.

### Previous-day offsets

For a given model at Cascais (May 2025 sample):

| Model | `previous_day0` | `previous_day1` | `previous_day2` |
|-------|-----------------|-----------------|-----------------|
| `icon_eu` | empty | **48 hrs** | **48 hrs** |
| `gfs_global`, `icon_global` | varies | usually populated | usually populated |
| `ecmwf_ifs`, `meteofrance_arpege_europe` | often empty | often empty at this site | check per window |
| `icon_d2`, `meteofrance_arome_france_hd` | empty at Cascais | empty | empty |

Skill analysis filters to models matching `-previous-dayN` suffixes when present.

**Always verify** non-null wind counts at **your coordinates** before adding a model — not just that the API returns HTTP 200. A 200 with all `null` values is useless.

Quick check:

```bash
curl -s "https://previous-runs-api.open-meteo.com/v1/forecast?\
latitude=38.6919&longitude=-9.4203&\
hourly=wind_speed_10m_previous_day1&\
models=icon_eu&\
start_date=2025-05-01&end_date=2025-05-02&\
wind_speed_unit=kn" | python3 -c "
import sys, json
d = json.load(sys.stdin)
v = d.get('hourly', {}).get('wind_speed_10m_previous_day1', [])
print('non-null', sum(x is not None for x in v))
"
```

---

## Models in `FX_MODELS` (Cascais)

These five models are enabled for backfill. See the comment above `FX_MODELS` in `locations.js`.

| Waterman slug | Open-Meteo id | Windy.app label (approx.) | Resolution | Notes |
|---------------|---------------|---------------------------|------------|--------|
| `icon-eu` | `icon_eu` | **ICON7** | ~7 km | **Best open high-res DWD option for Portugal.** Primary local upgrade. |
| `icon-global` | `icon_global` | **ICON13** | ~11 km | Global DWD nest. |
| `gfs-global` | `gfs_global` | **GFS27** | ~13 km | NOAA GFS. |
| `ecmwf-ifs-hres-9km` | `ecmwf_ifs` | **ECMWF** | ~9 km | Previous Runs coverage at Cascais can be sparse; verify per window. |
| `meteofrance-arpege-europe` | `meteofrance_arpege_europe` | (not in Windy 6-line compare) | ~11 km | European ARPEGE; Previous Runs often empty at Cascais. |

**Windy’s local high-res line at Cascais is ICON7 (`icon_eu`), not ICON-D2.**

---

## Models we evaluated and removed

We briefly added four models after misreading Open-Meteo region labels as covering Iberia. A **3-day backfill** (May 1–3, 2025) and coordinate sweeps showed they do **not** provide usable Previous Runs wind at Cascais.

| Model | Open-Meteo id | Claim we wrongly made | Reality at Cascais (38.69°N, 9.42°W) |
|-------|---------------|----------------------|----------------------------------------|
| ICON-D2 | `icon_d2` | “Central Europe incl. Portugal” | API 200 but **all null**. DWD domain is Germany / Benelux / Alps — reaches ~Bordeaux, **not** Portugal. |
| AROME HD | `meteofrance_arome_france_hd` | Useful for the bay | **All null** on Previous Runs; France-only on live forecast. Not archived for `previous_dayN` even in Paris. |
| HARMONIE | `knmi_harmonie_arome_europe` | Southern/Central Europe incl. Iberia | **HTTP 400** — domain is Central/Northern Europe (+ Italy in some cells), **not** Portugal. |
| ICON 2I | `italia_meteo_arpae_icon_2i` | “Southern Europe incl. Iberia” | **HTTP 400** — **Italy only** (works at Rome/Naples). |

**Lesson:** “Listed on Open-Meteo” ≠ “covers Cascais.” Test at `38.6919, -9.4203` on **Previous Runs** before adding to `FX_MODELS`.

### Coverage spot-check (Previous Runs, May 2025, day1)

| Location | `icon_eu` | `icon_d2` | `italia_meteo_arpae_icon_2i` | `knmi_harmonie_arome_europe` |
|----------|-----------|-----------|------------------------------|------------------------------|
| Cascais | ✅ 48 | ❌ 0 | ❌ 400 | ❌ 400 |
| Lisbon / Faro / Seville | ✅ | ❌ 0 | ❌ 400 | ❌ 400 |
| Paris / Munich | ✅ | ✅ 48 | ❌ 400 | ✅ 48 |
| Rome | ✅ | ❌ 0 | ✅ 48 | ✅ 48 |

---

## Windy.app compare chart (6 models)

Mapping from the Windy compare panel at Cascais to what we can replay:

| Windy label | Real source | Open-Meteo / experiment |
|-------------|-------------|-------------------------|
| **ICON13** | DWD ICON global | ✅ `icon_global` |
| **ICON7** | DWD ICON-EU | ✅ `icon_eu` |
| **ECMWF** | ECMWF IFS | ✅ `ecmwf_ifs` |
| **GFS27** | NOAA GFS | ✅ `gfs_global` |
| **GFS+** | Windy max-in-cell GFS variant | ❌ No public equivalent |
| **EXP3** | Windy proprietary AI coastal ~3 km | ❌ Windy-only; no hindcast API |

**GFS+** often reads higher than plain GFS (max wind in the grid cell). **EXP3** is terrain/coast-aware but not available outside Windy. Closest open alternatives people mention (ICON-D2, AROME) **do not cover Cascais** on Open-Meteo Previous Runs.

At a single timestamp, compare mode can show large spread (e.g. GFS+ ~11 kt vs ICON lines ~5 kt) — that is expected and why multi-model skill work matters.

---

## How Model skill analysis works

Implementation: `lib/forecast-experiment/modelSkillAnalysis.js`, orchestration: `runModelSkillAnalysis.js`.

**Pairing:** For each local day, hourly forecast points are matched to normalized observations (06:00–21:00 Lisbon by default).

**Metrics:**

| Metric | Meaning |
|--------|---------|
| **MAE (effective wind)** | Typical absolute miss in kt — primary ranking for “who is closest on average.” Effective wind = max(sustained, gust) style pairing used in the experiment. |
| **RMSE / bias** | Penalizes large errors / systematic over- or under-forecasting. |
| **Daily curve correlation** | How well the forecast tracks the **shape** of the day (ramps, timing) — detrended Pearson + delta correlation. |
| **Nortada vs non-nortada** | Split by wind direction (from north: 300–40° meteorological). |

**Prediction cutoff:** 07:00 Lisbon local — aligns with “what did we know yesterday morning?” framing used elsewhere in the experiment.

**UI (simplified):** Winner card, MAE scoreboard bar chart, scatter + sample-day line charts (`ForecastAccuracyCharts.js`).

---

## Empirical findings (dev data, Summer 2025)

On overlapping windows in dev Convex data (May–Sep 2025, Cascais Bay):

- **`icon-eu-previous-day1`** often ranks well on typical miss (MAE) — consistent with it being the right regional high-res model for Portugal.
- **`ecmwf_ifs`** can win on some full-overlap windows depending on lead and data availability.
- Models with **no Previous Runs wind at Cascais** never appear in rankings regardless of config.

Re-run analysis after backfill changes; rankings are data-dependent, not fixed truths.

---

## Operations

### npm scripts

```bash
npm run fx:backfill:openmeteo      # Previous Runs → Convex (all enabled FX_MODELS)
npm run fx:backfill:windguru        # Windguru history → Convex
npm run fx:analyze:model-skill      # CLI skill analysis
npm run fx:backtest:predictions     # v1 vs v2 kick-in backtest
npm run fx:score:predictions        # Score stored predictions vs labels
npm run test:fx                     # Unit tests
```

### Small backfill window

```bash
FX_BACKFILL_START_DATE=2025-05-01 FX_BACKFILL_END_DATE=2025-05-03 \
  npm run fx:backfill:openmeteo
```

After a test backfill, confirm inserted point counts in Convex or re-load `/experiment/model-analysis` for that date range.

### Dev server

```bash
npm run dev   # http://localhost:3010/experiment/model-analysis
```

---

## Checklist: adding a new model

1. Look up the Open-Meteo `models=` slug (e.g. from [forecast docs](https://open-meteo.com/en/docs) / [historical forecast table](https://open-meteo.com/en/docs/historical-forecast-api)).
2. **curl Previous Runs** at `38.6919, -9.4203` for `wind_speed_10m_previous_day1` over a few days — require **non-null** values, not just HTTP 200.
3. Add entry to `FX_MODELS` in `locations.js` with realistic `runHoursUtc` and `expectedAvailabilityLagHours`.
4. Run a **short backfill** (2–3 days) and confirm `insertedPoints > 0`.
5. Load Model skill for that window and confirm the model appears in the scoreboard.

If step 2 fails, document why in this file or in a comment near `FX_MODELS` — do not enable backfill for models that only work outside Portugal unless the experiment location changes.

---

## Key files

| Path | Role |
|------|------|
| `lib/forecast-experiment/locations.js` | Locations, `FX_MODELS`, obs sources |
| `lib/forecast-experiment/openMeteoClient.js` | Previous Runs / Single Runs URL builders |
| `lib/forecast-experiment/runModelSkillAnalysis.js` | Server-side analysis runner |
| `lib/forecast-experiment/modelSkillAnalysis.js` | Metrics, ranking, chart data |
| `scripts/fx-backfill-openmeteo-previous-runs.mjs` | Open-Meteo backfill worker |
| `app/api/experiment/wind-model-backtest/route.js` | Analysis API |
| `app/experiment/model-analysis/page.js` | Model skill UI |
| `convex/forecastExperiment.ts` | Convex schema and mutations |

---

## Bay wind prediction v1 vs v2 (Summer 2025 backtest)

Kick-in prediction backtest compares **baseline-ensemble-v1** (blended multi-model + Cabo lag boost) against **bay-wind-v2** (ICON7 previous-day1 + bias/lag tables). Run:

```bash
FX_BACKTEST_SEASON=2025 npm run fx:backtest:predictions
```

**Baseline (wingfoil-light / 12 kt, dev Convex, 2026-05-25):**

| Version | Kick-in MAE | Within ±1h | False + | False − | Days comparable |
|---------|-------------|------------|---------|---------|-----------------|
| v1 `baseline-ensemble-v1` | **211 min** | 22/88 | 26 | 12 | 88 |
| v2 `bay-wind-v2` (pre-tune) | 298 min | 9/53 | 11 | 47 | 53 |
| v2 `bay-wind-v2` (zero nortada bias) | **257 min** | 24/91 | 28 | 9 | 91 |

**Findings:**

- v2 day-ahead mode uses a **single model** (`icon-eu-previous-day1`) while v1 blends all available models — most of the remaining gap vs v1 (257 vs 211 min MAE) is structural.
- v1 applies a Cabo nowcast boost whenever Cabo obs exist before the 07:00 cutoff; v2 only applies Cabo lag in explicit **nowcast** mode (live worker switches when Cabo obs are &lt;6 h old).
- Zeroing mined nortada afternoon bias (-1 kt) improved v2 MAE from 298 → **257 min** and false negatives from 47 → 9, but v2 still trails v1 on day-ahead kick-in until live nowcast scoring accumulates or Phase 6 ML ships.
- Live worker writes v2 by default (`FX_PREDICTION_VERSION=v2`); set `FX_PREDICTION_VERSION=v1` to keep baseline only. Threshold preset via `FX_RIDEABILITY_PRESET` (`windfoil` 10 / `wingfoil-light` 12 / `wingfoil-heavy` 15 kt).
- Stored predictions are scored hourly via `fx:score:predictions` against `fx_daily_labels` (marina obs, user reports as weak labels, Cabo lag inference).

**Related:** [Cascais Bay wind prediction plan](superpowers/plans/2026-05-25-cascais-bay-wind-prediction.md), `/experiment/backtest?season=2025&model=v2`.

---

## Bay wind prediction v3 ML (`bay-wind-v3-ml`)

Phase 6 adds a multi-model ML pipeline: export day-level rows (`npm run fx:export:ml-dataset -- --all-presets`), train locally (`npm run fx:train:bay-ml` — LightGBM when `libomp` is available, otherwise scikit-learn gradient boosting with the same JSON tree export), and score via Node inference (`buildBayWindPredictionV3`).

**Summer 2025 kick-in MAE (dev Convex, 2026-05-25):**

| Preset | kt | v1 MAE | v2 MAE | v3 MAE | v3 vs v2 |
|--------|-----|--------|--------|--------|----------|
| `windfoil` | 10 | 235 min | 233 min | **90 min** | −143 min |
| `wingfoil-light` | 12 | 211 min | 257 min | **89 min** | −168 min |
| `wingfoil-heavy` | 15 | 224 min | 207 min | **97 min** | −110 min |

Run:

```bash
FX_BACKTEST_SEASON=2025 npm run fx:backtest:predictions -- --preset wingfoil-light
```

**Findings:**

- v3 uses GFS + ICON13 + ICON7 previous-day1 hourly features, Cabo state at 07:00, calendar fields, and `thresholdKnots` as inputs — no hand-tuned bias tables.
- Kick-in MAE improves sharply vs v1/v2 on Summer 2025, but v3 reports more **false positives** (predicted kick-in when marina obs never sustained threshold). Treat MAE gains alongside false+/− counts before promoting v3 to the live worker.
- Trained artifact: `data/forecast-experiment/bay-wind-v3-model.json`. Compare in UI: `/experiment/backtest?season=2025&model=v3&preset=wingfoil-light`.

---

## Open questions / next steps

- **ECMWF / ARPEGE Previous Runs at Cascais:** intermittent or empty `previous_dayN` — worth a dedicated audit if we rely on them for skill rankings.
- **Ground truth:** restore live Windguru 2329 at the marina; until then rankings depend on historical obs quality and gaps.
- **Windy parity:** GFS+ and EXP3 remain unreachable for open hindcasting; document that gap in user-facing copy if we ever surface experiment insights outside `/experiment`.
- **Alternative ingest:** Historical Forecast API could theoretically supply models missing from Previous Runs, but that is a different skill question (stitched analysis vs fixed lead time) and still would not bring ICON-D2 to Cascais.

---

*Last updated: 2026-05-25 — reflects model-domain verification, removal of ICON-D2/AROME/HARMONIE/ICON 2I from `FX_MODELS`, Model skill UI/API work, and bay-wind-v2 live prediction + backtest baseline.*
