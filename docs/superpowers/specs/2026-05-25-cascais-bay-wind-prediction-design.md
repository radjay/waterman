# Cascais Bay Wind Prediction — Design Spec

**Date:** 2026-05-25  
**Status:** Draft (awaiting review)  
**Related:** [Forecast experiment plan](../plans/2026-05-24-wingfoil-forecast-experiment.md), [Model analysis learnings](../../forecast-experiment-model-analysis-learnings.md)

---

## Problem

Wingfoilers and windfoilers in Cascais Bay need to know **when wind will pick up** — today and over the next few days — so they can plan sessions. Numerical weather models forecast open-meteo grid points near the marina, but bay wind:

- Lags **Cabo Raso / Guincho** (nortada fills the bay later)
- Is **biased** vs NWP (e.g. ICON13 says 15 kt, marina sees ~14 kt)
- Depends on **direction regime** (nortada vs other)

We have years of marina observations (Windguru 2329), Cabo Raso live data, Open-Meteo hindcasts (2024+), user reports, and a **baseline v1** predictor. The experiment infrastructure exists; the product is a **better, backtested, explainable** bay kick-in model.

---

## Goals

| Goal | Success signal |
|------|----------------|
| Predict **kick-in time** for a given day | Median error ≤ 60 min vs marina sustained 12 kt crossing on nortada days (Summer 2024–2025 backtest) |
| Provide **confidence** | Calibrated score: high confidence days are right more often |
| Support **forecast mode** (morning plan) | Input: day-ahead NWP at ~7am Lisbon cutoff; output: P50/P75 kick-in |
| Support **nowcast mode** (same day) | Input: NWP + live Cabo Raso; update kick-in as wind develops |
| **Backtest** before trusting | v2 beats v1 on kick-in MAE and false +/- rideable days |
| **Human feedback** while marina gauge is dead | User reports + Cabo lag labels train/score predictions |

## Non-goals (v2)

- Replacing Waterman production forecast/scoring
- Polished public `/wing` product UI (experiment surface first)
- ML black-box before rule-based v2 is validated
- Direct GRIB ingestion
- Guincho as primary target (lead indicator only for future)

---

## Users & modes

**Primary user:** Local wing/wind foiler planning Cascais Bay.

| Mode | When | Inputs | Output |
|------|------|--------|--------|
| **Day-ahead** | ~7am Lisbon | Previous-day1 hindcast / live single-run for target day | Kick-in P50/P75, confidence, short summary |
| **Nowcast** | Same day, repeating | Above + Cabo Raso obs since midnight | Updated kick-in, higher confidence if Cabo already strong |
| **Multi-day** | Anytime | Forecasts for today + next 3 days | Timeline per day (stretch; v2.1) |

---

## Ground truth & labels

Reuse existing experiment definitions (`lib/forecast-experiment/labels.js`, `backtest.js`):

- **Rideable threshold:** 12 kt effective \((speed + gust) / 2\)
- **Sustained crossing:** two consecutive readings ≥ threshold within 45 minutes
- **Actual kick-in:** first sustained crossing at marina (preferred) or user report / Cabo lag inference when marina obs missing
- **Predicted kick-in (v1 today):** first hour with rideable probability ≥ 0.5 from ensemble timeline

Backtest metric: `errorMinutes = predictedKickIn − actualKickIn` (same as `/experiment/backtest`).

---

## Approaches considered

### A. Rule-based v2 (recommended for first ship)

Learn **inspectable tables** from historical data:

1. **Forecast model selection** — use ICON7 `previous-day1` (best Cascais skill; see model analysis)
2. **Bias correction** — per regime (nortada / non-nortada), hour bucket, adjust forecast effective wind toward marina obs
3. **Cabo→bay lag** — when Cabo sustains 12+ kt, infer bay kick-in as `caboKickIn + lag(forecastStrength)`; replace fixed 45/60/90 min tiers
4. **Kick-in from corrected timeline** — logistic rideable probability on bias-corrected hourly winds (same shape as v1, better inputs)

**Pros:** Explainable, testable, matches foiler mental models, fast to iterate.  
**Cons:** Tables need periodic refresh; won’t capture rare synoptic cases.

### B. Regularized regression on engineered features

Same features as A (forecast hour, regime, Cabo state, season), fit linear/logistic coefficients.

**Pros:** Slightly richer interactions.  
**Cons:** Harder to explain; not needed until A plateaus.

### C. End-to-end ML

Train on raw multi-model hourly series.

**Pros:** Maximum flexibility.  
**Cons:** Needs more data hygiene, opaque, overkill for v2.

**Decision:** Ship **A** as `bay-wind-v2`. Keep v1 for comparison. **Phase 6** adds **C** as `bay-wind-v3-ml` after v2 backtest baseline — trained locally on M3 Max from exported multi-model hourly series.

---

## Architecture

```
Open-Meteo (ICON7 day1) ──┐
Cabo Raso obs ────────────┼──► buildBayWindPredictionV2 ──► fx_predictions
Marina obs / reports ─────┘         ▲
                                    │
                    coefficients ◄──┘ (mined offline from history)
                                    │
                    buildDayBacktest / summarizeWeekBacktest (v1 vs v2)
```

### New / modified modules

| Module | Responsibility |
|--------|----------------|
| `lib/forecast-experiment/bayWindCoefficients.js` | Static or generated bias + lag tables |
| `lib/forecast-experiment/mineBayWindCoefficients.js` | Offline: compute tables from obs + forecast in Convex or local JSON |
| `lib/forecast-experiment/bayWindPrediction.js` | `buildBayWindPredictionV2`, shared timeline helpers |
| `lib/forecast-experiment/predictionBacktest.js` | Wrap `buildDayBacktest` for v1/v2, weekly summaries |
| `scripts/fx-mine-bay-coefficients.mjs` | Regenerate coefficients from historical window |
| `scripts/fx-backtest-predictions.mjs` | Batch backtest v1 vs v2 → stdout / JSON |
| `scripts/fx-generate-predictions.mjs` | Switch to v2 + nowcast flag |
| `/experiment/backtest` or new `/experiment/prediction-backtest` | UI for prediction model comparison |

### Data dependencies

| Data | Range | Notes |
|------|-------|-------|
| Marina obs | ~2020+ | Primary labels; live fetch disabled |
| Open-Meteo Previous Runs | Feb 2024+ | GFS, ICON13, ICON7; ECMWF not usable at Cascais |
| Cabo Raso | Live + history | Lead indicator for nowcast |
| User reports | Ongoing | Weak labels via `/experiment` |

Coefficient mining window: **Summer 2024 + Summer 2025** (May–Sep), same seasons as model analysis pills.

---

## Prediction API shape (unchanged storage)

Keep `fx_predictions` schema; bump `modelVersion`:

```javascript
{
  modelVersion: "bay-wind-v2",
  thresholdKnots: 12,
  kickInP50At,
  kickInP75At,
  confidence,          // 0–1
  summary,             // human-readable
  probabilityTimeline, // hourly rideable prob + expected kt
  inputs: {
    forecastModel: "icon-eu-previous-day1",
    mode: "day-ahead" | "nowcast",
    caboRasoObservationAt,
    caboLagMinutes,
    biasRegime,
  },
}
```

---

## Confidence model (v2)

Combine:

1. **Forecast spread** — low spread across usable hours → higher confidence (reuse v1 idea)
2. **Regime clarity** — nortada with strong Cabo signal → higher
3. **Historical reliability bucket** — e.g. afternoon nortada days where v2 backtest MAE < 45 min → boost

Start simple: `confidence = f(spread, caboAligned, backtestBucket)` with caps [0.25, 0.92].

---

## Backtest & scoring

**Offline (batch):**

- For each day in season ranges, run v1 and v2 at 7am cutoff
- Metrics: kick-in MAE, within ±60 min %, false positive/negative rideable days (already implemented for forecasts; reuse for predictions)

**Online (ongoing):**

- After day ends, compare stored prediction to `fx_daily_labels`
- Write rows to `fx_model_skill_scores` or new `fx_prediction_scores` with `modelVersion`
- User reports weight lower than marina obs

---

## Error handling

| Case | Behavior |
|------|----------|
| No forecast data for day | No prediction row; UI shows “insufficient forecast data” |
| No marina obs for backtest day | Use Cabo lag label if available; else skip day in MAE |
| Cabo offline in nowcast | Fall back to day-ahead-only; reduce confidence |
| Non-nortada day | Still predict; lower default confidence |

---

## Testing strategy

- **Unit:** coefficient lookup, bias apply, lag inference, kick-in from synthetic hourly series
- **Integration:** `buildDayBacktest` with v2 on fixed fixture days (mirror existing backtest tests)
- **Regression:** v2 backtest script on Summer 2025 — assert MAE ≤ v1 + document baseline numbers in test comment
- **Manual:** `/experiment` dashboard shows v2 prediction; `/experiment/backtest` week view

---

## Phased delivery

| Phase | Deliverable |
|-------|-------------|
| **1** | Coefficient mining + `bay-wind-v2` core |
| **2** | Backtest CLI + v1/v2 comparison UI |
| **3** | Live worker (day-ahead + nowcast) |
| **4** | Prediction scoring + user feedback loop |
| **5** | Foiler-facing UI (future; out of implementation plan v1) |

---

## Open questions

1. **Threshold:** Keep 12 kt rideable or expose 15 kt “good nortada” as secondary line? → Start 12 kt; add 15 kt in summary text only.
2. **Primary forecast model:** ICON7 only or ICON7 + GFS blend? → ICON7 day1 primary; GFS as spread input only.
3. **Marina station return:** When 2329 live again, auto-weight marina obs higher in nowcast. → Design hooks in `inputs`; no blocker.

---

## Approval

Review this spec before implementation. Next step: [implementation plan](../plans/2026-05-25-cascais-bay-wind-prediction.md).
