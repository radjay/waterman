# Guincho blend research — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six blend-research threads (router, vote, weighted blend,
agreement-as-confidence, gustiness match, analog days) to the Guincho model
skill study, mostly as synthetic "virtual models" scored by the existing
session-match pipeline with zero changes to that pipeline's logic.

**Architecture:** A new file, `lib/forecast-experiment/guinchoBlendModels.js`,
holds one point-builder function per virtual model (router, vote, blend-mean3,
blend-weighted). Each synthesises extra forecast points in the exact shape
real Open-Meteo points already have. `scoreGuinchoModelSkill` calls all of
them and concatenates their output onto `openMeteoPoints` before indexing,
so every existing table, rank, slice, scatter, and spot-check function keeps
working unchanged — they only ever see model slugs, real or synthetic.
Threads 4–6 (confidence, gustiness, analog days) add new analysis functions
in their own files that read the same joined data but do not enter
`rankTuple`.

**Tech Stack:** Plain JS (no TypeScript in this codebase), Next.js App
Router, `node --test` for lib tests, Vitest for component/view tests,
existing kit components (`SkillTable`, `RankingBars`, `DetailsBlock`).

**Spec:** `docs/superpowers/specs/2026-08-27-guincho-blend-research-design.md`
(read this first — it has the "why" behind every rule below; this plan has
the "how")

## Global Constraints

- No new archive fetch. All six threads read the three JSONL files already
  on disk (`archive/jsonl/station_readings`, `.../forecast_slots_archive`,
  `.../openmeteo_guincho_previous_runs`).
- No Convex read or write. No change to the live Guincho forecast.
- `summary.winner` and `rankTuple`'s ranking of the four real models must be
  byte-for-byte unchanged by every task in this plan — verify with the
  existing test suite before and after each task that touches
  `guinchoModelSkill.js`.
- Router uses forecast-direction consensus only, never the station's
  observed direction (R6 in the spec) — using observed direction would leak
  the answer into the test.
- Vote/blend member models are always `GUINCHO_VOTE_MODELS = ["icon-eu",
  "icon-global", "gfs-global"]` (ECMWF excluded) — one named constant, not
  duplicated lists.
- Router tie-break model is `"icon-eu"` (`ROUTER_TIEBREAK_MODEL`).
- Vote models' stand-in wind value is derived **per rule, per hour**: max
  among go-voters on a go hour, min across all members on a no-go hour —
  see spec R10. This is the one place a naive implementation silently
  breaks `vote-any` vs `vote-majority` disagreement; the test in Task 3
  exists specifically to catch that.
- Every synthetic model slug carries `synthetic: true` through to the
  summary JSON (R4), so the UI can badge it "Rule" instead of "Open model".
- UI: theme tokens only, `font-data` for numbers, both themes
  (`?theme=night` / `?theme=day`) and both breakpoints (390px / 1440px)
  verified before a UI task is called done.

---

### Task 1: Virtual-model constants

**Files:**
- Modify: `lib/forecast-experiment/guinchoModelSkillConstants.js`
- Test: `tests/forecast-experiment/guinchoModelSkillConstants.test.mjs` (new)

**Interfaces:**
- Produces: `ROUTER_MODEL_SLUG`, `ROUTER_TIEBREAK_MODEL`, `VOTE_ANY_SLUG`,
  `VOTE_MAJORITY_SLUG`, `BLEND_MEAN3_SLUG`, `BLEND_WEIGHTED_SLUG`,
  `GUINCHO_VOTE_MODELS`, `VIRTUAL_MODEL_LABELS`, `VIRTUAL_MODEL_SLUGS` — all
  later tasks import these, never redeclare their own copies.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  BLEND_MEAN3_SLUG,
  BLEND_WEIGHTED_SLUG,
  GUINCHO_VOTE_MODELS,
  ROUTER_MODEL_SLUG,
  ROUTER_TIEBREAK_MODEL,
  VIRTUAL_MODEL_LABELS,
  VIRTUAL_MODEL_SLUGS,
  VOTE_ANY_SLUG,
  VOTE_MAJORITY_SLUG,
} from "../../lib/forecast-experiment/guinchoModelSkillConstants.js";

test("virtual model slugs and labels stay in sync", () => {
  assert.deepEqual(
    [...VIRTUAL_MODEL_SLUGS].sort(),
    [ROUTER_MODEL_SLUG, VOTE_ANY_SLUG, VOTE_MAJORITY_SLUG, BLEND_MEAN3_SLUG, BLEND_WEIGHTED_SLUG].sort()
  );
  for (const slug of VIRTUAL_MODEL_SLUGS) {
    assert.equal(typeof VIRTUAL_MODEL_LABELS[slug], "string");
  }
});

test("vote models exclude ECMWF and name the tiebreak model", () => {
  assert.deepEqual(GUINCHO_VOTE_MODELS, ["icon-eu", "icon-global", "gfs-global"]);
  assert.equal(ROUTER_TIEBREAK_MODEL, "icon-eu");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/forecast-experiment/guinchoModelSkillConstants.test.mjs`
Expected: FAIL — the new exports do not exist yet.

- [ ] **Step 3: Add the constants**

Append to `lib/forecast-experiment/guinchoModelSkillConstants.js`:

```js
// Virtual (synthetic) models -- Guincho blend research. See
// docs/superpowers/specs/2026-08-27-guincho-blend-research-design.md
export const ROUTER_MODEL_SLUG = "router-consensus";
export const ROUTER_TIEBREAK_MODEL = "icon-eu";
export const VOTE_ANY_SLUG = "vote-any";
export const VOTE_MAJORITY_SLUG = "vote-majority";
export const BLEND_MEAN3_SLUG = "blend-mean3";
export const BLEND_WEIGHTED_SLUG = "blend-weighted";
export const GUINCHO_VOTE_MODELS = ["icon-eu", "icon-global", "gfs-global"];
export const VIRTUAL_MODEL_LABELS = {
  [ROUTER_MODEL_SLUG]: "Router (direction)",
  [VOTE_ANY_SLUG]: "Vote (any of 3)",
  [VOTE_MAJORITY_SLUG]: "Vote (majority)",
  [BLEND_MEAN3_SLUG]: "Blend (mean of 3)",
  [BLEND_WEIGHTED_SLUG]: "Blend (weighted)",
};
export const VIRTUAL_MODEL_SLUGS = Object.keys(VIRTUAL_MODEL_LABELS);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/forecast-experiment/guinchoModelSkillConstants.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/forecast-experiment/guinchoModelSkillConstants.js tests/forecast-experiment/guinchoModelSkillConstants.test.mjs
git commit -m "feat: add virtual model constants for Guincho blend research"
```

---

### Task 2: Router (direction consensus)

**Files:**
- Create: `lib/forecast-experiment/guinchoBlendModels.js`
- Test: `tests/forecast-experiment/guinchoBlendModels.test.mjs` (new)

**Interfaces:**
- Consumes: `classifyWindRegime`, `WIND_REGIME_NORTADA` from
  `./modelSkillAnalysis.js`; `ROUTER_MODEL_SLUG`, `ROUTER_TIEBREAK_MODEL`,
  `GUINCHO_MODEL_SLUGS` from `./guinchoModelSkillConstants.js`. Points have
  the shape `{ model, leadDay, validTime, windSpeedKnots, windGustKnots,
  windDirectionDeg }` (same as `parsePreviousRunsHourly`'s output).
- Produces: `indexPointsByHour(points): Map<"leadDay:validTime", Map<model,
  point>>` and `buildRouterPoints(points, opts?): point[]` — both consumed
  by Task 3–6 and by Task 5's wiring into `guinchoModelSkill.js`.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { buildRouterPoints, indexPointsByHour } from "../../lib/forecast-experiment/guinchoBlendModels.js";
import { ROUTER_MODEL_SLUG } from "../../lib/forecast-experiment/guinchoModelSkillConstants.js";

function point(model, leadDay, validTime, { speed, gust, dir }) {
  return { model, leadDay, validTime, windSpeedKnots: speed, windGustKnots: gust, windDirectionDeg: dir };
}

test("indexPointsByHour groups by lead+time, model -> point", () => {
  const points = [point("icon-eu", 1, 100, { speed: 10, gust: 12, dir: 0 })];
  const byHour = indexPointsByHour(points);
  assert.equal(byHour.size, 1);
  assert.equal(byHour.get("1:100").get("icon-eu").windSpeedKnots, 10);
});

test("router picks ICON7 on a consensus-nortada hour", () => {
  const points = [
    point("ecmwf-ifs025", 1, 100, { speed: 20, gust: 24, dir: 350 }),
    point("icon-eu", 1, 100, { speed: 22, gust: 26, dir: 340 }),
    point("icon-global", 1, 100, { speed: 8, gust: 10, dir: 10 }),
    point("gfs-global", 1, 100, { speed: 21, gust: 25, dir: 355 }),
  ];
  const [routerPoint] = buildRouterPoints(points);
  assert.equal(routerPoint.model, ROUTER_MODEL_SLUG);
  assert.equal(routerPoint.windSpeedKnots, 22); // copied from icon-eu
});

test("router picks ICON13 on a consensus-other hour", () => {
  const points = [
    point("ecmwf-ifs025", 1, 100, { speed: 20, gust: 24, dir: 180 }),
    point("icon-eu", 1, 100, { speed: 22, gust: 26, dir: 340 }),
    point("icon-global", 1, 100, { speed: 15, gust: 18, dir: 190 }),
    point("gfs-global", 1, 100, { speed: 21, gust: 25, dir: 185 }),
  ];
  const [routerPoint] = buildRouterPoints(points);
  assert.equal(routerPoint.windSpeedKnots, 15); // copied from icon-global
});

test("router tie (2-2) defers to icon-eu's own classification", () => {
  const points = [
    point("ecmwf-ifs025", 1, 100, { speed: 20, gust: 24, dir: 0 }), // nortada
    point("icon-eu", 1, 100, { speed: 22, gust: 26, dir: 0 }), // nortada, tiebreak model
    point("icon-global", 1, 100, { speed: 15, gust: 18, dir: 180 }), // other
    point("gfs-global", 1, 100, { speed: 21, gust: 25, dir: 180 }), // other
  ];
  const [routerPoint] = buildRouterPoints(points);
  assert.equal(routerPoint.windSpeedKnots, 22); // icon-eu classified nortada -> icon-eu chosen
});

test("router skips an hour missing one of the four voting models", () => {
  const points = [
    point("icon-eu", 1, 100, { speed: 22, gust: 26, dir: 340 }),
    point("icon-global", 1, 100, { speed: 15, gust: 18, dir: 190 }),
    point("gfs-global", 1, 100, { speed: 21, gust: 25, dir: 185 }),
  ];
  assert.equal(buildRouterPoints(points).length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/forecast-experiment/guinchoBlendModels.test.mjs`
Expected: FAIL — `guinchoBlendModels.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

```js
import { classifyWindRegime, WIND_REGIME_NORTADA } from "./modelSkillAnalysis.js";
import { GUINCHO_MODEL_SLUGS, ROUTER_MODEL_SLUG, ROUTER_TIEBREAK_MODEL } from "./guinchoModelSkillConstants.js";

const ROUTER_PRIMARY_NORTADA = "icon-eu";
const ROUTER_PRIMARY_OTHER = "icon-global";

/** Group forecast points by lead day + valid time, model -> point. */
export function indexPointsByHour(points) {
  const byHour = new Map();
  for (const point of points ?? []) {
    const key = `${point.leadDay}:${point.validTime}`;
    if (!byHour.has(key)) byHour.set(key, new Map());
    byHour.get(key).set(point.model, point);
  }
  return byHour;
}

export function parseHourKey(key) {
  const [leadDay, validTime] = key.split(":");
  return { leadDay: Number(leadDay), validTime: Number(validTime) };
}

function copyPoint(model, leadDay, validTime, source) {
  return {
    model,
    leadDay,
    validTime,
    windSpeedKnots: source.windSpeedKnots,
    windGustKnots: source.windGustKnots,
    windDirectionDeg: source.windDirectionDeg,
  };
}

/**
 * Direction-consensus bucket for one hour: majority of `models`' own
 * forecast direction, classified nortada/other. A 2-2 tie defers to
 * ROUTER_TIEBREAK_MODEL. Returns null if any voting model is missing.
 */
export function consensusBucket(hourModels, models = GUINCHO_MODEL_SLUGS) {
  let nortadaVotes = 0;
  let otherVotes = 0;
  for (const model of models) {
    const point = hourModels.get(model);
    if (!point) return null;
    if (classifyWindRegime(point.windDirectionDeg) === WIND_REGIME_NORTADA) nortadaVotes += 1;
    else otherVotes += 1;
  }
  if (nortadaVotes > otherVotes) return "nortada";
  if (otherVotes > nortadaVotes) return "other";
  const tiebreak = hourModels.get(ROUTER_TIEBREAK_MODEL);
  return classifyWindRegime(tiebreak?.windDirectionDeg) === WIND_REGIME_NORTADA ? "nortada" : "other";
}

/**
 * Router: per hour, copy ICON7's point on a consensus-nortada hour,
 * ICON13's on a consensus-other hour. Consensus uses each model's OWN
 * forecast direction, never the station's -- a real router never knows
 * the true station direction ahead of time.
 */
export function buildRouterPoints(points, { models = GUINCHO_MODEL_SLUGS } = {}) {
  const byHour = indexPointsByHour(points);
  const routerPoints = [];
  for (const [key, hourModels] of byHour) {
    const bucket = consensusBucket(hourModels, models);
    if (!bucket) continue;
    const chosenModel = bucket === "nortada" ? ROUTER_PRIMARY_NORTADA : ROUTER_PRIMARY_OTHER;
    const chosen = hourModels.get(chosenModel);
    if (!chosen) continue;
    const { leadDay, validTime } = parseHourKey(key);
    routerPoints.push(copyPoint(ROUTER_MODEL_SLUG, leadDay, validTime, chosen));
  }
  return routerPoints;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/forecast-experiment/guinchoBlendModels.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/forecast-experiment/guinchoBlendModels.js tests/forecast-experiment/guinchoBlendModels.test.mjs
git commit -m "feat: add direction-consensus router for Guincho blend research"
```

---

### Task 3: Vote (any / majority)

**Files:**
- Modify: `lib/forecast-experiment/guinchoBlendModels.js`
- Modify: `tests/forecast-experiment/guinchoBlendModels.test.mjs`

**Interfaces:**
- Consumes: `indexPointsByHour`, `parseHourKey` (Task 2); `effectiveWindKnots`
  from `./units.js`; `GUINCHO_VOTE_MODELS`, `RIDEABLE_KNOTS`, `VOTE_ANY_SLUG`,
  `VOTE_MAJORITY_SLUG` from `./guinchoModelSkillConstants.js`.
- Produces: `buildVotePoints(points, opts?): point[]` (both slugs' points,
  concatenated) — consumed by Task 5's wiring.

- [ ] **Step 1: Write the failing test**

Append to `tests/forecast-experiment/guinchoBlendModels.test.mjs`:

```js
import { buildVotePoints } from "../../lib/forecast-experiment/guinchoBlendModels.js";
import { VOTE_ANY_SLUG, VOTE_MAJORITY_SLUG } from "../../lib/forecast-experiment/guinchoModelSkillConstants.js";

function votePointsByModel(points) {
  const byModel = {};
  for (const point of points) byModel[point.model] = point;
  return byModel;
}

test("vote-any fires when only one of three members is >= 12kt, vote-majority does not", () => {
  const points = [
    { model: "icon-eu", leadDay: 1, validTime: 100, windSpeedKnots: 14, windGustKnots: 16, windDirectionDeg: 340 },
    { model: "icon-global", leadDay: 1, validTime: 100, windSpeedKnots: 6, windGustKnots: 8, windDirectionDeg: 340 },
    { model: "gfs-global", leadDay: 1, validTime: 100, windSpeedKnots: 5, windGustKnots: 7, windDirectionDeg: 340 },
  ];
  const byModel = votePointsByModel(buildVotePoints(points));
  const anyEffective = (byModel[VOTE_ANY_SLUG].windSpeedKnots + byModel[VOTE_ANY_SLUG].windGustKnots) / 2;
  const majorityEffective = (byModel[VOTE_MAJORITY_SLUG].windSpeedKnots + byModel[VOTE_MAJORITY_SLUG].windGustKnots) / 2;
  assert.ok(anyEffective >= 12, `vote-any should read >= 12kt, got ${anyEffective}`);
  assert.ok(majorityEffective < 12, `vote-majority should read < 12kt, got ${majorityEffective}`);
});

test("vote-majority fires and matches vote-any when 2 of 3 members go", () => {
  const points = [
    { model: "icon-eu", leadDay: 1, validTime: 100, windSpeedKnots: 14, windGustKnots: 16, windDirectionDeg: 340 },
    { model: "icon-global", leadDay: 1, validTime: 100, windSpeedKnots: 13, windGustKnots: 15, windDirectionDeg: 340 },
    { model: "gfs-global", leadDay: 1, validTime: 100, windSpeedKnots: 5, windGustKnots: 7, windDirectionDeg: 340 },
  ];
  const byModel = votePointsByModel(buildVotePoints(points));
  const majorityEffective = (byModel[VOTE_MAJORITY_SLUG].windSpeedKnots + byModel[VOTE_MAJORITY_SLUG].windGustKnots) / 2;
  assert.ok(majorityEffective >= 12, `vote-majority should read >= 12kt, got ${majorityEffective}`);
});

test("vote-any reads < 12kt when no member goes", () => {
  const points = [
    { model: "icon-eu", leadDay: 1, validTime: 100, windSpeedKnots: 6, windGustKnots: 8, windDirectionDeg: 340 },
    { model: "icon-global", leadDay: 1, validTime: 100, windSpeedKnots: 5, windGustKnots: 7, windDirectionDeg: 340 },
    { model: "gfs-global", leadDay: 1, validTime: 100, windSpeedKnots: 4, windGustKnots: 6, windDirectionDeg: 340 },
  ];
  const byModel = votePointsByModel(buildVotePoints(points));
  const anyEffective = (byModel[VOTE_ANY_SLUG].windSpeedKnots + byModel[VOTE_ANY_SLUG].windGustKnots) / 2;
  assert.ok(anyEffective < 12, `vote-any should read < 12kt, got ${anyEffective}`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/forecast-experiment/guinchoBlendModels.test.mjs`
Expected: FAIL — `buildVotePoints` does not exist yet.

- [ ] **Step 3: Write the implementation**

Append to `lib/forecast-experiment/guinchoBlendModels.js` (add
`effectiveWindKnots` and the vote constants to the top-of-file import):

```js
import { effectiveWindKnots } from "./units.js";
import {
  GUINCHO_VOTE_MODELS,
  RIDEABLE_KNOTS,
  VOTE_ANY_SLUG,
  VOTE_MAJORITY_SLUG,
} from "./guinchoModelSkillConstants.js";
```

```js
function maxByEffective(points) {
  return points.reduce((best, point) => {
    if (!best) return point;
    return effectiveWindKnots(point) > effectiveWindKnots(best) ? point : best;
  }, null);
}

function minByEffective(points) {
  return points.reduce((worst, point) => {
    if (!worst) return point;
    return effectiveWindKnots(point) < effectiveWindKnots(worst) ? point : worst;
  }, null);
}

/**
 * Vote: call go if >= 1 member is >= 12kt (`vote-any`) or >= 2 of 3
 * (`vote-majority`). The stand-in wind value must cross 12kt in the same
 * direction as the vote itself, per rule, per hour, because downstream
 * scoring re-derives "called" from this value's own effective wind, not a
 * separate flag: on a go hour, use the max among go-voters (guaranteed
 * >= 12); on a no-go hour, use the min across all members (guaranteed
 * < 12, since fewer members went go than the rule needed).
 */
export function buildVotePoints(points, {
  models = GUINCHO_VOTE_MODELS,
  threshold = RIDEABLE_KNOTS,
} = {}) {
  const byHour = indexPointsByHour(points);
  const votePoints = [];
  for (const [key, hourModels] of byHour) {
    const memberPoints = models.map((model) => hourModels.get(model));
    if (memberPoints.some((point) => !point)) continue;
    const goMembers = memberPoints.filter((point) => effectiveWindKnots(point) >= threshold);
    const goCount = goMembers.length;
    const { leadDay, validTime } = parseHourKey(key);
    for (const [slug, minGo] of [[VOTE_ANY_SLUG, 1], [VOTE_MAJORITY_SLUG, 2]]) {
      const called = goCount >= minGo;
      const representative = called ? maxByEffective(goMembers) : minByEffective(memberPoints);
      votePoints.push(copyPoint(slug, leadDay, validTime, representative));
    }
  }
  return votePoints;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/forecast-experiment/guinchoBlendModels.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/forecast-experiment/guinchoBlendModels.js tests/forecast-experiment/guinchoBlendModels.test.mjs
git commit -m "feat: add vote-any/vote-majority blend models for Guincho blend research"
```

---

### Task 4: Blend-mean3 (equal-weight average)

**Files:**
- Modify: `lib/forecast-experiment/guinchoBlendModels.js`
- Modify: `tests/forecast-experiment/guinchoBlendModels.test.mjs`

**Interfaces:**
- Consumes: `indexPointsByHour`, `parseHourKey` (Task 2);
  `GUINCHO_VOTE_MODELS`, `BLEND_MEAN3_SLUG`.
- Produces: `buildBlendMean3Points(points, opts?): point[]`.

- [ ] **Step 1: Write the failing test**

```js
import { buildBlendMean3Points } from "../../lib/forecast-experiment/guinchoBlendModels.js";
import { BLEND_MEAN3_SLUG } from "../../lib/forecast-experiment/guinchoModelSkillConstants.js";

test("blend-mean3 is the plain mean of its three members", () => {
  const points = [
    { model: "icon-eu", leadDay: 1, validTime: 100, windSpeedKnots: 12, windGustKnots: 18, windDirectionDeg: 340 },
    { model: "icon-global", leadDay: 1, validTime: 100, windSpeedKnots: 15, windGustKnots: 21, windDirectionDeg: 340 },
    { model: "gfs-global", leadDay: 1, validTime: 100, windSpeedKnots: 18, windGustKnots: 24, windDirectionDeg: 340 },
  ];
  const [blendPoint] = buildBlendMean3Points(points);
  assert.equal(blendPoint.model, BLEND_MEAN3_SLUG);
  assert.equal(blendPoint.windSpeedKnots, 15); // (12+15+18)/3
  assert.equal(blendPoint.windGustKnots, 21); // (18+21+24)/3
});

test("blend-mean3 skips an hour missing one of the three members", () => {
  const points = [
    { model: "icon-eu", leadDay: 1, validTime: 100, windSpeedKnots: 12, windGustKnots: 18, windDirectionDeg: 340 },
    { model: "icon-global", leadDay: 1, validTime: 100, windSpeedKnots: 15, windGustKnots: 21, windDirectionDeg: 340 },
  ];
  assert.equal(buildBlendMean3Points(points).length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/forecast-experiment/guinchoBlendModels.test.mjs`
Expected: FAIL — `buildBlendMean3Points` does not exist yet.

- [ ] **Step 3: Write the implementation**

Append to `lib/forecast-experiment/guinchoBlendModels.js` (add
`BLEND_MEAN3_SLUG` to the constants import):

```js
function round1(value) {
  return Math.round(value * 10) / 10;
}

function meanField(points, field) {
  const values = points.map((point) => point[field]).filter(Number.isFinite);
  if (!values.length) return undefined;
  return round1(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** Equal-weight mean of the three vote members' wind, per hour. */
export function buildBlendMean3Points(points, { models = GUINCHO_VOTE_MODELS } = {}) {
  const byHour = indexPointsByHour(points);
  const blendPoints = [];
  for (const [key, hourModels] of byHour) {
    const memberPoints = models.map((model) => hourModels.get(model));
    if (memberPoints.some((point) => !point)) continue;
    const { leadDay, validTime } = parseHourKey(key);
    blendPoints.push({
      model: BLEND_MEAN3_SLUG,
      leadDay,
      validTime,
      windSpeedKnots: meanField(memberPoints, "windSpeedKnots"),
      windGustKnots: meanField(memberPoints, "windGustKnots"),
      windDirectionDeg: memberPoints[0].windDirectionDeg,
    });
  }
  return blendPoints;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/forecast-experiment/guinchoBlendModels.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/forecast-experiment/guinchoBlendModels.js tests/forecast-experiment/guinchoBlendModels.test.mjs
git commit -m "feat: add blend-mean3 equal-weight blend for Guincho blend research"
```

---

### Task 5: Wire router / vote / blend-mean3 into the scoring pipeline

**Files:**
- Modify: `lib/forecast-experiment/guinchoModelSkill.js`
- Modify: `tests/forecast-experiment/guinchoModelSkill.test.mjs`

**Interfaces:**
- Consumes: `buildRouterPoints`, `buildVotePoints`, `buildBlendMean3Points`
  from `./guinchoBlendModels.js`; `VIRTUAL_MODEL_SLUGS`,
  `VIRTUAL_MODEL_LABELS` from `./guinchoModelSkillConstants.js`.
- Produces: `scoreGuinchoModelSkill(...)`'s return now also has
  `blendLeaderboard.byLead[leadDay]` (`{ hours, rows }`, `rows` sorted by
  the existing unchanged `rankTuple`) and every row in that table carries
  `synthetic: true` when the model is a virtual one. `summary.labels`
  includes the virtual labels. `summary.winner` is unchanged — it is still
  built only from `day1Peers`, the original four real models.

- [ ] **Step 1: Write the failing test**

Append to `tests/forecast-experiment/guinchoModelSkill.test.mjs`:

```js
import { ROUTER_MODEL_SLUG, VOTE_ANY_SLUG } from "../../lib/forecast-experiment/guinchoModelSkillConstants.js";

test("scoreGuinchoModelSkill adds a blend leaderboard without changing the real winner", () => {
  const observations = [];
  const openMeteoPoints = [];
  const models = ["ecmwf-ifs025", "icon-eu", "icon-global", "gfs-global"];
  for (let day = 0; day < 20; day += 1) {
    const dateLocal = `2025-08-${String(day + 1).padStart(2, "0")}`;
    for (let hour = 7; hour <= 22; hour += 1) {
      const validTime = hourMs(dateLocal, hour);
      const speed = day % 2 === 0 ? 16 : 6; // half the days are real sessions
      observations.push({ observedAt: validTime, speed, gust: speed + 4, direction: 340 });
      for (const model of models) {
        openMeteoPoints.push({
          model,
          leadDay: 1,
          validTime,
          windSpeedKnots: speed,
          windGustKnots: speed + 4,
          windDirectionDeg: 340,
        });
      }
    }
  }
  const before = scoreGuinchoModelSkill({ observations, openMeteoPoints });
  const after = scoreGuinchoModelSkill({ observations, openMeteoPoints });
  assert.deepEqual(before.winner, after.winner); // deterministic, unaffected by virtual models
  const leaderboardRows = after.blendLeaderboard.byLead[1].rows;
  const slugs = leaderboardRows.map((row) => row.model);
  assert.ok(slugs.includes(ROUTER_MODEL_SLUG));
  assert.ok(slugs.includes(VOTE_ANY_SLUG));
  const routerRow = leaderboardRows.find((row) => row.model === ROUTER_MODEL_SLUG);
  assert.equal(routerRow.synthetic, true);
  const realRow = leaderboardRows.find((row) => row.model === "icon-eu");
  assert.equal(realRow.synthetic, undefined);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/forecast-experiment/guinchoModelSkill.test.mjs`
Expected: FAIL — `blendLeaderboard` is undefined.

- [ ] **Step 3: Wire the virtual points into `scoreGuinchoModelSkill`**

Add to the top-of-file imports in `lib/forecast-experiment/guinchoModelSkill.js`:

```js
import { buildBlendMean3Points, buildRouterPoints, buildVotePoints } from "./guinchoBlendModels.js";
import { VIRTUAL_MODEL_LABELS, VIRTUAL_MODEL_SLUGS } from "./guinchoModelSkillConstants.js";
```

Replace the single line
`const forecastIndex = indexForecast(openMeteoPoints);`
inside `scoreGuinchoModelSkill` with:

```js
  const virtualPoints = [
    ...buildRouterPoints(openMeteoPoints),
    ...buildVotePoints(openMeteoPoints),
    ...buildBlendMean3Points(openMeteoPoints),
  ];
  const forecastIndex = indexForecast([...openMeteoPoints, ...virtualPoints]);
```

Update `rowFromPairs` to stamp the synthetic flag — change its signature
and return to:

```js
function rowFromPairs(model, pairs, { contextOnly = false } = {}) {
  ...
  return {
    model,
    label: modelLabel(model),
    synthetic: VIRTUAL_MODEL_SLUGS.includes(model) || undefined,
    ...
```

(Insert the `synthetic` line right after `label:` — every other field in
that object stays as-is.)

Update `modelLabel` to also resolve virtual slugs:

```js
export function modelLabel(slug) {
  if (slug === WINDY_MODEL) return "Windy blended";
  if (VIRTUAL_MODEL_LABELS[slug]) return VIRTUAL_MODEL_LABELS[slug];
  return GUINCHO_MODELS.find((model) => model.slug === slug)?.windyLabel ?? slug;
}
```

Add a `blendLeaderboard` block to `scoreGuinchoModelSkill`'s return, built
from a peer set that includes the virtual slugs. Insert right before the
`return { ... }` statement at the end of the function:

```js
  const blendLeaderboard = { byLead: {} };
  for (const leadDay of [0, 1, 2]) {
    const combinedPeerSet = peerSetForLead(forecastIndex, leadDay, [
      ...GUINCHO_MODEL_SLUGS,
      ...VIRTUAL_MODEL_SLUGS,
    ]);
    blendLeaderboard.byLead[leadDay] = tableFor(observedHours, forecastIndex, combinedPeerSet, leadDay);
  }
```

Add `blendLeaderboard,` to the final returned object, and add the virtual
labels to the existing `labels` map:

```js
    labels: Object.fromEntries([
      ...GUINCHO_MODELS.map((model) => [model.slug, model.windyLabel]),
      [WINDY_MODEL, "Windy blended"],
      ...Object.entries(VIRTUAL_MODEL_LABELS),
    ]),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/forecast-experiment/guinchoModelSkill.test.mjs`
Expected: PASS. Also run the full existing suite to confirm no regression:

```bash
node --test tests/forecast-experiment/guinchoModelSkill.test.mjs
npx vitest run app/experiment/guincho-model-skill
```

Expected: all PASS, identical to pre-Task-5 results for every existing
assertion (the winner and real-model rankings must not move).

- [ ] **Step 5: Commit**

```bash
git add lib/forecast-experiment/guinchoModelSkill.js tests/forecast-experiment/guinchoModelSkill.test.mjs
git commit -m "feat: wire router/vote/blend-mean3 into the Guincho scoring pipeline"
```

---

### Task 6: Blend-weighted (direction-weighted average)

**Files:**
- Modify: `lib/forecast-experiment/guinchoBlendModels.js`
- Modify: `lib/forecast-experiment/guinchoModelSkill.js`
- Modify: `tests/forecast-experiment/guinchoBlendModels.test.mjs`

**Interfaces:**
- Consumes: `consensusBucket` (Task 2, exported); `WIND_REGIME_NORTADA`,
  `WIND_REGIME_NON_NORTADA` from `./modelSkillAnalysis.js`;
  `GUINCHO_VOTE_MODELS`, `RIDEABLE_KNOTS`, `SESSION_MIN_HOURS`,
  `BLEND_WEIGHTED_SLUG`, `GUINCHO_MODEL_SLUGS`.
- Produces: `computeDirectionWeights(observedHours, realForecastIndex,
  opts?): { nortada: {model: weight}, other: {model: weight} }` and
  `buildWeightedBlendPoints(points, weights, opts?): point[]`.

Weights are historical constants (each vote member's own session F1 in that
station-observed regime, normalised to sum to 1) — computing them from
station-observed direction is fine, because they are derived **once** from
the whole archive and then applied uniformly going forward; only the
**per-hour choice of which weight set to apply** must come from
forecast-only data, which is why `buildWeightedBlendPoints` uses
`consensusBucket` (forecast-direction consensus), not the station's regime.

- [ ] **Step 1: Write the failing test**

Append to `tests/forecast-experiment/guinchoBlendModels.test.mjs`:

```js
import { buildWeightedBlendPoints, computeDirectionWeights } from "../../lib/forecast-experiment/guinchoBlendModels.js";
import { BLEND_WEIGHTED_SLUG } from "../../lib/forecast-experiment/guinchoModelSkillConstants.js";

test("computeDirectionWeights normalises each bucket's weights to sum to 1", () => {
  const observedHours = [
    { dateLocal: "2025-08-01", regime: "nortada", validTime: 100, effectiveWindKnots: 14 },
    { dateLocal: "2025-08-02", regime: "non-nortada", validTime: 200, effectiveWindKnots: 6 },
  ];
  const realForecastIndex = new Map([
    ["icon-eu:1:100", { windSpeedKnots: 14, windGustKnots: 16, effectiveWindKnots: 15 }],
    ["icon-global:1:100", { windSpeedKnots: 6, windGustKnots: 8, effectiveWindKnots: 7 }],
    ["gfs-global:1:100", { windSpeedKnots: 6, windGustKnots: 8, effectiveWindKnots: 7 }],
    ["icon-eu:1:200", { windSpeedKnots: 6, windGustKnots: 8, effectiveWindKnots: 7 }],
    ["icon-global:1:200", { windSpeedKnots: 6, windGustKnots: 8, effectiveWindKnots: 7 }],
    ["gfs-global:1:200", { windSpeedKnots: 6, windGustKnots: 8, effectiveWindKnots: 7 }],
  ]);
  const weights = computeDirectionWeights(observedHours, realForecastIndex);
  for (const bucket of ["nortada", "other"]) {
    const total = Object.values(weights[bucket]).reduce((sum, value) => sum + value, 0);
    assert.ok(Math.abs(total - 1) < 1e-6, `${bucket} weights should sum to 1, got ${total}`);
  }
});

test("blend-weighted applies nortada weights on a consensus-nortada hour", () => {
  const points = [
    { model: "ecmwf-ifs025", leadDay: 1, validTime: 100, windSpeedKnots: 10, windGustKnots: 12, windDirectionDeg: 340 },
    { model: "icon-eu", leadDay: 1, validTime: 100, windSpeedKnots: 20, windGustKnots: 24, windDirectionDeg: 340 },
    { model: "icon-global", leadDay: 1, validTime: 100, windSpeedKnots: 10, windGustKnots: 12, windDirectionDeg: 340 },
    { model: "gfs-global", leadDay: 1, validTime: 100, windSpeedKnots: 10, windGustKnots: 12, windDirectionDeg: 340 },
  ];
  const weights = { nortada: { "icon-eu": 1, "icon-global": 0, "gfs-global": 0 }, other: { "icon-eu": 0, "icon-global": 1, "gfs-global": 0 } };
  const [blendPoint] = buildWeightedBlendPoints(points, weights);
  assert.equal(blendPoint.model, BLEND_WEIGHTED_SLUG);
  assert.equal(blendPoint.windSpeedKnots, 20); // all weight on icon-eu
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/forecast-experiment/guinchoBlendModels.test.mjs`
Expected: FAIL — neither function exists yet.

- [ ] **Step 3: Write the implementation**

Append to `lib/forecast-experiment/guinchoBlendModels.js` (add
`WIND_REGIME_NORTADA, WIND_REGIME_NON_NORTADA` and
`SESSION_MIN_HOURS, BLEND_WEIGHTED_SLUG` to the imports):

```js
function pairsFromRealIndex(observedHours, realForecastIndex, model, leadDay) {
  const pairs = [];
  for (const hour of observedHours) {
    const forecast = realForecastIndex.get(`${model}:${leadDay}:${hour.validTime}`);
    if (!forecast || !Number.isFinite(forecast.windSpeedKnots) && !Number.isFinite(forecast.windGustKnots)) continue;
    const forecastEffective =
      forecast.effectiveWindKnots ??
      (Number.isFinite(forecast.windSpeedKnots) && Number.isFinite(forecast.windGustKnots)
        ? (forecast.windSpeedKnots + forecast.windGustKnots) / 2
        : (forecast.windSpeedKnots ?? forecast.windGustKnots));
    if (!Number.isFinite(forecastEffective)) continue;
    pairs.push({ dateLocal: hour.dateLocal, observedEffective: hour.effectiveWindKnots, forecastEffective });
  }
  return pairs;
}

function sessionF1ForPairs(pairs, { threshold = 12, sessionMinHours = SESSION_MIN_HOURS } = {}) {
  const byDate = new Map();
  for (const pair of pairs) {
    if (!byDate.has(pair.dateLocal)) byDate.set(pair.dateLocal, { called: 0, actual: 0 });
    const day = byDate.get(pair.dateLocal);
    if (pair.forecastEffective >= threshold) day.called += 1;
    if (pair.observedEffective >= threshold) day.actual += 1;
  }
  let actualDays = 0;
  let calledDays = 0;
  let hitDays = 0;
  for (const day of byDate.values()) {
    const actual = day.actual >= sessionMinHours;
    const called = day.called >= sessionMinHours;
    if (actual) actualDays += 1;
    if (called) calledDays += 1;
    if (actual && called) hitDays += 1;
  }
  const precision = calledDays ? hitDays / calledDays : 0;
  const recall = actualDays ? hitDays / actualDays : 0;
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

/**
 * Per-bucket blend weights: each vote member's own historical session F1 in
 * that station-observed direction regime, normalised to sum to 1. These are
 * constants derived once from the whole archive -- using station-observed
 * regime here does not leak anything into any forecast, because the weight
 * VALUES are applied uniformly going forward; only the per-hour CHOICE of
 * which weight set to use must come from forecast data (see
 * buildWeightedBlendPoints, which uses consensusBucket for that).
 */
export function computeDirectionWeights(observedHours, realForecastIndex, {
  models = GUINCHO_VOTE_MODELS,
  leadDay = 1,
} = {}) {
  const weights = { nortada: {}, other: {} };
  for (const [bucket, regime] of [["nortada", WIND_REGIME_NORTADA], ["other", WIND_REGIME_NON_NORTADA]]) {
    const hours = observedHours.filter((hour) => hour.regime === regime);
    const scores = models.map((model) => sessionF1ForPairs(pairsFromRealIndex(hours, realForecastIndex, model, leadDay)));
    const total = scores.reduce((sum, value) => sum + value, 0);
    models.forEach((model, index) => {
      weights[bucket][model] = total > 0 ? scores[index] / total : 1 / models.length;
    });
  }
  return weights;
}

/** Weighted average of the three vote members, weight set chosen per hour by forecast-direction consensus. */
export function buildWeightedBlendPoints(points, weights, {
  models = GUINCHO_VOTE_MODELS,
  directionModels = GUINCHO_MODEL_SLUGS,
} = {}) {
  const byHour = indexPointsByHour(points);
  const blendPoints = [];
  for (const [key, hourModels] of byHour) {
    const memberPoints = models.map((model) => hourModels.get(model));
    if (memberPoints.some((point) => !point)) continue;
    const bucket = consensusBucket(hourModels, directionModels);
    if (!bucket) continue;
    const bucketWeights = weights[bucket];
    const totalWeight = models.reduce((sum, model) => sum + (bucketWeights[model] ?? 0), 0) || 1;
    const weightedField = (field) =>
      round1(
        models.reduce((sum, model, index) => {
          const value = memberPoints[index]?.[field];
          if (!Number.isFinite(value)) return sum;
          return sum + value * ((bucketWeights[model] ?? 0) / totalWeight);
        }, 0)
      );
    const { leadDay, validTime } = parseHourKey(key);
    blendPoints.push({
      model: BLEND_WEIGHTED_SLUG,
      leadDay,
      validTime,
      windSpeedKnots: weightedField("windSpeedKnots"),
      windGustKnots: weightedField("windGustKnots"),
      windDirectionDeg: memberPoints[0].windDirectionDeg,
    });
  }
  return blendPoints;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/forecast-experiment/guinchoBlendModels.test.mjs`
Expected: PASS

- [ ] **Step 5: Wire it into `scoreGuinchoModelSkill`**

In `lib/forecast-experiment/guinchoModelSkill.js`, add
`buildWeightedBlendPoints, computeDirectionWeights` to the
`guinchoBlendModels.js` import, then replace the block from Task 5 with a
two-pass version — build the real index first, derive weights, then add
both the simple virtual points and the weighted blend before the final
index:

```js
  const realForecastIndex = indexForecast(openMeteoPoints);
  const directionWeights = computeDirectionWeights(observedHours, realForecastIndex);
  const simpleVirtualPoints = [
    ...buildRouterPoints(openMeteoPoints),
    ...buildVotePoints(openMeteoPoints),
    ...buildBlendMean3Points(openMeteoPoints),
  ];
  const weightedBlendPoints = buildWeightedBlendPoints(openMeteoPoints, directionWeights);
  const forecastIndex = indexForecast([...openMeteoPoints, ...simpleVirtualPoints, ...weightedBlendPoints]);
```

(This replaces the single-pass block added in Task 5's Step 3 — the
`realForecastIndex` build is cheap, it is the same `indexForecast` call on
just the real points, run once before weights are known.)

- [ ] **Step 6: Run the full suite to verify no regression**

```bash
node --test tests/forecast-experiment/guinchoModelSkill.test.mjs tests/forecast-experiment/guinchoBlendModels.test.mjs
npx vitest run app/experiment/guincho-model-skill
```

Expected: all PASS, winner unchanged.

- [ ] **Step 7: Commit**

```bash
git add lib/forecast-experiment/guinchoBlendModels.js lib/forecast-experiment/guinchoModelSkill.js tests/forecast-experiment/guinchoBlendModels.test.mjs
git commit -m "feat: add direction-weighted blend for Guincho blend research"
```

---

### Task 7: Gustiness match

**Files:**
- Create: `lib/forecast-experiment/guinchoGustiness.js`
- Test: `tests/forecast-experiment/guinchoGustiness.test.mjs` (new)
- Modify: `lib/forecast-experiment/guinchoModelSkill.js`
- Modify: `tests/forecast-experiment/guinchoModelSkill.test.mjs`

**Interfaces:**
- Produces: `gustinessRatio(point): number|undefined`,
  `computeGustinessSkill(pairs): { gustinessMae, gustinessBias,
  gustinessHours }`. Every row from `rowFromPairs` (real and virtual alike)
  gains `gustinessMae` / `gustinessBias`, computed on rideable pairs only.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { computeGustinessSkill, gustinessRatio } from "../../lib/forecast-experiment/guinchoGustiness.js";

test("gustinessRatio is gust/speed, undefined when speed is 0 or missing", () => {
  assert.equal(gustinessRatio({ windSpeedKnots: 10, windGustKnots: 15 }), 1.5);
  assert.equal(gustinessRatio({ windSpeedKnots: 0, windGustKnots: 15 }), undefined);
  assert.equal(gustinessRatio({ windSpeedKnots: 10, windGustKnots: undefined }), undefined);
});

test("computeGustinessSkill reports MAE and bias of the ratio gap", () => {
  const pairs = [
    { observed: { windSpeedKnots: 10, windGustKnots: 15 }, forecast: { windSpeedKnots: 10, windGustKnots: 12 } }, // obs 1.5, fc 1.2 -> abs 0.3, signed -0.3
    { observed: { windSpeedKnots: 10, windGustKnots: 15 }, forecast: { windSpeedKnots: 10, windGustKnots: 18 } }, // obs 1.5, fc 1.8 -> abs 0.3, signed +0.3
  ];
  const result = computeGustinessSkill(pairs);
  assert.equal(result.gustinessHours, 2);
  assert.equal(result.gustinessMae, 0.3);
  assert.equal(result.gustinessBias, 0);
});

test("computeGustinessSkill skips pairs with no usable ratio", () => {
  const pairs = [{ observed: { windSpeedKnots: 0, windGustKnots: 15 }, forecast: { windSpeedKnots: 10, windGustKnots: 12 } }];
  const result = computeGustinessSkill(pairs);
  assert.equal(result.gustinessHours, 0);
  assert.equal(result.gustinessMae, undefined);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/forecast-experiment/guinchoGustiness.test.mjs`
Expected: FAIL — the file does not exist yet.

- [ ] **Step 3: Write the implementation**

```js
function round2(value) {
  return Math.round(value * 100) / 100;
}

/** Gustiness ratio = gust / speed. Undefined when speed is missing/zero or gust is missing. */
export function gustinessRatio({ windSpeedKnots, windGustKnots } = {}) {
  if (!Number.isFinite(windSpeedKnots) || windSpeedKnots <= 0) return undefined;
  if (!Number.isFinite(windGustKnots)) return undefined;
  return windGustKnots / windSpeedKnots;
}

/** MAE and bias of gustiness ratio, forecast vs observed, over the given pairs. */
export function computeGustinessSkill(pairs) {
  let sumAbs = 0;
  let sumSigned = 0;
  let count = 0;
  for (const pair of pairs) {
    const observedRatio = gustinessRatio(pair.observed);
    const forecastRatio = gustinessRatio(pair.forecast);
    if (!Number.isFinite(observedRatio) || !Number.isFinite(forecastRatio)) continue;
    sumAbs += Math.abs(forecastRatio - observedRatio);
    sumSigned += forecastRatio - observedRatio;
    count += 1;
  }
  if (!count) return { gustinessMae: undefined, gustinessBias: undefined, gustinessHours: 0 };
  return {
    gustinessMae: round2(sumAbs / count),
    gustinessBias: round2(sumSigned / count),
    gustinessHours: count,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/forecast-experiment/guinchoGustiness.test.mjs`
Expected: PASS

- [ ] **Step 5: Wire it into `rowFromPairs`**

In `lib/forecast-experiment/guinchoModelSkill.js`, add the import:

```js
import { computeGustinessSkill } from "./guinchoGustiness.js";
```

Inside `rowFromPairs`, filter to rideable pairs (station effective wind
>= 12 kt, per spec R17 — a calm hour's gust ratio is noise) and compute the
skill, then add the two fields to the returned row:

```js
function rowFromPairs(model, pairs, { contextOnly = false } = {}) {
  const overall = computeSkillMetrics(pairs);
  ...
  const gustiness = computeGustinessSkill(pairs.filter((pair) => pair.observed?.effectiveWindKnots >= RIDEABLE_KNOTS));
  return {
    model,
    label: modelLabel(model),
    synthetic: VIRTUAL_MODEL_SLUGS.includes(model) || undefined,
    ...
    gustinessMae: gustiness.gustinessMae,
    gustinessBias: gustiness.gustinessBias,
    gustinessHours: gustiness.gustinessHours,
    ...
```

(Add these three fields anywhere in the returned object — they do not
affect `rankTuple`, which reads none of them.)

- [ ] **Step 6: Add an integration test and run the full suite**

Append to `tests/forecast-experiment/guinchoModelSkill.test.mjs`:

```js
test("session rows carry gustiness fields without changing rankTuple order", () => {
  const observations = [{ observedAt: hourMs("2025-08-01", 12), speed: 14, gust: 20, direction: 340 }];
  const openMeteoPoints = [
    { model: "icon-eu", leadDay: 1, validTime: hourMs("2025-08-01", 12), windSpeedKnots: 14, windGustKnots: 18, windDirectionDeg: 340 },
  ];
  const result = scoreGuinchoModelSkill({ observations, openMeteoPoints });
  const row = result.fullSeries.byLead[1].all.rows.find((r) => r.model === "icon-eu");
  assert.equal(typeof row.gustinessMae, "number");
});
```

```bash
node --test tests/forecast-experiment/guinchoGustiness.test.mjs tests/forecast-experiment/guinchoModelSkill.test.mjs
npx vitest run app/experiment/guincho-model-skill
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/forecast-experiment/guinchoGustiness.js lib/forecast-experiment/guinchoModelSkill.js tests/forecast-experiment/guinchoGustiness.test.mjs tests/forecast-experiment/guinchoModelSkill.test.mjs
git commit -m "feat: score gustiness ratio match alongside session skill"
```

---

### Task 8: Agreement as a confidence signal

**Files:**
- Create: `lib/forecast-experiment/guinchoConfidence.js`
- Test: `tests/forecast-experiment/guinchoConfidence.test.mjs` (new)
- Modify: `lib/forecast-experiment/guinchoModelSkill.js`

**Interfaces:**
- Produces: `computeAgreementReliability(observedHours, forecastIndex,
  leadDay, opts?): Array<{ agreementBucket, days, falseGoDayPct,
  missedPct }>`. Wired into `scoreGuinchoModelSkill`'s return as
  `confidence.byLead[leadDay]`.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { computeAgreementReliability } from "../../lib/forecast-experiment/guinchoConfidence.js";

function hour(dateLocal, validTime, effectiveWindKnots) {
  return { dateLocal, validTime, effectiveWindKnots };
}

function fc(model, leadDay, validTime, speed, gust) {
  return [`${model}:${leadDay}:${validTime}`, { windSpeedKnots: speed, windGustKnots: gust }];
}

test("unanimous session days show zero false calls; split days show some", () => {
  const observedHours = [];
  const entries = [];
  // Day A: all 3 models call it, station really is a session (4 hours, unanimous)
  for (let h = 0; h < 4; h += 1) {
    const t = 1000 + h;
    observedHours.push(hour("2025-08-01", t, 16));
    entries.push(fc("icon-eu", 1, t, 16, 20), fc("icon-global", 1, t, 16, 20), fc("gfs-global", 1, t, 16, 20));
  }
  // Day B: only 1 of 3 models calls it, station never reaches 12kt (false call, split agreement)
  for (let h = 0; h < 4; h += 1) {
    const t = 2000 + h;
    observedHours.push(hour("2025-08-02", t, 6));
    entries.push(fc("icon-eu", 1, t, 14, 16), fc("icon-global", 1, t, 4, 6), fc("gfs-global", 1, t, 4, 6));
  }
  const forecastIndex = new Map(entries);
  const buckets = computeAgreementReliability(observedHours, forecastIndex, 1);
  const unanimous = buckets.find((b) => b.agreementBucket === "3");
  const noCall = buckets.find((b) => b.agreementBucket === "no-call");
  assert.equal(unanimous.falseGoDayPct, 0);
  assert.ok(!noCall, "day B never reaches majority, so it is not a called day at all");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/forecast-experiment/guinchoConfidence.test.mjs`
Expected: FAIL — the file does not exist yet.

- [ ] **Step 3: Write the implementation**

```js
import { GUINCHO_VOTE_MODELS, RIDEABLE_KNOTS, SESSION_MIN_HOURS } from "./guinchoModelSkillConstants.js";

function round1(value) {
  return Math.round(value * 10) / 10;
}

function hourEffective(forecast) {
  const speed = forecast?.windSpeedKnots;
  const gust = forecast?.windGustKnots;
  if (Number.isFinite(speed) && Number.isFinite(gust)) return (speed + gust) / 2;
  if (Number.isFinite(speed)) return speed;
  if (Number.isFinite(gust)) return gust;
  return undefined;
}

/**
 * Buckets session days by how many of the three vote members called the
 * day's go hours (unanimous "3" / majority "2" / single dissent "1" /
 * "no-call" when the majority never reaches SESSION_MIN_HOURS), and reports
 * the false-call and miss rate within each bucket, using majority vote
 * (>= 2 of 3 per hour) as the day's official call.
 */
export function computeAgreementReliability(observedHours, forecastIndex, leadDay, {
  models = GUINCHO_VOTE_MODELS,
  threshold = RIDEABLE_KNOTS,
  sessionMinHours = SESSION_MIN_HOURS,
} = {}) {
  const byDate = new Map();
  for (const hour of observedHours) {
    const perModelGo = models.map((model) => {
      const forecast = forecastIndex.get(`${model}:${leadDay}:${hour.validTime}`);
      const effective = hourEffective(forecast);
      return Number.isFinite(effective) ? effective >= threshold : null;
    });
    if (perModelGo.some((value) => value === null)) continue;
    if (!byDate.has(hour.dateLocal)) byDate.set(hour.dateLocal, { agreementCounts: [], majorityGoHours: 0, actualGoHours: 0 });
    const day = byDate.get(hour.dateLocal);
    const goCount = perModelGo.filter(Boolean).length;
    day.agreementCounts.push(goCount);
    if (goCount >= 2) day.majorityGoHours += 1;
    if (hour.effectiveWindKnots >= threshold) day.actualGoHours += 1;
  }

  const byBucket = new Map();
  for (const day of byDate.values()) {
    const called = day.majorityGoHours >= sessionMinHours;
    const actual = day.actualGoHours >= sessionMinHours;
    if (!called && !actual) continue;
    const bucketKey = called ? String(mode(day.agreementCounts.filter((count) => count >= 2))) : "no-call";
    if (!byBucket.has(bucketKey)) byBucket.set(bucketKey, { days: 0, falseGoDays: 0, missedDays: 0 });
    const bucket = byBucket.get(bucketKey);
    bucket.days += 1;
    if (called && !actual) bucket.falseGoDays += 1;
    if (actual && !called) bucket.missedDays += 1;
  }

  return [...byBucket.entries()]
    .map(([agreementBucket, stats]) => ({
      agreementBucket,
      days: stats.days,
      falseGoDayPct: stats.days ? round1((100 * stats.falseGoDays) / stats.days) : undefined,
      missedPct: stats.days ? round1((100 * stats.missedDays) / stats.days) : undefined,
    }))
    .sort((a, b) => a.agreementBucket.localeCompare(b.agreementBucket));
}

function mode(values) {
  if (!values.length) return undefined;
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/forecast-experiment/guinchoConfidence.test.mjs`
Expected: PASS

- [ ] **Step 5: Wire it into `scoreGuinchoModelSkill`**

In `lib/forecast-experiment/guinchoModelSkill.js`, add:

```js
import { computeAgreementReliability } from "./guinchoConfidence.js";
```

Add a `confidence` block next to `blendLeaderboard` (same loop, since both
iterate `leadDay`):

```js
  const confidence = { byLead: {} };
  for (const leadDay of [0, 1, 2]) {
    confidence.byLead[leadDay] = computeAgreementReliability(observedHours, forecastIndex, leadDay);
  }
```

Add `confidence,` to the final returned object.

- [ ] **Step 6: Run the full suite**

```bash
node --test tests/forecast-experiment/guinchoConfidence.test.mjs tests/forecast-experiment/guinchoModelSkill.test.mjs
npx vitest run app/experiment/guincho-model-skill
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/forecast-experiment/guinchoConfidence.js lib/forecast-experiment/guinchoModelSkill.js tests/forecast-experiment/guinchoConfidence.test.mjs
git commit -m "feat: score model agreement as a confidence signal"
```

---

### Task 9: Analog days

**Files:**
- Create: `lib/forecast-experiment/guinchoAnalogDays.js`
- Test: `tests/forecast-experiment/guinchoAnalogDays.test.mjs` (new)
- Modify: `lib/forecast-experiment/guinchoModelSkill.js`

**Interfaces:**
- Produces: `fingerprintDay(dateLocal, dayHours, forecastIndex, leadDay,
  opts?): { dateLocal, regime, season, key }` and `findAnalogDays(target,
  allFingerprints, opts?): fingerprint[]`. Wired so each entry in
  `sampleDayPayload` (the Spot Check tab's per-day data) gains an
  `analogDays: { hits, total }` field.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { fingerprintDay, findAnalogDays } from "../../lib/forecast-experiment/guinchoAnalogDays.js";

function fc(model, leadDay, validTime, dir) {
  return [`${model}:${leadDay}:${validTime}`, { windSpeedKnots: 16, windGustKnots: 20, windDirectionDeg: dir }];
}

test("fingerprintDay keys by regime, season, and each model's go/no-go call", () => {
  const dayHours = [{ validTime: 100 }, { validTime: 101 }, { validTime: 102 }, { validTime: 103 }];
  const forecastIndex = new Map([
    ...dayHours.flatMap((h) => [
      fc("ecmwf-ifs025", 1, h.validTime, 340),
      fc("icon-eu", 1, h.validTime, 340),
      fc("icon-global", 1, h.validTime, 340),
      fc("gfs-global", 1, h.validTime, 340),
    ]),
  ]);
  const fingerprint = fingerprintDay("2025-08-15", dayHours, forecastIndex, 1);
  assert.equal(fingerprint.regime, "nortada");
  assert.equal(fingerprint.season, "maySep");
  assert.deepEqual(fingerprint.calls, [1, 1, 1, 1]); // all four models called it (16+20)/2=18 >= 12
});

test("findAnalogDays returns exact-key matches first, falls back once thinned below k", () => {
  const target = { dateLocal: "2025-08-15", regime: "nortada", season: "maySep", key: "nortada:maySep:1111" };
  const exactMatches = Array.from({ length: 3 }, (_, i) => ({
    dateLocal: `2025-07-0${i + 1}`,
    regime: "nortada",
    season: "maySep",
    key: "nortada:maySep:1111",
  }));
  const fallbackMatches = Array.from({ length: 5 }, (_, i) => ({
    dateLocal: `2025-06-0${i + 1}`,
    regime: "nortada",
    season: "maySep",
    key: "nortada:maySep:1110",
  }));
  const analogs = findAnalogDays(target, [...exactMatches, ...fallbackMatches], { k: 6 });
  assert.equal(analogs.length, 6);
  assert.equal(analogs.slice(0, 3).every((day) => day.key === target.key), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/forecast-experiment/guinchoAnalogDays.test.mjs`
Expected: FAIL — the file does not exist yet.

- [ ] **Step 3: Write the implementation**

```js
import { classifyWindRegime, WIND_REGIME_NORTADA } from "./modelSkillAnalysis.js";
import { GUINCHO_MODEL_SLUGS, RIDEABLE_KNOTS, SESSION_MIN_HOURS } from "./guinchoModelSkillConstants.js";

// Deliberately not imported from guinchoModelSkill.js -- that file imports
// this one (fingerprintDay/findAnalogDays), so importing back would be a
// circular import. It is a one-line pure check; duplicating it here is
// cheaper than restructuring the module graph for it.
function isNortadaSeasonDate(dateLocal) {
  const month = Number(String(dateLocal).slice(5, 7));
  return month >= 5 && month <= 9;
}

function hourEffective(forecast) {
  const speed = forecast?.windSpeedKnots;
  const gust = forecast?.windGustKnots;
  if (Number.isFinite(speed) && Number.isFinite(gust)) return (speed + gust) / 2;
  if (Number.isFinite(speed)) return speed;
  if (Number.isFinite(gust)) return gust;
  return undefined;
}

/**
 * Fingerprint one day at one lead: consensus direction bucket (majority of
 * the four real models' own forecast direction that day), season, and each
 * model's own go/no-go call for the day (>= SESSION_MIN_HOURS go hours).
 */
export function fingerprintDay(dateLocal, dayHours, forecastIndex, leadDay, { models = GUINCHO_MODEL_SLUGS } = {}) {
  let nortadaVotes = 0;
  let otherVotes = 0;
  for (const hour of dayHours) {
    const forecast = forecastIndex.get(`${models[0]}:${leadDay}:${hour.validTime}`);
    if (classifyWindRegime(forecast?.windDirectionDeg) === WIND_REGIME_NORTADA) nortadaVotes += 1;
    else otherVotes += 1;
  }
  const regime = nortadaVotes >= otherVotes ? "nortada" : "other";
  const season = isNortadaSeasonDate(dateLocal) ? "maySep" : "octApr";
  const calls = models.map((model) => {
    const goHours = dayHours.filter((hour) => {
      const forecast = forecastIndex.get(`${model}:${leadDay}:${hour.validTime}`);
      const effective = hourEffective(forecast);
      return Number.isFinite(effective) && effective >= RIDEABLE_KNOTS;
    }).length;
    return goHours >= SESSION_MIN_HOURS ? 1 : 0;
  });
  return { dateLocal, regime, season, calls, key: `${regime}:${season}:${calls.join("")}` };
}

/** k nearest historical analogs by exact fingerprint key, falling back to regime+season. */
export function findAnalogDays(target, allFingerprints, { k = 20 } = {}) {
  const exact = allFingerprints.filter((day) => day.key === target.key && day.dateLocal !== target.dateLocal);
  if (exact.length >= k) return exact.slice(0, k);
  const fallback = allFingerprints.filter(
    (day) =>
      day.dateLocal !== target.dateLocal &&
      day.regime === target.regime &&
      day.season === target.season &&
      day.key !== target.key
  );
  return [...exact, ...fallback].slice(0, k);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/forecast-experiment/guinchoAnalogDays.test.mjs`
Expected: PASS

- [ ] **Step 5: Wire it into `scoreGuinchoModelSkill`**

In `lib/forecast-experiment/guinchoModelSkill.js`, add:

```js
import { fingerprintDay, findAnalogDays } from "./guinchoAnalogDays.js";
```

After `sampleDays` is built (right after the `sampleDays = uniqueDates.map(...)` line),
compute the fingerprint pool once for every date and the set of real
session dates, then attach `analogDays` to each sample day:

```js
  const hoursByDate = new Map();
  for (const hour of observedHours) {
    if (!hoursByDate.has(hour.dateLocal)) hoursByDate.set(hour.dateLocal, []);
    hoursByDate.get(hour.dateLocal).push(hour);
  }
  const allFingerprints = [...hoursByDate.entries()].map(([dateLocal, hours]) =>
    fingerprintDay(dateLocal, hours, forecastIndex, 1, { models: day1Peers })
  );
  const realSessionDates = new Set(
    [...hoursByDate.entries()]
      .filter(([, hours]) => hours.filter(isRideableHour).length >= SESSION_MIN_HOURS)
      .map(([dateLocal]) => dateLocal)
  );
  for (const day of sampleDays) {
    const fingerprint = allFingerprints.find((f) => f.dateLocal === day.dateLocal);
    if (!fingerprint) continue;
    const analogs = findAnalogDays(fingerprint, allFingerprints);
    if (!analogs.length) continue;
    day.analogDays = {
      hits: analogs.filter((analog) => realSessionDates.has(analog.dateLocal)).length,
      total: analogs.length,
    };
  }
```

Place this block after `const sampleDays = uniqueDates.map(...)` and before
the `spotChecks` array is built, so `sampleDays` (returned later in the
same object) already carries `analogDays`.

- [ ] **Step 6: Run the full suite**

```bash
node --test tests/forecast-experiment/guinchoAnalogDays.test.mjs tests/forecast-experiment/guinchoModelSkill.test.mjs
npx vitest run app/experiment/guincho-model-skill
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/forecast-experiment/guinchoAnalogDays.js lib/forecast-experiment/guinchoModelSkill.js tests/forecast-experiment/guinchoAnalogDays.test.mjs
git commit -m "feat: add analog-day matching to the Guincho spot check"
```

---

### Task 10: UI — synthetic-model badge + blend leaderboard block

**Files:**
- Modify: `components/ui/SkillTable.js`
- Modify: `components/ui/__tests__/SkillTable.test.js`
- Modify: `app/experiment/guincho-model-skill/GuinchoModelSkillView.js`
- Modify: `app/experiment/guincho-model-skill/__tests__/GuinchoModelSkillView.test.js`

**Interfaces:**
- Consumes: `summary.blendLeaderboard.byLead[leadDay]` (Task 5/6),
  `row.synthetic` (Task 5).
- Produces: `SkillTable` renders a "Rule" badge on any row with
  `row.synthetic`; the Findings tab renders a new "Blend leaderboard"
  `DetailsBlock`.

- [ ] **Step 1: Write the failing test**

Add to `components/ui/__tests__/SkillTable.test.js` (open the file first to
match its existing render/query helper style, then add):

```js
it("badges a synthetic row as a Rule, not a real model", () => {
  render(
    <SkillTable
      rows={[{ model: "router-consensus", label: "Router (direction)", synthetic: true, hours: 100 }]}
      columns={[{ key: "hours", label: "Hours" }]}
    />
  );
  expect(screen.getByText("Rule")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/ui/__tests__/SkillTable.test.js`
Expected: FAIL — no "Rule" badge exists yet.

- [ ] **Step 3: Add the badge**

In `components/ui/SkillTable.js`, inside the row's badge group (right after
the existing `{row.contextOnly ? <Badge variant="marginal">Context</Badge> : null}`
line), add:

```jsx
{row.synthetic ? <Badge variant="marginal">Rule</Badge> : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/ui/__tests__/SkillTable.test.js`
Expected: PASS

- [ ] **Step 5: Add the Blend leaderboard block**

In `app/experiment/guincho-model-skill/GuinchoModelSkillView.js`, add a new
`DetailsBlock` right after the existing "What we showed in the app" block
(after its closing `</DetailsBlock>`, before "Same day, yesterday, two days
ago"):

```jsx
{summary.blendLeaderboard?.byLead?.[leadDay] ? (
  <DetailsBlock
    title="Blend leaderboard"
    caption="Router, vote, and averaged blends of the open models, scored the same way as any single model."
  >
    <SkillTable
      caption="Rows marked Rule are not a fetched model -- they are a router, vote, or average built from the models above."
      rows={summary.blendLeaderboard.byLead[leadDay].rows}
      winnerModel={summary.blendLeaderboard.byLead[leadDay].rows[0]?.model}
      columns={UNDER_TABLE_COLUMNS}
    />
  </DetailsBlock>
) : null}
```

- [ ] **Step 6: Extend the view test**

The existing test file is
`app/experiment/guincho-model-skill/__tests__/GuinchoModelSkillView.test.js`.
It builds its fixture from a `summary` object plus an `underRow(extra)`
helper. Add this case inside the `describe("GuinchoModelSkillView", ...)`
block, after the existing `"changes the answer when the lead picker
changes"` test:

```js
  it("shows the blend leaderboard with a Rule badge on synthetic rows", () => {
    render(
      <GuinchoModelSkillView
        initialSummary={{
          ...summary,
          blendLeaderboard: {
            byLead: {
              1: {
                hours: 12,
                rows: [
                  underRow({ model: "router-consensus", label: "Router (direction)", synthetic: true, sessionF1Pct: 90 }),
                  ...yesterdayRows,
                ],
              },
            },
          },
        }}
      />
    );
    expect(screen.getByText("Blend leaderboard")).toBeTruthy();
    expect(screen.getByText("Router (direction)")).toBeTruthy();
    expect(screen.getAllByText("Rule").length).toBeGreaterThan(0);
  });

  it("does not render the blend leaderboard when the summary lacks it", () => {
    render(<GuinchoModelSkillView initialSummary={summary} />);
    expect(screen.queryByText("Blend leaderboard")).toBeNull();
  });
```

- [ ] **Step 7: Run the full test + build check**

```bash
npx vitest run components/ui/__tests__/SkillTable.test.js app/experiment/guincho-model-skill
npm run build
```

Expected: all PASS, build succeeds.

- [ ] **Step 8: Manual browser check**

```bash
npm run fx:analyze:guincho-skill
npm run dev
```

Open `/experiment/guincho-model-skill`, confirm the Blend leaderboard block
renders with Router/Vote/Blend rows badged "Rule", in both `?theme=night`
and `?theme=day`, at 390px and 1440px.

- [ ] **Step 9: Commit**

```bash
git add components/ui/SkillTable.js components/ui/__tests__/SkillTable.test.js app/experiment/guincho-model-skill/GuinchoModelSkillView.js app/experiment/guincho-model-skill/__tests__
git commit -m "feat: show the blend leaderboard and a Rule badge on synthetic models"
```

---

### Task 11: UI — gustiness match column

**Files:**
- Modify: `app/experiment/guincho-model-skill/GuinchoModelSkillView.js`

**Interfaces:**
- Consumes: `row.gustinessMae` (Task 7).

- [ ] **Step 1: Add a gustiness column definition and a details block**

In `GuinchoModelSkillView.js`, add a new columns constant near
`UNDER_TABLE_COLUMNS`:

```js
const GUSTINESS_TABLE_COLUMNS = [
  { key: "gustinessHours", label: "Windy hours scored", digits: 0 },
  { key: "gustinessMae", label: "Gustiness ratio off", digits: 2 },
  { key: "gustinessBias", label: "Too gusty / too smooth", digits: 2 },
];
```

Add a new `DetailsBlock` after the "Every model" block:

```jsx
<DetailsBlock
  title="Gustiness match"
  caption="Gustiness ratio = gust / steady wind. This does not change which model wins the session call -- it is a separate read on how gusty a called session actually feels, scored on windy hours only."
>
  <SkillTable rows={table.rows} columns={GUSTINESS_TABLE_COLUMNS} />
</DetailsBlock>
```

- [ ] **Step 2: Extend the view test**

In
`app/experiment/guincho-model-skill/__tests__/GuinchoModelSkillView.test.js`,
add (the `yesterdayRows` fixture already has `underMae`/`speedMae` fields —
this just checks the new column renders once a row carries the gustiness
fields too):

```js
  it("shows the gustiness match block", () => {
    render(
      <GuinchoModelSkillView
        initialSummary={{
          ...summary,
          fullSeries: {
            byLead: {
              ...summary.fullSeries.byLead,
              1: { all: table([underRow({ model: "icon-eu", label: "ICON7", gustinessMae: 0.3, gustinessBias: -0.1, gustinessHours: 40 })]), rideable: table(yesterdayRows) },
            },
          },
        }}
      />
    );
    expect(screen.getByText("Gustiness match")).toBeTruthy();
  });
```

- [ ] **Step 3: Run tests and check in the browser**

```bash
npx vitest run app/experiment/guincho-model-skill
npm run dev
```

Confirm the block renders correctly, both themes, both breakpoints.

- [ ] **Step 4: Commit**

```bash
git add app/experiment/guincho-model-skill/GuinchoModelSkillView.js app/experiment/guincho-model-skill/__tests__
git commit -m "feat: show gustiness ratio match in the Guincho findings"
```

---

### Task 12: UI — confidence (agreement) block

**Files:**
- Modify: `app/experiment/guincho-model-skill/GuinchoModelSkillView.js`

**Interfaces:**
- Consumes: `summary.confidence.byLead[leadDay]` (Task 8), an array of
  `{ agreementBucket, days, falseGoDayPct, missedPct }`.

- [ ] **Step 1: Map confidence rows onto `SkillTable`'s row shape**

`SkillTable` expects `row.model` / `row.label`; reuse it rather than
building a new table component (there is no new visual shape here, just
different row semantics):

```js
const CONFIDENCE_LABELS = {
  "3": "All 3 models agreed",
  "2": "2 of 3 agreed",
  "1": "1 of 3 called it",
  "no-call": "Never reached a called day",
};

const CONFIDENCE_TABLE_COLUMNS = [
  { key: "days", label: "Days", digits: 0 },
  { key: "falseGoDayPct", label: "False calls, %", digits: 0 },
  { key: "missedPct", label: "Missed, %", digits: 0 },
];

function confidenceRows(buckets) {
  return (buckets ?? []).map((bucket) => ({
    model: bucket.agreementBucket,
    label: CONFIDENCE_LABELS[bucket.agreementBucket] ?? bucket.agreementBucket,
    ...bucket,
  }));
}
```

Add a `DetailsBlock` after the "Blend leaderboard" block:

```jsx
<DetailsBlock
  title="Does agreement mean confidence?"
  caption="When the three vote members agree, is the call more reliable? Days grouped by how many of the three called each go hour."
>
  <SkillTable rows={confidenceRows(summary.confidence?.byLead?.[leadDay])} columns={CONFIDENCE_TABLE_COLUMNS} />
</DetailsBlock>
```

- [ ] **Step 2: Extend the view test**

In `GuinchoModelSkillView.test.js`, add:

```js
  it("shows the confidence block ranked by agreement", () => {
    render(
      <GuinchoModelSkillView
        initialSummary={{
          ...summary,
          confidence: {
            byLead: {
              1: [
                { agreementBucket: "3", days: 40, falseGoDayPct: 2, missedPct: 1 },
                { agreementBucket: "1", days: 10, falseGoDayPct: 40, missedPct: 5 },
              ],
            },
          },
        }}
      />
    );
    expect(screen.getByText("Does agreement mean confidence?")).toBeTruthy();
    expect(screen.getByText("All 3 models agreed")).toBeTruthy();
  });
```

- [ ] **Step 3: Run it and check the browser**

```bash
npx vitest run app/experiment/guincho-model-skill
npm run dev
```

Confirm the block renders, and note whether the false-call rate visibly
falls from "1 of 3" to "3 of 3" in the real data — that comparison is the
finding itself. If it does not fall, that is still a valid, reportable
result: say so plainly in the handover update in Task 14, do not word the
caption to claim a finding the numbers do not support.

- [ ] **Step 4: Commit**

```bash
git add app/experiment/guincho-model-skill/GuinchoModelSkillView.js app/experiment/guincho-model-skill/__tests__
git commit -m "feat: show model agreement as a confidence signal in the findings"
```

---

### Task 13: UI — analog days in Spot Check

**Files:**
- Modify: `app/experiment/guincho-model-skill/GuinchoSpotCheck.js`

**Interfaces:**
- Consumes: `day.analogDays` (Task 9), `{ hits, total }`.

- [ ] **Step 1: Add the line to each day card**

In `GuinchoSpotCheck.js`, inside the day card, right after the
`<SampleDayWind ... />` element, add:

```jsx
{day.analogDays ? (
  <Text variant="muted" className="mt-2 text-[13px]">
    {day.analogDays.hits} of {day.analogDays.total} similar days were real sessions.
  </Text>
) : null}
```

- [ ] **Step 2: Extend the Spot Check test**

`GuinchoSpotCheck` has no separate test file — it is exercised through
`GuinchoModelSkillView.test.js`'s `"opens the spot check and switches the
model on every chart"` test, via the `sampleDays` fixture. Add
`analogDays` to that test's first sample day entry:

```js
            {
              dateLocal: "2025-08-20",
              analogDays: { hits: 17, total: 20 },
              hours: [
```

(This is the same `sampleDays[0]` object already in that test — just add
the `analogDays` key alongside the existing `dateLocal` and `hours` keys.)
Then add an assertion after the existing `fireEvent.click(...)` calls in
that test:

```js
    expect(screen.getByText("17 of 20 similar days were real sessions.")).toBeTruthy();
```

- [ ] **Step 3: Run it and check the browser**

```bash
npx vitest run app/experiment/guincho-model-skill
npm run dev
```

Open the Spot check tab, confirm the line renders under sample days, both
themes, both breakpoints.

- [ ] **Step 4: Commit**

```bash
git add app/experiment/guincho-model-skill/GuinchoSpotCheck.js app/experiment/guincho-model-skill/__tests__
git commit -m "feat: show analog-day session share on the Guincho spot check"
```

---

### Task 14: Rebuild the summary, update the handover doc

**Files:**
- Modify: `docs/forecast-experiment-guincho-model-skill-handover.md`
- No code changes — this task runs the pipeline end to end and records
  what it found.

- [ ] **Step 1: Rebuild the summary against the real archive**

```bash
npm run fx:analyze:guincho-skill
```

Confirm it completes without error and
`data/forecast-experiment/guincho-model-skill-summary.json` now has
`blendLeaderboard`, `confidence`, and `sampleDays[*].analogDays` keys (spot
check with `node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('data/forecast-experiment/guincho-model-skill-summary.json'))))"`).

- [ ] **Step 2: Run the full test suite one more time**

```bash
node --test tests/forecast-experiment/guinchoModelSkill.test.mjs tests/forecast-experiment/guinchoBlendModels.test.mjs tests/forecast-experiment/guinchoGustiness.test.mjs tests/forecast-experiment/guinchoConfidence.test.mjs tests/forecast-experiment/guinchoAnalogDays.test.mjs tests/forecast-experiment/guinchoModelSkillConstants.test.mjs
npx vitest run app/experiment/guincho-model-skill components/ui/__tests__/SkillTable.test.js
```

Expected: all PASS.

- [ ] **Step 3: Browse the finished page and record what each thread found**

```bash
npm run dev
```

Open `/experiment/guincho-model-skill`, both themes, both breakpoints, and
read off: does any router/vote/blend row beat ICON7 alone on session F1
(Blend leaderboard)? Does the false-call rate fall as agreement rises
(Confidence block)? Does the gustiness ratio ranking agree with or differ
from the session-match ranking (Gustiness match)? Do analog days point the
same direction as the model consensus, or diverge on any spot-check day?

- [ ] **Step 4: Write the findings into the handover doc**

Add a new section, "12. Blend research (2026-08-27 pass)", to
`docs/forecast-experiment-guincho-model-skill-handover.md`, following the
existing doc's terse, numbered style. State each thread's actual result in
one or two sentences — including a negative result if a blend does not
beat ICON7, per this plan's "no silent caps" spirit: a null finding is
still a finding. Link to
`docs/superpowers/specs/2026-08-27-guincho-blend-research-design.md`.

- [ ] **Step 5: Commit**

```bash
git add docs/forecast-experiment-guincho-model-skill-handover.md data/forecast-experiment/guincho-model-skill-summary.json
git commit -m "docs: record Guincho blend research findings in the handover"
```
