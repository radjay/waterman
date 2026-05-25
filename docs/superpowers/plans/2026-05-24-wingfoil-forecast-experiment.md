# Wingfoil Forecast Experiment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated Cascais wingfoil forecast experiment that stores model-run forecasts, live observations, user reports, derived labels, skill scores, and experimental probabilistic predictions in separate Convex tables without changing the production forecast/scoring path.

**Architecture:** Add a `fx_` forecast-experiment namespace: new Convex tables and functions, source-specific Node workers/scripts, and a small debug surface. Keep `forecast_slots`, `condition_scores`, current Windy scraping, and production dashboards unchanged except for optional read-only links to experimental output after validation. Use Render cron/background workers for ingestion and Convex for storage/querying.

**Tech Stack:** Next.js 16, React 19, Convex, Node 18+ scripts, Render cron/background workers, built-in `node:test`, Open-Meteo JSON APIs, IPMA open-data JSON APIs, existing Windguru station JSON pattern, optional future Python/GRIB worker only if direct ECMWF/GFS GRIB becomes necessary.

---

## Implementation Decisions (2026-05-25)

These override earlier draft assumptions:

- **Standalone UI:** All experiment UX lives at `/experiment` and `/experiment/admin`. Do not embed reporting or data views in production forecast/webcam pages.
- **Windguru stations:** `3294` = Cabo Raso (live + backfill, `cabo-raso`). `2329` = Marina/CNC bay (`cascais-bay`); live polling disabled while anemometer is dead; same ID when hardware is replaced. Historical backfill still uses 2329.
- **Historical backfill:** Use public `https://www.windguru.cz/int/iapi.php?q=station_data` (no station password). Chunk by week, `avg_minutes=10`, filter negative sentinel values. Script: `scripts/fx-backfill-windguru-history.mjs`. CSV/`wgsapi.php` optional only.
- **Rideability metric:** `effectiveWind = (windSpeedKnots + windGustKnots) / 2` (fallback to whichever is present). Threshold **12 kt**. Sustained crossing = two consecutive readings ≥ 12 within 45 minutes.
- **Bay labels without marina sensor:** User reports + lag inference from Cabo Raso 3294 sustained crossing + `bayLagMinutesFromCaboRaso`.
- **Open-Meteo backfill:** May–Sept nortada windows (e.g. `2025-05-01` → `2025-09-30`) via Previous Runs API.

## Scope And Boundaries

This is an experiment, not a rewrite of Waterman's main forecast engine.

In scope:
- Store forecast data by provider, model, run time, valid time, lead time, and target location.
- Store measured observations from Cabo Raso/Windguru, IPMA stations, the future Marina de Cascais station, and structured user reports.
- Derive daily rideability labels and kick-in times for Cascais bay and Cabo Raso/Guincho separately.
- Produce model skill metrics and a first probabilistic "bay kick-in" forecast.
- Add Render services/cron jobs that can run independently.
- Add a small admin/debug route or script outputs for inspection.

Out of scope for this implementation:
- Replacing current Windy.app scraping.
- Changing user-facing score cards or LLM scoring semantics.
- Direct GRIB parsing for ECMWF/GFS unless Open-Meteo proves insufficient.
- A polished public UI for the forecast experiment.

## Source Decisions

Use these sources for V1:

- Open-Meteo Single Runs API for exact model-run storage. Official docs state it preserves individual runs by UTC initialisation time through `run`, unlike the live forecast API that stitches latest runs together.
- Open-Meteo Previous Runs API for quick backfill and fixed-lead skill analysis. It exposes day-offset forecasts such as current run, previous day, and up to day 7.
- IPMA open data for Portuguese hourly station observations and station metadata. IPMA exposes hourly station observations at `open-data/observation/meteorology/stations/observations.json` and station metadata at `open-data/observation/meteorology/stations/stations.json`.
- Windguru public `iapi.php` for live (`station_data_current`) and historical (`station_data`) observations. Station **3294** (Cabo Raso) live; **2329** (Marina/CNC) historical until sensor failure. No `wgsapi.php` password required for backfill.
- Direct ECMWF Open Data and NOAA NOMADS stay as Phase 2 options. ECMWF Open Data is GRIB2 and rolling for the most recent runs; NOAA NOMADS can subset GRIB2 files but asks automated clients to wait between looped fetches. Both add parsing/ops complexity that is not needed for the isolated V1.

## Forecast Targets

Create these experimental locations, independent from `spots`:

```javascript
export const FX_LOCATIONS = [
  {
    slug: "cascais-bay",
    name: "Cascais Bay",
    role: "target",
    latitude: 38.6919,
    longitude: -9.4203,
    timezone: "Europe/Lisbon",
    defaultRideableWindKnots: 15,
  },
  {
    slug: "cabo-raso",
    name: "Cabo Raso",
    role: "lead-indicator",
    latitude: 38.7089,
    longitude: -9.4859,
    timezone: "Europe/Lisbon",
    defaultRideableWindKnots: 15,
  },
  {
    slug: "guincho",
    name: "Praia do Guincho",
    role: "lead-indicator",
    latitude: 38.7333,
    longitude: -9.4733,
    timezone: "Europe/Lisbon",
    defaultRideableWindKnots: 15,
  },
];
```

`cabo-raso` and `guincho` are lead indicators. `cascais-bay` is the primary prediction target.

## File Structure

Create or modify these files:

- Modify: `package.json`
  - Add `test:fx`, `fx:fetch:openmeteo`, `fx:fetch:observations`, `fx:build-labels`, `fx:score-models`, and `fx:predict` scripts.
- Modify: `convex/schema.ts`
  - Add all `fx_` tables only.
- Create: `convex/forecastExperiment.ts`
  - Convex mutations/queries for experiment storage and debug reads.
- Create: `lib/forecast-experiment/locations.js`
  - Location, model, and observation-source registry.
- Create: `lib/forecast-experiment/units.js`
  - Wind and direction conversion helpers.
- Create: `lib/forecast-experiment/time.js`
  - UTC/local date helpers, run-cycle helpers, lead-hour helpers.
- Create: `lib/forecast-experiment/openMeteoClient.js`
  - Open-Meteo Single Runs and Previous Runs client.
- Create: `lib/forecast-experiment/ipmaClient.js`
  - IPMA station metadata and hourly observation client.
- Create: `lib/forecast-experiment/windguruClient.js`
  - Shared Windguru station client extracted from the existing route logic.
- Create: `lib/forecast-experiment/labels.js`
  - Observation/report to daily label derivation.
- Create: `lib/forecast-experiment/skill.js`
  - Model error, onset error, and probability scoring helpers.
- Create: `lib/forecast-experiment/prediction.js`
  - Transparent baseline ensemble and bay-lag nowcast.
- Create: `scripts/fx-fetch-openmeteo-runs.mjs`
  - Forecast model-run worker.
- Create: `scripts/fx-fetch-observations.mjs`
  - Observation worker.
- Create: `scripts/fx-build-labels.mjs`
  - Label builder worker.
- Create: `scripts/fx-score-models.mjs`
  - Skill scoring worker.
- Create: `scripts/fx-generate-predictions.mjs`
  - Experimental prediction worker.
- Create: `scripts/fx-backfill-openmeteo-previous-runs.mjs`
  - Optional one-time historical backfill.
- Modify: `render.yaml`
  - Add isolated forecast experiment jobs.
- Create: `tests/forecast-experiment/units.test.mjs`
- Create: `tests/forecast-experiment/time.test.mjs`
- Create: `tests/forecast-experiment/labels.test.mjs`
- Create: `tests/forecast-experiment/skill.test.mjs`
- Create: `tests/forecast-experiment/prediction.test.mjs`
- Optional create: `app/experiment/page.js`
  - Standalone experiment portal: live data, reporting, prediction summary.
- Optional create: `app/experiment/admin/page.js`
  - Read-only debug JSON (worker runs, skill scores).
- Create: `scripts/fx-backfill-windguru-history.mjs`
  - Historical obs backfill via public `iapi.php?q=station_data`.

## Parallel Worker Ownership

These tasks can run in parallel after Task 2 lands:

- Worker A owns Convex storage: `convex/schema.ts`, `convex/forecastExperiment.ts`.
- Worker B owns forecast ingestion: `lib/forecast-experiment/openMeteoClient.js`, `scripts/fx-fetch-openmeteo-runs.mjs`, `scripts/fx-backfill-openmeteo-previous-runs.mjs`.
- Worker C owns observations: `lib/forecast-experiment/ipmaClient.js`, `lib/forecast-experiment/windguruClient.js`, `scripts/fx-fetch-observations.mjs`.
- Worker D owns labels, skill, and predictions: `lib/forecast-experiment/labels.js`, `skill.js`, `prediction.js`, `scripts/fx-build-labels.mjs`, `scripts/fx-score-models.mjs`, `scripts/fx-generate-predictions.mjs`.
- Worker E owns Render wiring and debug read surface: `render.yaml`, optional `app/admin/forecast-experiment/page.js`.

Do not let multiple workers modify the same file at once. Coordinate merges around `package.json`, `convex/schema.ts`, and `render.yaml`.

---

### Task 1: Test Harness And Experiment Constants

**Files:**
- Modify: `package.json`
- Create: `lib/forecast-experiment/locations.js`
- Create: `lib/forecast-experiment/units.js`
- Create: `lib/forecast-experiment/time.js`
- Create: `tests/forecast-experiment/units.test.mjs`
- Create: `tests/forecast-experiment/time.test.mjs`

- [ ] **Step 1: Add forecast experiment scripts to `package.json`**

Add these scripts without removing existing scripts:

```json
{
  "test:fx": "node --test tests/forecast-experiment/*.test.mjs",
  "fx:fetch:openmeteo": "node scripts/fx-fetch-openmeteo-runs.mjs",
  "fx:fetch:observations": "node scripts/fx-fetch-observations.mjs",
  "fx:build-labels": "node scripts/fx-build-labels.mjs",
  "fx:score-models": "node scripts/fx-score-models.mjs",
  "fx:predict": "node scripts/fx-generate-predictions.mjs"
}
```

- [ ] **Step 2: Write failing tests for unit helpers**

Create `tests/forecast-experiment/units.test.mjs`:

```javascript
import assert from "node:assert/strict";
import test from "node:test";
import {
  kmhToKnots,
  msToKnots,
  normalizeDegrees,
  degreesToCompass8,
  circularDirectionError,
} from "../../lib/forecast-experiment/units.js";

test("converts wind speeds to knots", () => {
  assert.equal(kmhToKnots(18.52), 10);
  assert.equal(msToKnots(5.144), 10);
});

test("normalizes degrees and labels compass directions", () => {
  assert.equal(normalizeDegrees(-10), 350);
  assert.equal(normalizeDegrees(370), 10);
  assert.equal(degreesToCompass8(350), "N");
  assert.equal(degreesToCompass8(315), "NW");
});

test("computes circular direction error", () => {
  assert.equal(circularDirectionError(350, 10), 20);
  assert.equal(circularDirectionError(90, 270), 180);
});
```

Create `tests/forecast-experiment/time.test.mjs`:

```javascript
import assert from "node:assert/strict";
import test from "node:test";
import {
  isoRun,
  leadHours,
  localDateKey,
  candidateGlobalRuns,
} from "../../lib/forecast-experiment/time.js";

test("formats UTC model runs without seconds", () => {
  assert.equal(isoRun(Date.UTC(2026, 4, 24, 0, 15)), "2026-05-24T00:00");
});

test("computes lead hours from run and valid time", () => {
  assert.equal(
    leadHours(Date.UTC(2026, 4, 24, 0), Date.UTC(2026, 4, 24, 18)),
    18
  );
});

test("computes local date key for Lisbon", () => {
  assert.equal(localDateKey(Date.UTC(2026, 6, 1, 22, 30), "Europe/Lisbon"), "2026-07-01");
});

test("returns recent global model cycles", () => {
  assert.deepEqual(
    candidateGlobalRuns(Date.UTC(2026, 4, 24, 13, 5)).slice(0, 3),
    ["2026-05-24T06:00", "2026-05-24T00:00", "2026-05-23T18:00"]
  );
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm run test:fx
```

Expected: FAIL because `lib/forecast-experiment/*.js` files do not exist yet.

- [ ] **Step 4: Implement constants and helpers**

Create `lib/forecast-experiment/locations.js`:

```javascript
export const FX_LOCATIONS = [
  {
    slug: "cascais-bay",
    name: "Cascais Bay",
    role: "target",
    latitude: 38.6919,
    longitude: -9.4203,
    timezone: "Europe/Lisbon",
    defaultRideableWindKnots: 15,
  },
  {
    slug: "cabo-raso",
    name: "Cabo Raso",
    role: "lead-indicator",
    latitude: 38.7089,
    longitude: -9.4859,
    timezone: "Europe/Lisbon",
    defaultRideableWindKnots: 15,
  },
  {
    slug: "guincho",
    name: "Praia do Guincho",
    role: "lead-indicator",
    latitude: 38.7333,
    longitude: -9.4733,
    timezone: "Europe/Lisbon",
    defaultRideableWindKnots: 15,
  },
];

export const FX_MODELS = [
  {
    provider: "open-meteo",
    model: "ecmwf-ifs-hres-9km",
    openMeteoModel: "ecmwf_ifs",
    runHoursUtc: [0, 6, 12, 18],
    expectedAvailabilityLagHours: 6,
    enabled: true,
  },
  {
    provider: "open-meteo",
    model: "gfs-global",
    openMeteoModel: "gfs_global",
    runHoursUtc: [0, 6, 12, 18],
    expectedAvailabilityLagHours: 6,
    enabled: true,
  },
  {
    provider: "open-meteo",
    model: "icon-global",
    openMeteoModel: "icon_global",
    runHoursUtc: [0, 6, 12, 18],
    expectedAvailabilityLagHours: 6,
    enabled: true,
  },
  {
    provider: "open-meteo",
    model: "icon-eu",
    openMeteoModel: "icon_eu",
    runHoursUtc: [0, 3, 6, 9, 12, 15, 18, 21],
    expectedAvailabilityLagHours: 3,
    enabled: true,
  },
  {
    provider: "open-meteo",
    model: "meteofrance-arpege-europe",
    openMeteoModel: "meteofrance_arpege_europe",
    runHoursUtc: [0, 6, 12, 18],
    expectedAvailabilityLagHours: 4,
    enabled: true,
  },
];

export const FX_OBSERVATION_SOURCES = [
  {
    slug: "windguru-3294",
    provider: "windguru",
    providerStationId: "3294",
    locationSlug: "cabo-raso",
    name: "Windguru Cabo Raso 3294",
    cadenceMinutes: 5,
    enabled: true,
  },
  {
    slug: "windguru-2329",
    provider: "windguru",
    providerStationId: "2329",
    locationSlug: "cascais-bay",
    name: "Windguru Marina CNC 2329",
    cadenceMinutes: 5,
    enabled: false,
    metadata: { status: "sensor_offline", note: "Replace hardware; same Windguru ID expected" },
  },
  {
    slug: "ipma-surface",
    provider: "ipma",
    providerStationId: "all",
    locationSlug: "cascais-region",
    name: "IPMA Surface Station Feed",
    cadenceMinutes: 60,
    enabled: true,
  },
  {
    slug: "marina-cascais-future",
    provider: "custom",
    providerStationId: "marina-cascais-replacement",
    locationSlug: "cascais-bay",
    name: "Future Marina de Cascais Station",
    cadenceMinutes: 5,
    enabled: false,
  },
];
```

Create `lib/forecast-experiment/units.js`:

```javascript
export function kmhToKnots(value) {
  return round1(value / 1.852);
}

export function msToKnots(value) {
  return round1(value * 1.94384);
}

export function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

export function normalizeDegrees(value) {
  const degrees = Number(value);
  if (!Number.isFinite(degrees)) return null;
  return ((degrees % 360) + 360) % 360;
}

export function degreesToCompass8(value) {
  const degrees = normalizeDegrees(value);
  if (degrees === null) return null;
  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return labels[Math.round(degrees / 45) % 8];
}

export function circularDirectionError(actual, predicted) {
  const a = normalizeDegrees(actual);
  const p = normalizeDegrees(predicted);
  if (a === null || p === null) return null;
  const diff = Math.abs(a - p);
  return Math.min(diff, 360 - diff);
}
```

Create `lib/forecast-experiment/time.js`:

```javascript
export function isoRun(ms) {
  const date = new Date(ms);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
}

export function leadHours(runStartedAt, validTime) {
  return Math.round((validTime - runStartedAt) / 3_600_000);
}

export function localDateKey(ms, timezone = "Europe/Lisbon") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function candidateGlobalRuns(nowMs = Date.now()) {
  const date = new Date(nowMs);
  date.setUTCMinutes(0, 0, 0);
  const currentHour = date.getUTCHours();
  const runHour = [18, 12, 6, 0].find((hour) => currentHour >= hour) ?? 18;
  if (runHour === 18 && currentHour < 0) date.setUTCDate(date.getUTCDate() - 1);
  date.setUTCHours(runHour);

  const runs = [];
  for (let i = 0; i < 12; i += 1) {
    runs.push(isoRun(date.getTime() - i * 6 * 3_600_000));
  }
  return runs;
}
```

- [ ] **Step 5: Run tests to verify foundation passes**

Run:

```bash
npm run test:fx
```

Expected: PASS for `units.test.mjs` and `time.test.mjs`.

- [ ] **Step 6: Commit**

```bash
git add package.json lib/forecast-experiment/locations.js lib/forecast-experiment/units.js lib/forecast-experiment/time.js tests/forecast-experiment/units.test.mjs tests/forecast-experiment/time.test.mjs
git commit -m "feat: add forecast experiment foundation"
```

---

### Task 2: Isolated Convex Schema

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add `fx_` tables only**

Append these table definitions inside `defineSchema({ ... })`, after the current production tables:

```typescript
    fx_locations: defineTable({
        slug: v.string(),
        name: v.string(),
        role: v.string(), // "target" | "lead-indicator" | "context"
        latitude: v.number(),
        longitude: v.number(),
        timezone: v.string(),
        defaultRideableWindKnots: v.number(),
        enabled: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_slug", ["slug"])
        .index("by_enabled", ["enabled"]),

    fx_observation_sources: defineTable({
        slug: v.string(),
        provider: v.string(), // "windguru" | "ipma" | "custom"
        providerStationId: v.string(),
        locationSlug: v.string(),
        name: v.string(),
        cadenceMinutes: v.number(),
        enabled: v.boolean(),
        metadata: v.optional(v.any()),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_slug", ["slug"])
        .index("by_provider_station", ["provider", "providerStationId"])
        .index("by_enabled", ["enabled"]),

    fx_worker_runs: defineTable({
        workerName: v.string(),
        startedAt: v.number(),
        finishedAt: v.optional(v.number()),
        status: v.string(), // "running" | "success" | "failed" | "partial"
        attemptedCount: v.optional(v.number()),
        insertedCount: v.optional(v.number()),
        skippedCount: v.optional(v.number()),
        errorMessage: v.optional(v.string()),
        metadata: v.optional(v.any()),
    })
        .index("by_worker_started", ["workerName", "startedAt"])
        .index("by_status_started", ["status", "startedAt"]),

    fx_forecast_runs: defineTable({
        provider: v.string(),
        model: v.string(),
        providerModel: v.string(),
        runStartedAt: v.number(),
        runAvailableAt: v.optional(v.number()),
        fetchedAt: v.number(),
        status: v.string(), // "success" | "failed" | "partial"
        sourceUrl: v.optional(v.string()),
        responseHash: v.optional(v.string()),
        forecastDays: v.number(),
        variables: v.array(v.string()),
        errorMessage: v.optional(v.string()),
    })
        .index("by_provider_model_run", ["provider", "model", "runStartedAt"])
        .index("by_run_started", ["runStartedAt"])
        .index("by_status_fetched", ["status", "fetchedAt"]),

    fx_forecast_points: defineTable({
        forecastRunId: v.id("fx_forecast_runs"),
        provider: v.string(),
        model: v.string(),
        locationSlug: v.string(),
        runStartedAt: v.number(),
        validTime: v.number(),
        leadHours: v.number(),
        intervalMinutes: v.number(),
        windSpeedKnots: v.optional(v.number()),
        windGustKnots: v.optional(v.number()),
        windDirectionDeg: v.optional(v.number()),
        temperatureC: v.optional(v.number()),
        cloudCoverPct: v.optional(v.number()),
        pressureMslHpa: v.optional(v.number()),
        shortwaveRadiation: v.optional(v.number()),
        boundaryLayerHeightM: v.optional(v.number()),
        raw: v.optional(v.any()),
        createdAt: v.number(),
    })
        .index("by_run", ["forecastRunId"])
        .index("by_location_valid", ["locationSlug", "validTime"])
        .index("by_location_model_valid", ["locationSlug", "model", "validTime"])
        .index("by_provider_model_run_valid", ["provider", "model", "runStartedAt", "validTime"]),

    fx_observations: defineTable({
        sourceSlug: v.string(),
        provider: v.string(),
        providerStationId: v.string(),
        locationSlug: v.string(),
        observedAt: v.number(),
        receivedAt: v.number(),
        windSpeedKnots: v.optional(v.number()),
        windGustKnots: v.optional(v.number()),
        windDirectionDeg: v.optional(v.number()),
        temperatureC: v.optional(v.number()),
        pressureMslHpa: v.optional(v.number()),
        humidityPct: v.optional(v.number()),
        radiationKjM2: v.optional(v.number()),
        quality: v.string(), // "ok" | "stale" | "nodata" | "suspect"
        raw: v.optional(v.any()),
        createdAt: v.number(),
    })
        .index("by_source_observed", ["sourceSlug", "observedAt"])
        .index("by_location_observed", ["locationSlug", "observedAt"])
        .index("by_provider_station_observed", ["provider", "providerStationId", "observedAt"]),

    fx_user_reports: defineTable({
        userId: v.union(v.id("users"), v.null()),
        locationSlug: v.string(),
        sport: v.string(), // "wingfoil"
        reportedAt: v.number(),
        observedAt: v.number(),
        status: v.string(), // "not_in" | "marginal" | "rideable" | "strong"
        windSpeedEstimateKnots: v.optional(v.number()),
        windDirectionEstimateDeg: v.optional(v.number()),
        notes: v.optional(v.string()),
        confidence: v.number(), // 0-1, user reports default to 0.6 unless trusted
        createdAt: v.number(),
    })
        .index("by_location_observed", ["locationSlug", "observedAt"])
        .index("by_user_observed", ["userId", "observedAt"]),

    fx_daily_labels: defineTable({
        locationSlug: v.string(),
        sport: v.string(),
        dateLocal: v.string(),
        thresholdKnots: v.number(),
        actualKickInAt: v.optional(v.number()),
        actualKickOutAt: v.optional(v.number()),
        peakStartAt: v.optional(v.number()),
        peakEndAt: v.optional(v.number()),
        maxWindKnots: v.optional(v.number()),
        maxGustKnots: v.optional(v.number()),
        sourceConfidence: v.number(), // 0-1
        labelStatus: v.string(), // "observed" | "report-assisted" | "insufficient-data" | "no-kick"
        sourceSummary: v.string(),
        computedAt: v.number(),
    })
        .index("by_location_date", ["locationSlug", "dateLocal"])
        .index("by_status_date", ["labelStatus", "dateLocal"]),

    fx_model_skill_scores: defineTable({
        provider: v.string(),
        model: v.string(),
        locationSlug: v.string(),
        sport: v.string(),
        season: v.string(), // "summer" | "shoulder" | "winter" | "all"
        regime: v.string(), // "nortada" | "thermal" | "southerly" | "mixed" | "all"
        leadBucketHours: v.string(), // "0-6" | "6-12" | "12-24" | "24-48" | "48-72"
        sampleCount: v.number(),
        windSpeedMae: v.optional(v.number()),
        windSpeedRmse: v.optional(v.number()),
        directionMae: v.optional(v.number()),
        onsetMaeMinutes: v.optional(v.number()),
        rideableBrier: v.optional(v.number()),
        updatedAt: v.number(),
    })
        .index("by_model_location", ["provider", "model", "locationSlug"])
        .index("by_location_regime", ["locationSlug", "regime"]),

    fx_predictions: defineTable({
        targetLocationSlug: v.string(),
        sport: v.string(),
        generatedAt: v.number(),
        forecastDateLocal: v.string(),
        modelVersion: v.string(),
        thresholdKnots: v.number(),
        kickInP50At: v.optional(v.number()),
        kickInP75At: v.optional(v.number()),
        peakStartAt: v.optional(v.number()),
        peakEndAt: v.optional(v.number()),
        probabilityTimeline: v.array(v.object({
            time: v.number(),
            rideableProbability: v.number(),
            expectedWindKnots: v.optional(v.number()),
            p10WindKnots: v.optional(v.number()),
            p90WindKnots: v.optional(v.number()),
        })),
        confidence: v.number(),
        summary: v.string(),
        inputs: v.any(),
        createdAt: v.number(),
    })
        .index("by_target_date", ["targetLocationSlug", "forecastDateLocal"])
        .index("by_generated", ["generatedAt"]),
```

- [ ] **Step 2: Run Convex code generation/build validation**

Run:

```bash
npx convex codegen
npm run build
```

Expected: Convex schema compiles, generated API types update, Next build completes or fails only on pre-existing unrelated issues.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts convex/_generated
git commit -m "feat: add forecast experiment schema"
```

---

### Task 3: Convex Experiment Storage API

**Files:**
- Create: `convex/forecastExperiment.ts`

- [ ] **Step 1: Create Convex mutations and queries**

Create `convex/forecastExperiment.ts` with these exports:

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const upsertLocation = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    role: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    timezone: v.string(),
    defaultRideableWindKnots: v.number(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("fx_locations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("fx_locations", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const upsertObservationSource = mutation({
  args: {
    slug: v.string(),
    provider: v.string(),
    providerStationId: v.string(),
    locationSlug: v.string(),
    name: v.string(),
    cadenceMinutes: v.number(),
    enabled: v.boolean(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("fx_observation_sources")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("fx_observation_sources", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const startWorkerRun = mutation({
  args: {
    workerName: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("fx_worker_runs", {
      workerName: args.workerName,
      startedAt: Date.now(),
      status: "running",
      metadata: args.metadata,
    });
  },
});

export const finishWorkerRun = mutation({
  args: {
    workerRunId: v.id("fx_worker_runs"),
    status: v.string(),
    attemptedCount: v.optional(v.number()),
    insertedCount: v.optional(v.number()),
    skippedCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { workerRunId, ...updates } = args;
    await ctx.db.patch(workerRunId, {
      ...updates,
      finishedAt: Date.now(),
    });
  },
});

export const findForecastRun = query({
  args: {
    provider: v.string(),
    model: v.string(),
    runStartedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fx_forecast_runs")
      .withIndex("by_provider_model_run", (q) =>
        q.eq("provider", args.provider).eq("model", args.model).eq("runStartedAt", args.runStartedAt)
      )
      .first();
  },
});

export const saveForecastRunWithPoints = mutation({
  args: {
    run: v.object({
      provider: v.string(),
      model: v.string(),
      providerModel: v.string(),
      runStartedAt: v.number(),
      runAvailableAt: v.optional(v.number()),
      fetchedAt: v.number(),
      status: v.string(),
      sourceUrl: v.optional(v.string()),
      responseHash: v.optional(v.string()),
      forecastDays: v.number(),
      variables: v.array(v.string()),
      errorMessage: v.optional(v.string()),
    }),
    points: v.array(v.object({
      locationSlug: v.string(),
      validTime: v.number(),
      leadHours: v.number(),
      intervalMinutes: v.number(),
      windSpeedKnots: v.optional(v.number()),
      windGustKnots: v.optional(v.number()),
      windDirectionDeg: v.optional(v.number()),
      temperatureC: v.optional(v.number()),
      cloudCoverPct: v.optional(v.number()),
      pressureMslHpa: v.optional(v.number()),
      shortwaveRadiation: v.optional(v.number()),
      boundaryLayerHeightM: v.optional(v.number()),
      raw: v.optional(v.any()),
    })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("fx_forecast_runs")
      .withIndex("by_provider_model_run", (q) =>
        q.eq("provider", args.run.provider)
          .eq("model", args.run.model)
          .eq("runStartedAt", args.run.runStartedAt)
      )
      .first();

    if (existing) {
      return { forecastRunId: existing._id, insertedPoints: 0, skipped: true };
    }

    const forecastRunId = await ctx.db.insert("fx_forecast_runs", args.run);
    const now = Date.now();
    for (const point of args.points) {
      await ctx.db.insert("fx_forecast_points", {
        forecastRunId,
        provider: args.run.provider,
        model: args.run.model,
        runStartedAt: args.run.runStartedAt,
        ...point,
        createdAt: now,
      });
    }
    return { forecastRunId, insertedPoints: args.points.length, skipped: false };
  },
});

export const saveObservations = mutation({
  args: {
    observations: v.array(v.object({
      sourceSlug: v.string(),
      provider: v.string(),
      providerStationId: v.string(),
      locationSlug: v.string(),
      observedAt: v.number(),
      receivedAt: v.number(),
      windSpeedKnots: v.optional(v.number()),
      windGustKnots: v.optional(v.number()),
      windDirectionDeg: v.optional(v.number()),
      temperatureC: v.optional(v.number()),
      pressureMslHpa: v.optional(v.number()),
      humidityPct: v.optional(v.number()),
      radiationKjM2: v.optional(v.number()),
      quality: v.string(),
      raw: v.optional(v.any()),
    })),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let skipped = 0;
    const now = Date.now();
    for (const obs of args.observations) {
      const existing = await ctx.db
        .query("fx_observations")
        .withIndex("by_source_observed", (q) =>
          q.eq("sourceSlug", obs.sourceSlug).eq("observedAt", obs.observedAt)
        )
        .first();
      if (existing) {
        skipped += 1;
        continue;
      }
      await ctx.db.insert("fx_observations", { ...obs, createdAt: now });
      inserted += 1;
    }
    return { inserted, skipped };
  },
});

export const saveUserReport = mutation({
  args: {
    userId: v.union(v.id("users"), v.null()),
    locationSlug: v.string(),
    sport: v.string(),
    observedAt: v.number(),
    status: v.string(),
    windSpeedEstimateKnots: v.optional(v.number()),
    windDirectionEstimateDeg: v.optional(v.number()),
    notes: v.optional(v.string()),
    confidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("fx_user_reports", {
      ...args,
      reportedAt: Date.now(),
      confidence: args.confidence ?? 0.6,
      createdAt: Date.now(),
    });
  },
});

export const saveDailyLabel = mutation({
  args: {
    locationSlug: v.string(),
    sport: v.string(),
    dateLocal: v.string(),
    thresholdKnots: v.number(),
    actualKickInAt: v.optional(v.number()),
    actualKickOutAt: v.optional(v.number()),
    peakStartAt: v.optional(v.number()),
    peakEndAt: v.optional(v.number()),
    maxWindKnots: v.optional(v.number()),
    maxGustKnots: v.optional(v.number()),
    sourceConfidence: v.number(),
    labelStatus: v.string(),
    sourceSummary: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("fx_daily_labels")
      .withIndex("by_location_date", (q) =>
        q.eq("locationSlug", args.locationSlug).eq("dateLocal", args.dateLocal)
      )
      .first();
    const doc = { ...args, computedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, doc);
      return existing._id;
    }
    return await ctx.db.insert("fx_daily_labels", doc);
  },
});

export const saveSkillScores = mutation({
  args: {
    scores: v.array(v.object({
      provider: v.string(),
      model: v.string(),
      locationSlug: v.string(),
      sport: v.string(),
      season: v.string(),
      regime: v.string(),
      leadBucketHours: v.string(),
      sampleCount: v.number(),
      windSpeedMae: v.optional(v.number()),
      windSpeedRmse: v.optional(v.number()),
      directionMae: v.optional(v.number()),
      onsetMaeMinutes: v.optional(v.number()),
      rideableBrier: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const score of args.scores) {
      await ctx.db.insert("fx_model_skill_scores", { ...score, updatedAt: now });
    }
    return { inserted: args.scores.length };
  },
});

export const savePrediction = mutation({
  args: {
    targetLocationSlug: v.string(),
    sport: v.string(),
    generatedAt: v.number(),
    forecastDateLocal: v.string(),
    modelVersion: v.string(),
    thresholdKnots: v.number(),
    kickInP50At: v.optional(v.number()),
    kickInP75At: v.optional(v.number()),
    peakStartAt: v.optional(v.number()),
    peakEndAt: v.optional(v.number()),
    probabilityTimeline: v.array(v.object({
      time: v.number(),
      rideableProbability: v.number(),
      expectedWindKnots: v.optional(v.number()),
      p10WindKnots: v.optional(v.number()),
      p90WindKnots: v.optional(v.number()),
    })),
    confidence: v.number(),
    summary: v.string(),
    inputs: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("fx_predictions", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const listLatestPredictions = query({
  args: {
    targetLocationSlug: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("fx_predictions")
      .withIndex("by_generated")
      .order("desc")
      .take(args.limit ?? 20);
    return all.filter((prediction) => prediction.targetLocationSlug === args.targetLocationSlug);
  },
});
```

- [ ] **Step 2: Run codegen and build**

Run:

```bash
npx convex codegen
npm run build
```

Expected: Generated API includes `forecastExperiment`; build succeeds or reports only unrelated pre-existing failures.

- [ ] **Step 3: Commit**

```bash
git add convex/forecastExperiment.ts convex/_generated
git commit -m "feat: add forecast experiment storage API"
```

---

### Task 4: Open-Meteo Forecast Run Worker

**Files:**
- Create: `lib/forecast-experiment/openMeteoClient.js`
- Create: `scripts/fx-fetch-openmeteo-runs.mjs`
- Create: `scripts/fx-backfill-openmeteo-previous-runs.mjs`

- [ ] **Step 1: Implement Open-Meteo client**

Create `lib/forecast-experiment/openMeteoClient.js`:

```javascript
import { createHash } from "node:crypto";
import { leadHours } from "./time.js";
import { round1 } from "./units.js";

const SINGLE_RUNS_ENDPOINT = "https://single-runs-api.open-meteo.com/v1/forecast";
const PREVIOUS_RUNS_ENDPOINT = "https://previous-runs-api.open-meteo.com/v1/forecast";

export const HOURLY_VARIABLES = [
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "temperature_2m",
  "cloud_cover",
  "pressure_msl",
  "shortwave_radiation",
  "boundary_layer_height",
];

export function responseHash(text) {
  return createHash("sha256").update(text).digest("hex");
}

export function buildSingleRunUrl({ location, model, run, forecastDays = 3 }) {
  const url = new URL(SINGLE_RUNS_ENDPOINT);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("hourly", HOURLY_VARIABLES.join(","));
  url.searchParams.set("wind_speed_unit", "kn");
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("forecast_days", String(forecastDays));
  url.searchParams.set("models", model.openMeteoModel);
  url.searchParams.set("run", run);
  return url;
}

export async function fetchSingleRun({ location, model, run, forecastDays = 3 }) {
  const url = buildSingleRunUrl({ location, model, run, forecastDays });
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Open-Meteo ${response.status}: ${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text);
  return { json, url: url.toString(), hash: responseHash(text) };
}

export function parseSingleRunPoints({ json, locationSlug, runStartedAt }) {
  const hourly = json.hourly;
  if (!hourly?.time) return [];
  return hourly.time.map((time, index) => {
    const validTime = Date.parse(`${time}Z`);
    return {
      locationSlug,
      validTime,
      leadHours: leadHours(runStartedAt, validTime),
      intervalMinutes: 60,
      windSpeedKnots: numeric(hourly.wind_speed_10m?.[index]),
      windGustKnots: numeric(hourly.wind_gusts_10m?.[index]),
      windDirectionDeg: numeric(hourly.wind_direction_10m?.[index]),
      temperatureC: numeric(hourly.temperature_2m?.[index]),
      cloudCoverPct: numeric(hourly.cloud_cover?.[index]),
      pressureMslHpa: numeric(hourly.pressure_msl?.[index]),
      shortwaveRadiation: numeric(hourly.shortwave_radiation?.[index]),
      boundaryLayerHeightM: numeric(hourly.boundary_layer_height?.[index]),
      raw: {
        time,
        model: json.generationtime_ms !== undefined ? json.generationtime_ms : null,
      },
    };
  });
}

export function buildPreviousRunsUrl({ location, model, startDate, endDate }) {
  const url = new URL(PREVIOUS_RUNS_ENDPOINT);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("hourly", [
    "wind_speed_10m_previous_day0",
    "wind_speed_10m_previous_day1",
    "wind_speed_10m_previous_day2",
    "wind_direction_10m_previous_day0",
    "wind_direction_10m_previous_day1",
    "wind_gusts_10m_previous_day0",
    "wind_gusts_10m_previous_day1",
  ].join(","));
  url.searchParams.set("wind_speed_unit", "kn");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("models", model.openMeteoModel);
  return url;
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? round1(number) : undefined;
}
```

- [ ] **Step 2: Implement model-run fetch script**

Create `scripts/fx-fetch-openmeteo-runs.mjs`:

```javascript
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";
import { FX_LOCATIONS, FX_MODELS } from "../lib/forecast-experiment/locations.js";
import { candidateGlobalRuns } from "../lib/forecast-experiment/time.js";
import { fetchSingleRun, parseSingleRunPoints, HOURLY_VARIABLES } from "../lib/forecast-experiment/openMeteoClient.js";

dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const workerName = "fx-fetch-openmeteo-runs";
const forecastDays = Number(process.env.FX_FORECAST_DAYS || "3");

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}

const workerRunId = await convex.mutation(api.forecastExperiment.startWorkerRun, {
  workerName,
  metadata: { forecastDays },
});

let attemptedCount = 0;
let insertedCount = 0;
let skippedCount = 0;

try {
  for (const location of FX_LOCATIONS.filter((item) => item.role !== "context")) {
    await convex.mutation(api.forecastExperiment.upsertLocation, {
      ...location,
      enabled: true,
    });
  }

  const runs = candidateGlobalRuns();
  for (const model of FX_MODELS.filter((item) => item.enabled)) {
    for (const runIso of runs) {
      const runStartedAt = Date.parse(`${runIso}:00Z`);
      const alreadyStored = await convex.query(api.forecastExperiment.findForecastRun, {
        provider: model.provider,
        model: model.model,
        runStartedAt,
      });
      if (alreadyStored) {
        skippedCount += 1;
        continue;
      }

      const allPoints = [];
      let sourceUrl = "";
      let responseHash = "";
      for (const location of FX_LOCATIONS.filter((item) => item.role !== "context")) {
        attemptedCount += 1;
        const result = await fetchSingleRun({ location, model, run: runIso, forecastDays });
        sourceUrl = result.url;
        responseHash = result.hash;
        allPoints.push(...parseSingleRunPoints({
          json: result.json,
          locationSlug: location.slug,
          runStartedAt,
        }));
        await sleep(500);
      }

      const result = await convex.mutation(api.forecastExperiment.saveForecastRunWithPoints, {
        run: {
          provider: model.provider,
          model: model.model,
          providerModel: model.openMeteoModel,
          runStartedAt,
          runAvailableAt: Date.now(),
          fetchedAt: Date.now(),
          status: "success",
          sourceUrl,
          responseHash,
          forecastDays,
          variables: HOURLY_VARIABLES,
        },
        points: allPoints,
      });
      insertedCount += result.insertedPoints;
      skippedCount += result.skipped ? 1 : 0;
    }
  }

  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "success",
    attemptedCount,
    insertedCount,
    skippedCount,
  });
} catch (error) {
  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: insertedCount > 0 ? "partial" : "failed",
    attemptedCount,
    insertedCount,
    skippedCount,
    errorMessage: error.message,
  });
  throw error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

- [ ] **Step 3: Implement previous-runs backfill script**

Create `scripts/fx-backfill-openmeteo-previous-runs.mjs` as an intentionally separate backfill script. It should:
- Read `FX_BACKFILL_START_DATE` and `FX_BACKFILL_END_DATE`.
- Fetch `previous-runs-api.open-meteo.com` for `cascais-bay`, `cabo-raso`, and `guincho`.
- Store the response in `fx_forecast_runs` using model names suffixed with `previous-day0`, `previous-day1`, and `previous-day2`.
- Use the same `saveForecastRunWithPoints` mutation.
- Sleep at least 500 ms between requests.

Use this command in development:

```bash
FX_BACKFILL_START_DATE=2026-05-01 FX_BACKFILL_END_DATE=2026-05-07 node scripts/fx-backfill-openmeteo-previous-runs.mjs
```

Expected: One week of fixed-lead forecast points exists for the experiment tables.

- [ ] **Step 4: Smoke test one model**

Run:

```bash
npm run fx:fetch:openmeteo
```

Expected:
- The script inserts `fx_locations`.
- At least one `fx_forecast_runs` row is created.
- `fx_forecast_points` contains rows for `cascais-bay`, `cabo-raso`, and `guincho`.

If an Open-Meteo model identifier returns 400, set that model's `enabled` field to `false` in `FX_MODELS`, add a comment with the returned error text, and proceed with the remaining models.

- [ ] **Step 5: Commit**

```bash
git add lib/forecast-experiment/openMeteoClient.js scripts/fx-fetch-openmeteo-runs.mjs scripts/fx-backfill-openmeteo-previous-runs.mjs
git commit -m "feat: ingest forecast experiment model runs"
```

---

### Task 5: Observation Worker

**Files:**
- Create: `lib/forecast-experiment/windguruClient.js`
- Create: `lib/forecast-experiment/ipmaClient.js`
- Create: `scripts/fx-fetch-observations.mjs`

- [ ] **Step 1: Extract Windguru client**

Create `lib/forecast-experiment/windguruClient.js`:

```javascript
import { round1 } from "./units.js";

export async function fetchWindguruCurrentStation(stationId) {
  const url = `https://www.windguru.cz/int/iapi.php?q=station_data_current&id_station=${stationId}`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "application/json, */*",
      Referer: `https://www.windguru.cz/station/${stationId}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Windguru API error: ${response.status}`);
  }

  const data = await response.json();
  const observedAt = data.unixtime ? data.unixtime * 1000 : Date.now();
  return {
    observedAt,
    windSpeedKnots: round1(data.wind_avg ?? 0),
    windGustKnots: round1(data.wind_max ?? 0),
    windDirectionDeg: data.wind_direction ?? undefined,
    temperatureC: numeric(data.temperature),
    quality: Date.now() - observedAt > 60 * 60 * 1000 ? "stale" : "ok",
    raw: data,
  };
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
```

- [ ] **Step 2: Implement IPMA client**

Create `lib/forecast-experiment/ipmaClient.js`:

```javascript
import { kmhToKnots, msToKnots } from "./units.js";

const IPMA_OBSERVATIONS_URL = "https://api.ipma.pt/open-data/observation/meteorology/stations/observations.json";
const IPMA_STATIONS_URL = "https://api.ipma.pt/open-data/observation/meteorology/stations/stations.json";

export async function fetchIpmaStations() {
  const response = await fetch(IPMA_STATIONS_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`IPMA stations API error: ${response.status}`);
  return await response.json();
}

export async function fetchIpmaHourlyObservations() {
  const response = await fetch(IPMA_OBSERVATIONS_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`IPMA observations API error: ${response.status}`);
  return await response.json();
}

export function parseIpmaObservations(payload, stationAllowList = []) {
  const observations = [];
  for (const [isoMinute, stationMap] of Object.entries(payload)) {
    const observedAt = Date.parse(`${isoMinute}:00Z`);
    if (!Number.isFinite(observedAt)) continue;
    for (const [stationId, raw] of Object.entries(stationMap)) {
      if (stationAllowList.length > 0 && !stationAllowList.includes(stationId)) continue;
      const windMs = valid(raw.intensidadeVento);
      const windKmh = valid(raw.intensidadeVentoKM);
      observations.push({
        stationId,
        observedAt,
        windSpeedKnots: windMs !== undefined ? msToKnots(windMs) : windKmh !== undefined ? kmhToKnots(windKmh) : undefined,
        windGustKnots: undefined,
        windDirectionDeg: ipmaDirectionClassToDegrees(raw.idDireccVento),
        temperatureC: valid(raw.temperatura),
        pressureMslHpa: valid(raw.pressao),
        humidityPct: valid(raw.humidade),
        radiationKjM2: valid(raw.radiacao),
        quality: hasNoData(raw) ? "nodata" : "ok",
        raw,
      });
    }
  }
  return observations;
}

export function ipmaDirectionClassToDegrees(value) {
  const code = Number(value);
  const map = {
    1: 0,
    2: 45,
    3: 90,
    4: 135,
    5: 180,
    6: 225,
    7: 270,
    8: 315,
    9: 0,
  };
  return map[code];
}

function valid(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number === -99 || number === -99.0) return undefined;
  return number;
}

function hasNoData(raw) {
  return Object.values(raw).some((value) => Number(value) === -99);
}
```

- [ ] **Step 3: Implement observation script**

Create `scripts/fx-fetch-observations.mjs`:

```javascript
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";
import { FX_OBSERVATION_SOURCES } from "../lib/forecast-experiment/locations.js";
import { fetchWindguruCurrentStation } from "../lib/forecast-experiment/windguruClient.js";
import { fetchIpmaHourlyObservations, parseIpmaObservations } from "../lib/forecast-experiment/ipmaClient.js";

dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const workerName = "fx-fetch-observations";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}

const workerRunId = await convex.mutation(api.forecastExperiment.startWorkerRun, {
  workerName,
});

let attemptedCount = 0;
let insertedCount = 0;
let skippedCount = 0;

try {
  for (const source of FX_OBSERVATION_SOURCES) {
    await convex.mutation(api.forecastExperiment.upsertObservationSource, source);
  }

  const observations = [];
  const windguruSources = FX_OBSERVATION_SOURCES.filter((source) => source.provider === "windguru" && source.enabled);
  for (const source of windguruSources) {
    attemptedCount += 1;
    const obs = await fetchWindguruCurrentStation(source.providerStationId);
    observations.push({
      sourceSlug: source.slug,
      provider: source.provider,
      providerStationId: source.providerStationId,
      locationSlug: source.locationSlug,
      receivedAt: Date.now(),
      ...obs,
    });
  }

  const ipmaSources = FX_OBSERVATION_SOURCES.filter((source) => source.provider === "ipma" && source.enabled);
  if (ipmaSources.length > 0) {
    attemptedCount += 1;
    const payload = await fetchIpmaHourlyObservations();
    const parsed = parseIpmaObservations(payload);
    for (const obs of parsed) {
      observations.push({
        sourceSlug: "ipma-surface",
        provider: "ipma",
        providerStationId: obs.stationId,
        locationSlug: "cascais-region",
        receivedAt: Date.now(),
        observedAt: obs.observedAt,
        windSpeedKnots: obs.windSpeedKnots,
        windGustKnots: obs.windGustKnots,
        windDirectionDeg: obs.windDirectionDeg,
        temperatureC: obs.temperatureC,
        pressureMslHpa: obs.pressureMslHpa,
        humidityPct: obs.humidityPct,
        radiationKjM2: obs.radiationKjM2,
        quality: obs.quality,
        raw: obs.raw,
      });
    }
  }

  const result = await convex.mutation(api.forecastExperiment.saveObservations, { observations });
  insertedCount = result.inserted;
  skippedCount = result.skipped;

  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "success",
    attemptedCount,
    insertedCount,
    skippedCount,
  });
} catch (error) {
  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: insertedCount > 0 ? "partial" : "failed",
    attemptedCount,
    insertedCount,
    skippedCount,
    errorMessage: error.message,
  });
  throw error;
}
```

- [ ] **Step 4: Run the observation worker**

Run:

```bash
npm run fx:fetch:observations
```

Expected:
- `fx_observation_sources` contains the three configured sources.
- `fx_observations` contains at least one Windguru record and recent IPMA rows.
- Re-running the command skips duplicate observations with the same `sourceSlug` and `observedAt`.

- [ ] **Step 5: Commit**

```bash
git add lib/forecast-experiment/windguruClient.js lib/forecast-experiment/ipmaClient.js scripts/fx-fetch-observations.mjs
git commit -m "feat: ingest forecast experiment observations"
```

---

### Task 6: User Reports As Weak Bay Labels

**Files:**
- Modify: `convex/forecastExperiment.ts`
- Optional create: `app/api/forecast-experiment/report/route.js`
- Optional create or modify a tiny admin/internal UI component only if manual entry is needed immediately.

- [ ] **Step 1: Keep reports isolated**

Use `forecastExperiment.saveUserReport` from Task 3 as the first ingestion path. Do not modify `session_entries`.

- [ ] **Step 2: Add a server route for unauthenticated quick reports if needed**

Create `app/api/forecast-experiment/report/route.js` only if reports need to be submitted outside the logged-in app:

```javascript
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api.js";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export async function POST(request) {
  const body = await request.json();
  if (!["cascais-bay", "cabo-raso", "guincho"].includes(body.locationSlug)) {
    return NextResponse.json({ error: "Invalid locationSlug" }, { status: 400 });
  }
  if (!["not_in", "marginal", "rideable", "strong"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const reportId = await convex.mutation(api.forecastExperiment.saveUserReport, {
    userId: null,
    locationSlug: body.locationSlug,
    sport: "wingfoil",
    observedAt: body.observedAt ?? Date.now(),
    status: body.status,
    windSpeedEstimateKnots: body.windSpeedEstimateKnots,
    windDirectionEstimateDeg: body.windDirectionEstimateDeg,
    notes: typeof body.notes === "string" ? body.notes.slice(0, 500) : undefined,
    confidence: 0.6,
  });
  return NextResponse.json({ reportId });
}
```

- [ ] **Step 3: Smoke test report mutation**

Run in Convex dashboard or a local script:

```javascript
await client.mutation(api.forecastExperiment.saveUserReport, {
  userId: null,
  locationSlug: "cascais-bay",
  sport: "wingfoil",
  observedAt: Date.now(),
  status: "not_in",
  notes: "Cabo Raso windy, bay still glassy near the marina.",
  confidence: 0.6,
});
```

Expected: `fx_user_reports` contains the report and no production journal rows are created.

- [ ] **Step 4: Commit**

```bash
git add convex/forecastExperiment.ts app/api/forecast-experiment/report/route.js
git commit -m "feat: accept isolated forecast experiment reports"
```

Skip `app/api/forecast-experiment/report/route.js` in the commit if the route was not created.

---

### Task 7: Daily Label Builder

**Files:**
- Create: `lib/forecast-experiment/labels.js`
- Create: `tests/forecast-experiment/labels.test.mjs`
- Create: `scripts/fx-build-labels.mjs`
- Modify: `convex/forecastExperiment.ts`

- [ ] **Step 1: Add read queries for observations and reports**

Add these queries to `convex/forecastExperiment.ts`:

```typescript
export const listObservationsForWindow = query({
  args: {
    locationSlug: v.string(),
    startAt: v.number(),
    endAt: v.number(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("fx_observations")
      .withIndex("by_location_observed", (q) =>
        q.eq("locationSlug", args.locationSlug).gte("observedAt", args.startAt)
      )
      .take(5000);
    return rows.filter((row) => row.observedAt <= args.endAt);
  },
});

export const listReportsForWindow = query({
  args: {
    locationSlug: v.string(),
    startAt: v.number(),
    endAt: v.number(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("fx_user_reports")
      .withIndex("by_location_observed", (q) =>
        q.eq("locationSlug", args.locationSlug).gte("observedAt", args.startAt)
      )
      .take(1000);
    return rows.filter((row) => row.observedAt <= args.endAt);
  },
});
```

- [ ] **Step 2: Write label tests**

Create `tests/forecast-experiment/labels.test.mjs`:

```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { buildDailyLabel } from "../../lib/forecast-experiment/labels.js";

const base = Date.UTC(2026, 6, 1, 12);

test("finds kick-in after sustained threshold crossing", () => {
  const observations = [
    obs(base + 0 * 15 * 60_000, 8),
    obs(base + 1 * 15 * 60_000, 12),
    obs(base + 2 * 15 * 60_000, 15),
    obs(base + 3 * 15 * 60_000, 16),
    obs(base + 4 * 15 * 60_000, 17),
  ];
  const label = buildDailyLabel({
    locationSlug: "cascais-bay",
    dateLocal: "2026-07-01",
    observations,
    reports: [],
    thresholdKnots: 15,
  });
  assert.equal(label.actualKickInAt, base + 2 * 15 * 60_000);
  assert.equal(label.labelStatus, "observed");
});

test("uses reports when station data is absent", () => {
  const reports = [
    { observedAt: base, status: "not_in", confidence: 0.6 },
    { observedAt: base + 60 * 60_000, status: "rideable", confidence: 0.6 },
  ];
  const label = buildDailyLabel({
    locationSlug: "cascais-bay",
    dateLocal: "2026-07-01",
    observations: [],
    reports,
    thresholdKnots: 15,
  });
  assert.equal(label.actualKickInAt, base + 60 * 60_000);
  assert.equal(label.labelStatus, "report-assisted");
});

function obs(observedAt, windSpeedKnots) {
  return {
    observedAt,
    windSpeedKnots,
    windGustKnots: windSpeedKnots + 3,
    quality: "ok",
  };
}
```

- [ ] **Step 3: Implement labels**

Create `lib/forecast-experiment/labels.js`:

```javascript
export function buildDailyLabel({ locationSlug, dateLocal, observations, reports, thresholdKnots }) {
  const cleanObservations = observations
    .filter((obs) => obs.quality === "ok" && Number.isFinite(obs.windSpeedKnots))
    .sort((a, b) => a.observedAt - b.observedAt);

  if (cleanObservations.length > 0) {
    return labelFromObservations({ locationSlug, dateLocal, observations: cleanObservations, thresholdKnots });
  }

  const cleanReports = reports
    .filter((report) => ["not_in", "marginal", "rideable", "strong"].includes(report.status))
    .sort((a, b) => a.observedAt - b.observedAt);

  if (cleanReports.length > 0) {
    return labelFromReports({ locationSlug, dateLocal, reports: cleanReports, thresholdKnots });
  }

  return {
    locationSlug,
    sport: "wingfoil",
    dateLocal,
    thresholdKnots,
    sourceConfidence: 0,
    labelStatus: "insufficient-data",
    sourceSummary: "No valid observations or user reports were available.",
  };
}

function labelFromObservations({ locationSlug, dateLocal, observations, thresholdKnots }) {
  const sustained = firstSustainedCrossing(observations, thresholdKnots);
  const rideable = observations.filter((obs) => obs.windSpeedKnots >= thresholdKnots);
  const max = observations.reduce((best, obs) => {
    if (!best || obs.windSpeedKnots > best.windSpeedKnots) return obs;
    return best;
  }, null);

  return {
    locationSlug,
    sport: "wingfoil",
    dateLocal,
    thresholdKnots,
    actualKickInAt: sustained?.observedAt,
    actualKickOutAt: rideable.length > 0 ? rideable[rideable.length - 1].observedAt : undefined,
    peakStartAt: max?.observedAt,
    peakEndAt: max ? max.observedAt + 60 * 60_000 : undefined,
    maxWindKnots: max?.windSpeedKnots,
    maxGustKnots: Math.max(...observations.map((obs) => obs.windGustKnots ?? obs.windSpeedKnots)),
    sourceConfidence: sustained ? 0.95 : 0.8,
    labelStatus: sustained ? "observed" : "no-kick",
    sourceSummary: sustained
      ? `Station observations crossed ${thresholdKnots} kt at ${new Date(sustained.observedAt).toISOString()}.`
      : `Station observations did not sustain ${thresholdKnots} kt.`,
  };
}

function labelFromReports({ locationSlug, dateLocal, reports, thresholdKnots }) {
  const positive = reports.find((report) => report.status === "rideable" || report.status === "strong");
  return {
    locationSlug,
    sport: "wingfoil",
    dateLocal,
    thresholdKnots,
    actualKickInAt: positive?.observedAt,
    sourceConfidence: positive ? Math.min(0.75, positive.confidence ?? 0.6) : 0.55,
    labelStatus: positive ? "report-assisted" : "no-kick",
    sourceSummary: positive
      ? `User report marked the bay ${positive.status} at ${new Date(positive.observedAt).toISOString()}.`
      : "User reports did not mark the bay as rideable.",
  };
}

function firstSustainedCrossing(observations, thresholdKnots) {
  for (let index = 0; index < observations.length - 1; index += 1) {
    const current = observations[index];
    const next = observations[index + 1];
    if (
      current.windSpeedKnots >= thresholdKnots &&
      next.windSpeedKnots >= thresholdKnots &&
      next.observedAt - current.observedAt <= 45 * 60_000
    ) {
      return current;
    }
  }
  return undefined;
}
```

- [ ] **Step 4: Implement label builder script**

Create `scripts/fx-build-labels.mjs`:

```javascript
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";
import { FX_LOCATIONS } from "../lib/forecast-experiment/locations.js";
import { localDateKey } from "../lib/forecast-experiment/time.js";
import { buildDailyLabel } from "../lib/forecast-experiment/labels.js";

dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const workerRunId = await convex.mutation(api.forecastExperiment.startWorkerRun, {
  workerName: "fx-build-labels",
});

let insertedCount = 0;
let attemptedCount = 0;

try {
  const now = Date.now();
  const daysBack = Number(process.env.FX_LABEL_DAYS_BACK || "7");
  for (let offset = 0; offset <= daysBack; offset += 1) {
    const dayMs = now - offset * 24 * 60 * 60_000;
    for (const location of FX_LOCATIONS.filter((item) => item.role !== "context")) {
      const dateLocal = localDateKey(dayMs, location.timezone);
      const startAt = Date.parse(`${dateLocal}T00:00:00+00:00`) - 2 * 60 * 60_000;
      const endAt = startAt + 30 * 60 * 60_000;
      attemptedCount += 1;
      const observations = await convex.query(api.forecastExperiment.listObservationsForWindow, {
        locationSlug: location.slug,
        startAt,
        endAt,
      });
      const reports = await convex.query(api.forecastExperiment.listReportsForWindow, {
        locationSlug: location.slug,
        startAt,
        endAt,
      });
      const label = buildDailyLabel({
        locationSlug: location.slug,
        dateLocal,
        observations,
        reports,
        thresholdKnots: location.defaultRideableWindKnots,
      });
      await convex.mutation(api.forecastExperiment.saveDailyLabel, label);
      insertedCount += 1;
    }
  }
  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "success",
    attemptedCount,
    insertedCount,
  });
} catch (error) {
  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "failed",
    attemptedCount,
    insertedCount,
    errorMessage: error.message,
  });
  throw error;
}
```

- [ ] **Step 5: Run label tests and script**

Run:

```bash
npm run test:fx
npm run fx:build-labels
```

Expected:
- Label unit tests pass.
- `fx_daily_labels` has rows for each configured location/date.

- [ ] **Step 6: Commit**

```bash
git add convex/forecastExperiment.ts lib/forecast-experiment/labels.js tests/forecast-experiment/labels.test.mjs scripts/fx-build-labels.mjs
git commit -m "feat: derive forecast experiment daily labels"
```

---

### Task 8: Model Skill Scoring Worker

**Files:**
- Create: `lib/forecast-experiment/skill.js`
- Create: `tests/forecast-experiment/skill.test.mjs`
- Create: `scripts/fx-score-models.mjs`
- Modify: `convex/forecastExperiment.ts`

- [ ] **Step 1: Add read queries for forecasts and labels**

Add to `convex/forecastExperiment.ts`:

```typescript
export const listForecastPointsForWindow = query({
  args: {
    locationSlug: v.string(),
    startAt: v.number(),
    endAt: v.number(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("fx_forecast_points")
      .withIndex("by_location_valid", (q) =>
        q.eq("locationSlug", args.locationSlug).gte("validTime", args.startAt)
      )
      .take(10000);
    return rows.filter((row) => row.validTime <= args.endAt);
  },
});

export const listLabelsForWindow = query({
  args: {
    locationSlug: v.string(),
    startDateLocal: v.string(),
    endDateLocal: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("fx_daily_labels")
      .withIndex("by_location_date", (q) => q.eq("locationSlug", args.locationSlug))
      .collect();
    return rows.filter((row) => row.dateLocal >= args.startDateLocal && row.dateLocal <= args.endDateLocal);
  },
});
```

- [ ] **Step 2: Write skill tests**

Create `tests/forecast-experiment/skill.test.mjs`:

```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { bucketLeadHours, meanAbsoluteError, brierScore, onsetErrorMinutes } from "../../lib/forecast-experiment/skill.js";

test("buckets lead hours", () => {
  assert.equal(bucketLeadHours(5), "0-6");
  assert.equal(bucketLeadHours(18), "12-24");
  assert.equal(bucketLeadHours(49), "48-72");
});

test("computes wind speed MAE", () => {
  assert.equal(meanAbsoluteError([10, 12], [12, 11]), 1.5);
});

test("computes brier score", () => {
  assert.equal(brierScore([0.8, 0.2], [1, 0]), 0.04);
});

test("computes onset error in minutes", () => {
  const actual = Date.UTC(2026, 6, 1, 16);
  const predicted = Date.UTC(2026, 6, 1, 17);
  assert.equal(onsetErrorMinutes(actual, predicted), 60);
});
```

- [ ] **Step 3: Implement skill helpers**

Create `lib/forecast-experiment/skill.js`:

```javascript
export function bucketLeadHours(hours) {
  if (hours <= 6) return "0-6";
  if (hours <= 12) return "6-12";
  if (hours <= 24) return "12-24";
  if (hours <= 48) return "24-48";
  return "48-72";
}

export function meanAbsoluteError(actual, predicted) {
  const pairs = actual.map((value, index) => [value, predicted[index]])
    .filter(([a, p]) => Number.isFinite(a) && Number.isFinite(p));
  if (pairs.length === 0) return undefined;
  return round2(pairs.reduce((sum, [a, p]) => sum + Math.abs(a - p), 0) / pairs.length);
}

export function rootMeanSquaredError(actual, predicted) {
  const pairs = actual.map((value, index) => [value, predicted[index]])
    .filter(([a, p]) => Number.isFinite(a) && Number.isFinite(p));
  if (pairs.length === 0) return undefined;
  return round2(Math.sqrt(pairs.reduce((sum, [a, p]) => sum + (a - p) ** 2, 0) / pairs.length));
}

export function brierScore(probabilities, outcomes) {
  const pairs = probabilities.map((value, index) => [value, outcomes[index]])
    .filter(([p, o]) => Number.isFinite(p) && (o === 0 || o === 1));
  if (pairs.length === 0) return undefined;
  return round2(pairs.reduce((sum, [p, o]) => sum + (p - o) ** 2, 0) / pairs.length);
}

export function onsetErrorMinutes(actualKickInAt, predictedKickInAt) {
  if (!Number.isFinite(actualKickInAt) || !Number.isFinite(predictedKickInAt)) return undefined;
  return Math.round(Math.abs(actualKickInAt - predictedKickInAt) / 60_000);
}

export function forecastRideableProbability(point, thresholdKnots) {
  if (!Number.isFinite(point.windSpeedKnots)) return undefined;
  const distance = point.windSpeedKnots - thresholdKnots;
  return Math.max(0.05, Math.min(0.95, 0.5 + distance * 0.08));
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
```

- [ ] **Step 4: Implement scoring script**

Create `scripts/fx-score-models.mjs`:

```javascript
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";
import { FX_LOCATIONS } from "../lib/forecast-experiment/locations.js";
import { localDateKey } from "../lib/forecast-experiment/time.js";
import { bucketLeadHours, meanAbsoluteError, rootMeanSquaredError, brierScore, forecastRideableProbability } from "../lib/forecast-experiment/skill.js";

dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const workerRunId = await convex.mutation(api.forecastExperiment.startWorkerRun, {
  workerName: "fx-score-models",
});

let attemptedCount = 0;
let insertedCount = 0;

try {
  const now = Date.now();
  const startAt = now - Number(process.env.FX_SKILL_DAYS_BACK || "30") * 24 * 60 * 60_000;
  const endAt = now;
  const scores = [];

  for (const location of FX_LOCATIONS.filter((item) => item.role !== "context")) {
    const points = await convex.query(api.forecastExperiment.listForecastPointsForWindow, {
      locationSlug: location.slug,
      startAt,
      endAt,
    });
    const observations = await convex.query(api.forecastExperiment.listObservationsForWindow, {
      locationSlug: location.slug,
      startAt,
      endAt,
    });
    attemptedCount += 1;
    scores.push(...scoreLocation({ location, points, observations }));
  }

  if (scores.length > 0) {
    const result = await convex.mutation(api.forecastExperiment.saveSkillScores, { scores });
    insertedCount = result.inserted;
  }

  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "success",
    attemptedCount,
    insertedCount,
  });
} catch (error) {
  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "failed",
    attemptedCount,
    insertedCount,
    errorMessage: error.message,
  });
  throw error;
}

function scoreLocation({ location, points, observations }) {
  const observationsByHour = new Map();
  for (const obs of observations) {
    const hour = Math.floor(obs.observedAt / 3_600_000) * 3_600_000;
    if (!observationsByHour.has(hour)) observationsByHour.set(hour, []);
    observationsByHour.get(hour).push(obs);
  }

  const groups = new Map();
  for (const point of points) {
    const hour = Math.floor(point.validTime / 3_600_000) * 3_600_000;
    const obsRows = observationsByHour.get(hour) ?? [];
    if (obsRows.length === 0) continue;
    const actualWind = average(obsRows.map((obs) => obs.windSpeedKnots).filter(Number.isFinite));
    if (!Number.isFinite(actualWind)) continue;
    const key = JSON.stringify({
      provider: point.provider,
      model: point.model,
      leadBucketHours: bucketLeadHours(point.leadHours),
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ point, actualWind });
  }

  return [...groups.entries()].map(([key, rows]) => {
    const meta = JSON.parse(key);
    const actual = rows.map((row) => row.actualWind);
    const predicted = rows.map((row) => row.point.windSpeedKnots);
    const probabilities = rows.map((row) => forecastRideableProbability(row.point, location.defaultRideableWindKnots));
    const outcomes = rows.map((row) => row.actualWind >= location.defaultRideableWindKnots ? 1 : 0);
    return {
      provider: meta.provider,
      model: meta.model,
      locationSlug: location.slug,
      sport: "wingfoil",
      season: "all",
      regime: "all",
      leadBucketHours: meta.leadBucketHours,
      sampleCount: rows.length,
      windSpeedMae: meanAbsoluteError(actual, predicted),
      windSpeedRmse: rootMeanSquaredError(actual, predicted),
      rideableBrier: brierScore(probabilities, outcomes),
    };
  });
}

function average(values) {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
```

- [ ] **Step 5: Run skill tests and scoring**

Run:

```bash
npm run test:fx
npm run fx:score-models
```

Expected:
- Skill tests pass.
- `fx_model_skill_scores` receives rows for any model/location pairs with overlapping forecasts and observations.

- [ ] **Step 6: Commit**

```bash
git add convex/forecastExperiment.ts lib/forecast-experiment/skill.js tests/forecast-experiment/skill.test.mjs scripts/fx-score-models.mjs
git commit -m "feat: score forecast experiment model skill"
```

---

### Task 9: Baseline Prediction Worker

**Files:**
- Create: `lib/forecast-experiment/prediction.js`
- Create: `tests/forecast-experiment/prediction.test.mjs`
- Create: `scripts/fx-generate-predictions.mjs`
- Modify: `convex/forecastExperiment.ts`

- [ ] **Step 1: Add latest forecast/observation queries**

Add to `convex/forecastExperiment.ts`:

```typescript
export const listRecentForecastPoints = query({
  args: {
    locationSlug: v.string(),
    startAt: v.number(),
    endAt: v.number(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("fx_forecast_points")
      .withIndex("by_location_valid", (q) =>
        q.eq("locationSlug", args.locationSlug).gte("validTime", args.startAt)
      )
      .take(10000);
    return rows
      .filter((row) => row.validTime <= args.endAt)
      .sort((a, b) => b.runStartedAt - a.runStartedAt);
  },
});

export const listLatestObservations = query({
  args: {
    locationSlug: v.string(),
    sinceAt: v.number(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("fx_observations")
      .withIndex("by_location_observed", (q) =>
        q.eq("locationSlug", args.locationSlug).gte("observedAt", args.sinceAt)
      )
      .take(1000);
    return rows.sort((a, b) => b.observedAt - a.observedAt);
  },
});
```

- [ ] **Step 2: Write prediction tests**

Create `tests/forecast-experiment/prediction.test.mjs`:

```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { buildBaselinePrediction, bayLagMinutesFromCaboRaso } from "../../lib/forecast-experiment/prediction.js";

test("reduces confidence when models disagree", () => {
  const now = Date.UTC(2026, 6, 1, 10);
  const points = [
    point(now + 6 * 60 * 60_000, "gfs", 20),
    point(now + 6 * 60 * 60_000, "ecmwf", 10),
  ];
  const prediction = buildBaselinePrediction({
    targetLocationSlug: "cascais-bay",
    forecastDateLocal: "2026-07-01",
    generatedAt: now,
    points,
    caboRasoObservations: [],
    thresholdKnots: 15,
  });
  assert.equal(prediction.confidence < 0.7, true);
});

test("estimates shorter bay lag when Cabo Raso is already strong", () => {
  assert.equal(bayLagMinutesFromCaboRaso({ windSpeedKnots: 22, windDirectionDeg: 330 }), 45);
  assert.equal(bayLagMinutesFromCaboRaso({ windSpeedKnots: 14, windDirectionDeg: 330 }), 90);
});

function point(validTime, model, windSpeedKnots) {
  return {
    provider: "open-meteo",
    model,
    validTime,
    windSpeedKnots,
    windGustKnots: windSpeedKnots + 3,
    windDirectionDeg: 330,
  };
}
```

- [ ] **Step 3: Implement baseline prediction**

Create `lib/forecast-experiment/prediction.js`:

```javascript
export function buildBaselinePrediction({
  targetLocationSlug,
  forecastDateLocal,
  generatedAt,
  points,
  caboRasoObservations,
  thresholdKnots,
}) {
  const byValidTime = groupBy(points, (point) => point.validTime);
  const latestCaboRaso = caboRasoObservations[0];
  const lagMinutes = latestCaboRaso ? bayLagMinutesFromCaboRaso(latestCaboRaso) : undefined;

  const probabilityTimeline = [...byValidTime.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, rows]) => {
      const winds = rows.map((row) => row.windSpeedKnots).filter(Number.isFinite);
      const expected = average(winds);
      const spread = quantile(winds, 0.9) - quantile(winds, 0.1);
      const modelProbability = logistic((expected - thresholdKnots) / 2);
      const nowcastBoost = latestCaboRaso && time >= latestCaboRaso.observedAt + (lagMinutes ?? 90) * 60_000 ? 0.12 : 0;
      return {
        time,
        rideableProbability: round2(Math.max(0.03, Math.min(0.97, modelProbability + nowcastBoost))),
        expectedWindKnots: round1(expected),
        p10WindKnots: round1(quantile(winds, 0.1)),
        p90WindKnots: round1(quantile(winds, 0.9)),
        spread,
      };
    });

  const confidence = confidenceFromTimeline(probabilityTimeline);
  const firstLikely = probabilityTimeline.find((row) => row.rideableProbability >= 0.5);
  const firstHigh = probabilityTimeline.find((row) => row.rideableProbability >= 0.75);
  const peak = probabilityTimeline.reduce((best, row) => {
    if (!best || row.rideableProbability > best.rideableProbability) return row;
    return best;
  }, undefined);

  return {
    targetLocationSlug,
    sport: "wingfoil",
    generatedAt,
    forecastDateLocal,
    modelVersion: "baseline-ensemble-v1",
    thresholdKnots,
    kickInP50At: firstLikely?.time,
    kickInP75At: firstHigh?.time,
    peakStartAt: peak?.time,
    peakEndAt: peak ? peak.time + 60 * 60_000 : undefined,
    probabilityTimeline: probabilityTimeline.map(({ spread, ...row }) => row),
    confidence,
    summary: summary({ firstLikely, firstHigh, peak, latestCaboRaso, lagMinutes }),
    inputs: {
      pointCount: points.length,
      caboRasoObservationAt: latestCaboRaso?.observedAt,
      caboRasoLagMinutes: lagMinutes,
    },
  };
}

export function bayLagMinutesFromCaboRaso(observation) {
  const wind = observation.windSpeedKnots ?? 0;
  const direction = observation.windDirectionDeg ?? 0;
  const isNortadaDirection = direction >= 300 || direction <= 40;
  if (!isNortadaDirection) return 120;
  if (wind >= 20) return 45;
  if (wind >= 16) return 60;
  return 90;
}

function confidenceFromTimeline(timeline) {
  if (timeline.length === 0) return 0;
  const avgSpread = average(timeline.map((row) => row.spread).filter(Number.isFinite));
  if (!Number.isFinite(avgSpread)) return 0.4;
  return round2(Math.max(0.25, Math.min(0.9, 0.85 - avgSpread * 0.04)));
}

function summary({ firstLikely, firstHigh, peak, latestCaboRaso, lagMinutes }) {
  if (!firstLikely) return "Bay rideability is unlikely in the current forecast window.";
  const p50 = new Date(firstLikely.time).toISOString();
  const p75 = firstHigh ? new Date(firstHigh.time).toISOString() : "not reached";
  const peakIso = peak ? new Date(peak.time).toISOString() : "not available";
  const cabo = latestCaboRaso
    ? ` Cabo Raso latest wind suggests an estimated bay lag near ${lagMinutes} minutes.`
    : "";
  return `Bay rideability crosses 50% near ${p50}; 75% threshold: ${p75}; peak near ${peakIso}.${cabo}`;
}

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function average(values) {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function quantile(values, q) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return undefined;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * q)));
  return sorted[index];
}

function logistic(value) {
  return 1 / (1 + Math.exp(-value));
}

function round1(value) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : undefined;
}

function round2(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined;
}
```

- [ ] **Step 4: Implement prediction script**

Create `scripts/fx-generate-predictions.mjs`:

```javascript
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";
import { FX_LOCATIONS } from "../lib/forecast-experiment/locations.js";
import { localDateKey } from "../lib/forecast-experiment/time.js";
import { buildBaselinePrediction } from "../lib/forecast-experiment/prediction.js";

dotenv.config({ path: ".env.local" });

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const workerRunId = await convex.mutation(api.forecastExperiment.startWorkerRun, {
  workerName: "fx-generate-predictions",
});

let insertedCount = 0;

try {
  const generatedAt = Date.now();
  const target = FX_LOCATIONS.find((location) => location.slug === "cascais-bay");
  const forecastDateLocal = localDateKey(generatedAt, target.timezone);
  const startAt = generatedAt;
  const endAt = generatedAt + 36 * 60 * 60_000;
  const points = await convex.query(api.forecastExperiment.listRecentForecastPoints, {
    locationSlug: "cascais-bay",
    startAt,
    endAt,
  });
  const caboRasoObservations = await convex.query(api.forecastExperiment.listLatestObservations, {
    locationSlug: "cabo-raso",
    sinceAt: generatedAt - 6 * 60 * 60_000,
  });
  const prediction = buildBaselinePrediction({
    targetLocationSlug: "cascais-bay",
    forecastDateLocal,
    generatedAt,
    points,
    caboRasoObservations,
    thresholdKnots: target.defaultRideableWindKnots,
  });
  await convex.mutation(api.forecastExperiment.savePrediction, prediction);
  insertedCount = 1;
  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "success",
    attemptedCount: 1,
    insertedCount,
  });
} catch (error) {
  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "failed",
    attemptedCount: 1,
    insertedCount,
    errorMessage: error.message,
  });
  throw error;
}
```

- [ ] **Step 5: Run prediction tests and script**

Run:

```bash
npm run test:fx
npm run fx:predict
```

Expected:
- Prediction tests pass.
- `fx_predictions` contains a `baseline-ensemble-v1` prediction for `cascais-bay`.

- [ ] **Step 6: Commit**

```bash
git add convex/forecastExperiment.ts lib/forecast-experiment/prediction.js tests/forecast-experiment/prediction.test.mjs scripts/fx-generate-predictions.mjs
git commit -m "feat: generate baseline bay forecast predictions"
```

---

### Task 10: Render Deployment Wiring

**Files:**
- Modify: `render.yaml`
- Modify: `scripts/README.md`

- [ ] **Step 1: Add forecast experiment jobs to `render.yaml`**

Add these services after the existing scraper cron:

```yaml
  - type: cron
    name: waterman-fx-openmeteo
    schedule: "30 * * * *"
    env: node
    buildCommand: npm install
    startCommand: npm run fx:fetch:openmeteo
    envVars:
      - key: NEXT_PUBLIC_CONVEX_URL
        sync: false

  - type: cron
    name: waterman-fx-labels
    schedule: "10 * * * *"
    env: node
    buildCommand: npm install
    startCommand: npm run fx:build-labels && npm run fx:score-models && npm run fx:predict
    envVars:
      - key: NEXT_PUBLIC_CONVEX_URL
        sync: false

  - type: worker
    name: waterman-fx-observations
    env: node
    buildCommand: npm install
    startCommand: sh -c 'while true; do npm run fx:fetch:observations; sleep ${FX_OBSERVATION_POLL_SECONDS:-300}; done'
    envVars:
      - key: NEXT_PUBLIC_CONVEX_URL
        sync: false
      - key: FX_OBSERVATION_POLL_SECONDS
        value: "300"
```

Note: the current `waterman-scraper` build command contains `npm install && tes`. Fix that typo in a separate commit only if Render deploys are currently failing because of it.

- [ ] **Step 2: Document worker operations**

Add to `scripts/README.md`:

```markdown
### Forecast Experiment Workers

These scripts power the isolated Cascais wingfoil forecast experiment. They write only to `fx_*` Convex tables.

- `npm run fx:fetch:openmeteo` fetches individual model runs from Open-Meteo Single Runs API.
- `npm run fx:fetch:observations` fetches Windguru and IPMA observations.
- `npm run fx:build-labels` derives daily rideability/kick-in labels.
- `npm run fx:score-models` computes model skill metrics.
- `npm run fx:predict` writes baseline probabilistic bay predictions.

Required environment:

```env
NEXT_PUBLIC_CONVEX_URL=...
FX_FORECAST_DAYS=3
FX_OBSERVATION_POLL_SECONDS=300
```

The experiment intentionally does not modify `forecast_slots`, `condition_scores`, or production scoring prompts.
```

- [ ] **Step 3: Validate YAML and local scripts**

Run:

```bash
npm run test:fx
npm run fx:fetch:observations
npm run fx:build-labels
npm run fx:score-models
npm run fx:predict
```

Expected: scripts run locally and write only to `fx_*` tables.

- [ ] **Step 4: Commit**

```bash
git add render.yaml scripts/README.md
git commit -m "chore: deploy isolated forecast experiment workers"
```

---

### Task 11: Minimal Debug Surface

**Files:**
- Optional create: `app/admin/forecast-experiment/page.js`
- Modify: `convex/forecastExperiment.ts`

- [ ] **Step 1: Add debug summary query**

Add to `convex/forecastExperiment.ts`:

```typescript
export const debugSummary = query({
  args: {},
  handler: async (ctx) => {
    const workerRuns = await ctx.db.query("fx_worker_runs").withIndex("by_status_started").order("desc").take(20);
    const predictions = await ctx.db.query("fx_predictions").withIndex("by_generated").order("desc").take(10);
    const skillScores = await ctx.db.query("fx_model_skill_scores").take(100);
    return {
      workerRuns,
      predictions,
      skillScores,
    };
  },
});
```

- [ ] **Step 2: Add an admin page only if useful**

Create `app/admin/forecast-experiment/page.js`:

```javascript
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function ForecastExperimentAdminPage() {
  const summary = useQuery(api.forecastExperiment.debugSummary);

  if (!summary) {
    return <main className="p-6">Loading forecast experiment...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">Forecast Experiment</h1>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Latest Predictions</h2>
        <pre className="mt-2 overflow-auto rounded border p-3 text-xs">
          {JSON.stringify(summary.predictions, null, 2)}
        </pre>
      </section>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Worker Runs</h2>
        <pre className="mt-2 overflow-auto rounded border p-3 text-xs">
          {JSON.stringify(summary.workerRuns, null, 2)}
        </pre>
      </section>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Skill Scores</h2>
        <pre className="mt-2 overflow-auto rounded border p-3 text-xs">
          {JSON.stringify(summary.skillScores, null, 2)}
        </pre>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Verify page locally if created**

Run:

```bash
npm run dev
```

Open:

```text
http://localhost:3010/admin/forecast-experiment
```

Expected: the page renders JSON summaries without touching production forecast pages.

- [ ] **Step 4: Commit**

```bash
git add convex/forecastExperiment.ts app/admin/forecast-experiment/page.js
git commit -m "feat: add forecast experiment debug summary"
```

Skip `app/admin/forecast-experiment/page.js` in the commit if the page was not created.

---

### Task 12: Operational Backfill And Acceptance Checks

**Files:**
- Create: `docs/forecast-experiment-runbook.md`

- [ ] **Step 1: Create runbook**

Create `docs/forecast-experiment-runbook.md`:

```markdown
# Forecast Experiment Runbook

## Purpose

The forecast experiment stores Cascais wingfoil model-run forecasts, observations, labels, skill metrics, and baseline predictions in Convex `fx_*` tables. It does not feed production forecast cards.

## Local Commands

```bash
npm run test:fx
npm run fx:fetch:openmeteo
npm run fx:fetch:observations
npm run fx:build-labels
npm run fx:score-models
npm run fx:predict
```

## Backfill

```bash
FX_BACKFILL_START_DATE=2026-05-01 FX_BACKFILL_END_DATE=2026-05-07 node scripts/fx-backfill-openmeteo-previous-runs.mjs
```

## Health Checks

- `fx_worker_runs` has recent successful rows for `fx-fetch-openmeteo-runs`, `fx-fetch-observations`, `fx-build-labels`, `fx-score-models`, and `fx-generate-predictions`.
- `fx_forecast_points` is growing every hour.
- `fx_observations` has Windguru rows every 5 minutes and IPMA rows hourly.
- `fx_daily_labels` has one row per target location per local date.
- `fx_predictions` has recent `baseline-ensemble-v1` rows.

## Rollback

Disable the Render `waterman-fx-*` services. Production app behavior remains unchanged because production pages do not read `fx_*` tables.
```

- [ ] **Step 2: Run full local acceptance**

Run:

```bash
npm run test:fx
npm run fx:fetch:observations
npm run fx:fetch:openmeteo
npm run fx:build-labels
npm run fx:score-models
npm run fx:predict
npm run build
```

Expected:
- All forecast experiment tests pass.
- All experiment scripts complete.
- `npm run build` succeeds or reports only unrelated pre-existing issues.
- No rows are inserted into `forecast_slots`, `condition_scores`, or `score_history` by experiment scripts.

- [ ] **Step 3: Verify table isolation**

Run a Convex dashboard or script check:

```javascript
const before = {
  forecast_slots: await client.query(api.spots.listForecastsForSpot, { spotId, sport: "wingfoil" }),
};
await import("./scripts/fx-fetch-observations.mjs");
const after = {
  forecast_slots: await client.query(api.spots.listForecastsForSpot, { spotId, sport: "wingfoil" }),
};
console.assert(before.forecast_slots.length === after.forecast_slots.length);
```

Expected: experiment scripts do not mutate production forecast tables.

- [ ] **Step 4: Commit**

```bash
git add docs/forecast-experiment-runbook.md
git commit -m "docs: add forecast experiment runbook"
```

---

## Phase 2 Options After V1 Runs For Two Weeks

Evaluate these only after V1 has useful data and worker health is stable:

- Add direct ECMWF Open Data GRIB ingestion with `ecmwf-opendata` and a Python/cfgrib worker if Open-Meteo model identity or latency is insufficient.
- Add NOAA NOMADS direct GFS subset ingestion if we need raw GFS fields not exposed by Open-Meteo.
- Add a calibration model trained from `fx_forecast_points` + `fx_daily_labels`, starting with deterministic logistic regression or gradient boosting outside Convex.
- Add trusted-user weights for user reports.
- Add production read-only surfacing once prediction reliability is calibrated.

## Final Verification Checklist

- `npx convex codegen` passes.
- `npm run test:fx` passes.
- All five experiment scripts run locally.
- Render has three new isolated services: `waterman-fx-openmeteo`, `waterman-fx-labels`, `waterman-fx-observations`.
- Convex has rows in all relevant `fx_*` tables.
- Production forecast pages still read the existing tables and render unchanged.
- The experiment can be disabled by turning off only `waterman-fx-*` services.
