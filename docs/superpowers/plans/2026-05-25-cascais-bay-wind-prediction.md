# Cascais Bay Wind Prediction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an explainable `bay-wind-v2` prediction model that outputs bay kick-in time and confidence from NWP + Cabo Raso, backtest it against historical marina data, and wire it into the experiment workers and UI.

**Architecture:** Mine bias and lag coefficients offline from existing Convex history; implement v2 as pure functions in `lib/forecast-experiment/`; reuse `buildDayBacktest` / `summarizeWeekBacktest` for evaluation; store predictions in existing `fx_predictions` with a new `modelVersion`. Keep v1 (`baseline-ensemble-v1`) for comparison until v2 wins on backtest metrics.

**Tech Stack:** Node 18+, `node:test`, Convex (`fx_*` tables), existing Open-Meteo + Windguru pipeline, Next.js `/experiment/*` pages.

**Design spec:** [docs/superpowers/specs/2026-05-25-cascais-bay-wind-prediction-design.md](../specs/2026-05-25-cascais-bay-wind-prediction-design.md)

**Rideability threshold:** `thresholdKnots` is a first-class model parameter (not hardcoded to 12). Add shared presets in `lib/forecast-experiment/rideabilityThresholds.js`:

| Preset | kt | User |
|--------|-----|------|
| `windfoil` | 10 | Windfoilers with huge sails |
| `wingfoil-light` | 12 | Light wingfoilers (default) |
| `wingfoil-heavy` | 15 | Heavy wingfoilers |

All prediction builders, backtests, miners, CLI flags, and UI toggles accept `thresholdKnots` or a preset slug. Store `thresholdKnots` on each `fx_predictions` row.

---

## File map

| File | Action | Role |
|------|--------|------|
| `lib/forecast-experiment/bayWindCoefficients.js` | Create | Bias + lag lookup tables and types |
| `lib/forecast-experiment/mineBayWindCoefficients.js` | Create | Compute tables from paired hourly obs/forecast |
| `lib/forecast-experiment/bayWindPrediction.js` | Create | `buildBayWindPredictionV2`, timeline + kick-in |
| `lib/forecast-experiment/predictionBacktest.js` | Create | v1/v2 day backtest + season summaries |
| `lib/forecast-experiment/prediction.js` | Modify | Export shared helpers; keep v1 |
| `lib/forecast-experiment/backtest.js` | Modify | Accept prediction builder fn param |
| `scripts/fx-mine-bay-coefficients.mjs` | Create | CLI: mine + write coefficients JSON |
| `scripts/fx-backtest-predictions.mjs` | Create | CLI: v1 vs v2 season report |
| `scripts/fx-generate-predictions.mjs` | Modify | Generate v2; optional nowcast |
| `data/forecast-experiment/bay-wind-v2-coefficients.json` | Create | Generated artifact (committed after first mine) |
| `tests/forecast-experiment/bayWindPrediction.test.mjs` | Create | Unit tests |
| `tests/forecast-experiment/predictionBacktest.test.mjs` | Create | Backtest comparison tests |
| `app/experiment/backtest/page.js` | Modify | Model version toggle v1/v2 |
| `app/experiment/page.js` | Modify | Show v2 prediction + model version |
| `package.json` | Modify | Add `fx:mine:bay`, `fx:backtest:predictions` scripts |

---

## Phase 1 — Coefficients & v2 core

### Task 1: Bias and lag coefficient structures

**Files:**
- Create: `lib/forecast-experiment/bayWindCoefficients.js`
- Create: `tests/forecast-experiment/bayWindCoefficients.test.mjs`

- [ ] **Step 1: Write failing tests for lookup helpers**

```javascript
import assert from "node:assert/strict";
import test from "node:test";
import {
  applyForecastBias,
  estimateBayLagMinutes,
  DEFAULT_BAY_WIND_COEFFICIENTS,
} from "../../lib/forecast-experiment/bayWindCoefficients.js";

test("applyForecastBias subtracts nortada afternoon bias", () => {
  const corrected = applyForecastBias({
    forecastEffectiveKnots: 15,
    hourLocal: 14,
    regime: "nortada",
    coefficients: DEFAULT_BAY_WIND_COEFFICIENTS,
  });
  assert.ok(corrected < 15);
});

test("estimateBayLagMinutes increases with stronger cabo wind", () => {
  const weak = estimateBayLagMinutes({ caboEffectiveKnots: 13, forecastPeakKnots: 14 });
  const strong = estimateBayLagMinutes({ caboEffectiveKnots: 22, forecastPeakKnots: 24 });
  assert.ok(strong <= weak);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/forecast-experiment/bayWindCoefficients.test.mjs`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement coefficient schema + defaults**

```javascript
// lib/forecast-experiment/bayWindCoefficients.js
export const DEFAULT_FORECAST_MODEL = "icon-eu-previous-day1";

export const DEFAULT_BAY_WIND_COEFFICIENTS = {
  version: 1,
  forecastModel: DEFAULT_FORECAST_MODEL,
  biasByRegimeHour: {
    nortada: { "6-11": 0, "12-17": -1, "18-21": -0.5 },
    "non-nortada": { "6-11": 0, "12-17": 0, "18-21": 0 },
  },
  lagMinutesByForecastPeak: [
    { minKnots: 0, maxKnots: 16, lagMinutes: 90 },
    { minKnots: 16, maxKnots: 20, lagMinutes: 75 },
    { minKnots: 20, maxKnots: 999, lagMinutes: 55 },
  ],
};

export function hourBucket(hourLocal) {
  if (hourLocal < 12) return "6-11";
  if (hourLocal < 18) return "12-17";
  return "18-21";
}

export function applyForecastBias({ forecastEffectiveKnots, hourLocal, regime, coefficients }) {
  const bucket = coefficients.biasByRegimeHour[regime]?.[hourBucket(hourLocal)] ?? 0;
  return Math.max(0, forecastEffectiveKnots + bucket);
}

export function estimateBayLagMinutes({ caboEffectiveKnots, forecastPeakKnots, coefficients = DEFAULT_BAY_WIND_COEFFICIENTS }) {
  const peak = Math.max(caboEffectiveKnots ?? 0, forecastPeakKnots ?? 0);
  const row = coefficients.lagMinutesByForecastPeak.find((r) => peak >= r.minKnots && peak < r.maxKnots);
  return row?.lagMinutes ?? 90;
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add lib/forecast-experiment/bayWindCoefficients.js tests/forecast-experiment/bayWindCoefficients.test.mjs
git commit -m "feat(fx): add bay wind bias and lag coefficient helpers"
```

---

### Task 2: Mine coefficients from historical pairs

**Files:**
- Create: `lib/forecast-experiment/mineBayWindCoefficients.js`
- Create: `scripts/fx-mine-bay-coefficients.mjs`
- Create: `data/forecast-experiment/.gitkeep` (if dir missing)

- [ ] **Step 1: Implement miner using existing pairing helpers**

Use `pairHourlyModelObs`, `WIND_REGIME_NORTADA`, `listModelsForSkillAnalysis`, and `ANALYSIS_SEASONS.average.ranges` from existing modules.

Logic:
- Load obs + forecast for each season range (reuse `fetchForecastExperimentWindow` from `runModelSkillAnalysis.js` — export it if not already exported).
- Filter forecast to `icon-eu-previous-day1`.
- For each paired hour with comparable wind: accumulate `(observed.effective − forecast.effective)` grouped by regime + hour bucket → median bias.
- For days with both Cabo and marina kick-in: accumulate `(marinaKickIn − caboKickIn)` grouped by forecast peak bucket → median lag.

- [ ] **Step 2: Add script**

```javascript
// scripts/fx-mine-bay-coefficients.mjs
// Writes data/forecast-experiment/bay-wind-v2-coefficients.json
// Logs summary counts per bucket
```

- [ ] **Step 3: Run miner against dev Convex**

Run: `npm run fx:mine:bay` (add script to package.json)  
Expected: JSON file written with non-zero sample counts for 2024+2025 summers

- [ ] **Step 4: Wire loader in bayWindCoefficients.js**

```javascript
export async function loadBayWindCoefficients() {
  // read JSON if present, else DEFAULT_BAY_WIND_COEFFICIENTS
}
```

- [ ] **Step 5: Commit generated JSON + miner**

---

### Task 3: `buildBayWindPredictionV2`

**Files:**
- Create: `lib/forecast-experiment/bayWindPrediction.js`
- Create: `tests/forecast-experiment/bayWindPrediction.test.mjs`

- [ ] **Step 1: Write failing tests**

Cases:
1. Strong nortada afternoon forecast → kick-in P50 in afternoon, confidence > 0.5
2. With Cabo already at 18 kt nortada → nowcast kick-in ≤ caboTime + lag
3. Weak non-nortada forecast → no kick-in (undefined P50)

- [ ] **Step 2: Implement v2**

```javascript
export function buildBayWindPredictionV2({
  targetLocationSlug,
  forecastDateLocal,
  generatedAt,
  points,                 // forecast points (ICON7 day1)
  caboRasoObservations,
  thresholdKnots = 12,
  coefficients,
  mode = "day-ahead",     // or "nowcast"
}) {
  // 1. Filter points to icon-eu-previous-day1, usable only
  // 2. Build hourly corrected timeline (bias + regime from obs direction if available)
  // 3. Logistic rideable probability (reuse logistic from prediction.js — export it)
  // 4. If nowcast + Cabo sustained: shift/boost timeline using estimateBayLagMinutes
  // 5. kickInP50/P75, confidence, summary, modelVersion: "bay-wind-v2"
}
```

- [ ] **Step 3: Run tests — PASS**

- [ ] **Step 4: Commit**

---

## Phase 2 — Backtest v1 vs v2

### Task 4: Prediction backtest wrapper

**Files:**
- Create: `lib/forecast-experiment/predictionBacktest.js`
- Modify: `lib/forecast-experiment/backtest.js`
- Create: `tests/forecast-experiment/predictionBacktest.test.mjs`

- [ ] **Step 1: Extend `buildDayBacktest` to accept `buildPrediction`**

```javascript
export function buildDayBacktest({
  // existing args...
  buildPrediction = buildBaselinePrediction,
  predictionOptions = {},
}) {
  // ...
  const prediction = eligiblePoints.length > 0
    ? buildPrediction({ ...predictionOptions, points: eligiblePoints, ... })
    : null;
}
```

- [ ] **Step 2: Add season runner**

```javascript
// predictionBacktest.js
export function backtestPredictionVersion({
  datesLocal,
  observations,
  caboRasoObservations,
  forecastPoints,
  buildPrediction,
  predictionOptions,
}) {
  return datesLocal.map((dateLocal) =>
    buildDayBacktest({ dateLocal, marinaObservations: observations, caboRasoObservations, forecastPoints, buildPrediction, ...predictionOptions })
  );
}

export function summarizePredictionBacktest(days) {
  return summarizeWeekBacktest(days); // plus false +/- counts from computeRideabilityAnomalies per version
}
```

- [ ] **Step 3: Test on fixture week — v2 kick-in closer to actual than v1 on synthetic nortada day**

- [ ] **Step 4: Commit**

---

### Task 5: CLI backtest report

**Files:**
- Create: `scripts/fx-backtest-predictions.mjs`
- Modify: `package.json`

- [ ] **Step 1: Implement CLI**

```bash
FX_BACKTEST_SEASON=2025 node scripts/fx-backtest-predictions.mjs
# prints v1 vs v2: MAE, withinHourCount, false+/-, daysComparable
```

Reuse `resolveAnalysisSeason`, Convex fetch helpers, both prediction builders.

- [ ] **Step 2: Run on Summer 2025 — capture baseline numbers in script comment or docs**

- [ ] **Step 3: Add npm script `fx:backtest:predictions`**

- [ ] **Step 4: Commit**

---

### Task 6: Backtest UI model toggle

**Files:**
- Modify: `app/experiment/backtest/page.js`

- [ ] **Step 1: Add v1 / v2 toggle (query param `?model=v2`)**

- [ ] **Step 2: Pass `buildBayWindPredictionV2` when v2 selected** (client-side: fetch precomputed from API or compute via new route)

**Note:** Backtest page currently runs client-side with Convex data. Prefer new API route `GET /api/experiment/prediction-backtest?season=2025&version=v2` mirroring wind-model-backtest pattern to avoid tab crashes.

- [ ] **Step 3: Create `app/api/experiment/prediction-backtest/route.js`** (thin wrapper around `predictionBacktest.js`)

- [ ] **Step 4: Browser test `/experiment/backtest?season=2025&model=v2`**

- [ ] **Step 5: Commit**

---

## Phase 3 — Live predictions

### Task 7: Wire v2 into prediction worker

**Files:**
- Modify: `scripts/fx-generate-predictions.mjs`
- Modify: `convex/forecastExperiment.ts` (optional: query recent ICON7 points only)

- [x] **Step 1: Load coefficients JSON in worker**

- [x] **Step 2: Generate v2 with `mode: "nowcast"` when Cabo obs in last 6h**

- [x] **Step 3: Save with `modelVersion: "bay-wind-v2"`** (keep v1 row optional via env `FX_PREDICTION_VERSION=v1`)

- [x] **Step 4: Update `/experiment` dashboard to show model version label**

- [x] **Step 5: Manual test — run worker, verify dashboard**

- [ ] **Step 6: Commit**

---

## Phase 4 — Scoring & feedback loop

### Task 8: Score stored predictions against labels

**Files:**
- Create: `scripts/fx-score-predictions.mjs`
- Modify: `convex/forecastExperiment.ts` (add `savePredictionScore` if needed)

- [x] **Step 1: For each day with `fx_daily_labels` + `fx_predictions`:**

Compute kick-in error minutes, rideable hit/miss, write to `fx_model_skill_scores` or extend schema with `fx_prediction_scores`.

- [x] **Step 2: Include user reports as weak labels** (report status `rideable`/`strong` → approximate kick-in from `observedAt`)

- [x] **Step 3: Add weekly cron on Render (document in plan comment; wire in render.yaml if present)**

- [ ] **Step 4: Commit**

---

## Phase 5 — Documentation & planning sync

### Task 9: Update docs

**Files:**
- Modify: `docs/forecast-experiment-model-analysis-learnings.md`
- Modify: `planning/PLANNING.md`

- [x] **Step 1: Add "Bay wind prediction v2" section with backtest baseline numbers**

- [x] **Step 2: Add PLANNING.md backlog item linking to this plan**

- [ ] **Step 3: Commit**

---

## Phase 6 — End-to-end ML (`bay-wind-v3-ml`)

**Prerequisite:** Phases 1–5 shipped; v2 backtest baseline recorded.

**Hardware:** Runs comfortably on M3 Max locally. Dataset is ~300 summer days × ~16 comparable hours (~5k rows) — not a GPU-scale problem. Training in Python (LightGBM / small MLP) completes in seconds–minutes; optional PyTorch MPS for a tiny sequence model.

**Scope:** Learn kick-in from **raw multi-model hourly inputs** (GFS, ICON13, ICON7 previous-day1), Cabo obs state, calendar features — not hand-tuned bias tables. Keep v2 as interpretable baseline; v3 must beat v2 on held-out days or document why not.

### Task 10: Training dataset export

**Files:**
- Create: `scripts/fx-export-ml-dataset.mjs` → `data/forecast-experiment/ml-training/*.jsonl`
- Create: `lib/forecast-experiment/mlDataset.js`

One row per **day × cutoff** (7am Lisbon) with hourly multi-model features, Cabo obs summary, `thresholdKnots`, label `actualKickInMinutes`.

Split: leave-one-summer-out CV (2024 / 2025 / 2026).

### Task 11: Local trainer (Python)

**Files:**
- Create: `ml/bay-wind/train.py` (LightGBM + optional small MLP)
- Create: `ml/bay-wind/requirements.txt`, `ml/bay-wind/README.md`

Export: `data/forecast-experiment/bay-wind-v3-model.onnx` (or JSON weights).

### Task 12: Node inference wrapper

**Files:**
- Create: `lib/forecast-experiment/bayWindPredictionMl.js` — `buildBayWindPredictionV3`
- Extend backtest CLI/UI: v1 | v2 | v3; per threshold preset

### Task 13: Backtest comparison

Document v1/v2/v3 MAE on Summer 2025 per threshold preset (10 / 12 / 15 kt).

---

## Acceptance criteria

- [x] `buildBayWindPredictionV2` returns kick-in P50/P75, confidence, summary, `modelVersion: "bay-wind-v2"`
- [x] Coefficients mined from Summer 2024+2025 with logged sample counts
- [x] `fx:backtest:predictions` shows v2 kick-in MAE ≤ v1 on Summer 2025 (or documents gap if not yet)
- [x] `/experiment/backtest` can compare v1 vs v2 for a season
- [x] `fx-generate-predictions` writes v2 rows; dashboard displays them
- [x] All `npm run test:fx` tests pass
- [x] No changes to production `/wing` or `forecast_slots` paths

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Sparse 2024 forecast overlap | Mine coefficients primarily from 2025; 2024 contributes where overlap exists |
| Marina gauge offline | Cabo lag + user reports for labels; document uncertainty in confidence |
| v2 not better than v1 initially | Ship anyway with comparison UI; iterate coefficients |
| API slow on backtest | Server-side route + cache (same pattern as model skill) |

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-25-cascais-bay-wind-prediction.md`.

**Two execution options:**

1. **Subagent-driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline execution** — implement phase-by-phase in one session with checkpoints

**Which approach do you want?**

Also review the design spec at `docs/superpowers/specs/2026-05-25-cascais-bay-wind-prediction-design.md` and flag any changes before we start coding.
