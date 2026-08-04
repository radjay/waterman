# Station Readings Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poll Windguru stations every five minutes into `station_readings`, feed the Now screen's station card from it, and backfill the existing history so the wind is queryable.

**Architecture:** A Convex cron drives an internal action that fetches each distinct station derived from `spots.liveReportUrl` and writes station-keyed rows, deduped on `(stationId, time)`. The read path builds the already-written `StationCard` from those rows plus the spot's current forecast slot. All parsing, proximity and card-building logic lives in pure modules under `lib/` so it tests without a deployment.

**Tech Stack:** Convex (schema, crons, actions, mutations), Next.js 15 App Router, vitest for `lib/` and component code, `node:test` for `lib/convex/` helpers.

## Global Constraints

- **Production and development share one Convex deployment.** A schema push is a production push. Never write fixture or dummy data to Convex. Source: `lib/flags.js` header comment.
- **The environment boundary is the Render service's env vars**, not Convex. The flag is `NEXT_PUBLIC_FLAG_STATION_EVIDENCE` and is not enabled by this plan.
- **Wind values are already in knots** from the Windguru iAPI. No unit conversion anywhere in this plan.
- **`unixtime` is the liveness discriminator, and the only one.** A reading without a usable `unixtime` is not a reading. Absent wind fields are *not* grounds for rejection — a calm live station omits them too (`app/api/live-wind/[stationId]/route.js:58`), so absent wind means 0 knots.
- **Never let one station's failure affect another.** Per-station `try/catch`, following the model-ingest precedent in commit 5311534.
- **Existing tests must keep passing.** Run `npm test` before every commit that touches `lib/` or `components/`.
- Spec: `docs/superpowers/specs/2026-08-04-station-readings-ingestion-design.md`.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/stations.js` (create) | Station registry, URL parsing, spot→station targets, proximity classification. Pure. |
| `lib/windguru.js` (create) | iAPI base URL, headers, raw payload fetch, and the guarded `parseCurrentReading`. |
| `lib/forecast-experiment/windguruClient.js` (modify) | Imports base/headers from `lib/windguru.js`, re-exports `fetchWindguruCurrentStation`. No behaviour change. |
| `lib/convex/stationReadings.js` (create) | Batch dedupe helper shared by the action and the backfill. Pure. |
| `convex/schema.ts` (modify) | `station_readings.spotId` becomes optional. |
| `convex/stations.ts` (create) | `listStationSpots`, `pollStations`, `saveStationReadings`, `getStationReadings`. |
| `convex/crons.ts` (modify) | Register the 5-minute poll. |
| `lib/station.js` (create) | Builds the `StationCard` shape from readings + forecast slot + proximity. Pure. |
| `components/now/useNowData.js` (modify) | Resolves the station, queries readings, feeds the card and `stationDelta`. |
| `scripts/backfill-station-readings.mjs` (create) | One-shot copy of `fx_observations` history into `station_readings`. |

Tests: `lib/__tests__/stations.test.js`, `lib/__tests__/windguru.test.js`, `lib/__tests__/station.test.js` (vitest); `tests/convex/stationReadings.test.mjs` (`node:test`).

---

### Task 1: Station registry and proximity

**Files:**
- Create: `lib/stations.js`
- Test: `lib/__tests__/stations.test.js`

**Interfaces:**
- Consumes: `getCardinalDirection` from `lib/utils.js` (existing, 16-point compass).
- Produces:
  - `stationIdFromUrl(url: string|null) => string|null`
  - `stationTargetsFromSpots(spots: Array<{_id, liveReportUrl}>) => Array<{stationId: string, spotIds: string[]}>`
  - `classifyProximity(stationId: string, spot: {latitude, longitude}) => {kind: "at-spot"|"nearby", station: {name, latitude, longitude}|null, distanceKm: number|null, bearingLabel: string|null}`
  - `STATIONS: Record<string, {name, latitude, longitude}>`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/stations.test.js`:

```js
import { describe, it, expect } from "vitest";
import { classifyProximity, stationIdFromUrl, stationTargetsFromSpots } from "../stations";

const MARINA = { latitude: 38.6919, longitude: -9.4203 };
const GUINCHO = { latitude: 38.7333, longitude: -9.4733 };
const LAGOA = { latitude: 38.5058, longitude: -9.1728 };

describe("stationIdFromUrl", () => {
  it("extracts the id from a windguru station url", () => {
    expect(stationIdFromUrl("https://www.windguru.cz/station/2329")).toBe("2329");
  });

  it("returns null for a windguru url that is not a station", () => {
    expect(stationIdFromUrl("https://www.windguru.cz/48765")).toBeNull();
  });

  it("returns null for junk", () => {
    expect(stationIdFromUrl(null)).toBeNull();
    expect(stationIdFromUrl("")).toBeNull();
    expect(stationIdFromUrl("not a url")).toBeNull();
  });
});

describe("stationTargetsFromSpots", () => {
  it("dedupes spots that share one station and skips spots without a url", () => {
    const targets = stationTargetsFromSpots([
      { _id: "marina", liveReportUrl: "https://www.windguru.cz/station/2329" },
      { _id: "moitas", liveReportUrl: "https://www.windguru.cz/station/2329" },
      { _id: "guincho", liveReportUrl: "https://www.windguru.cz/station/3294" },
      { _id: "carcavelos", liveReportUrl: null },
    ]);

    expect(targets).toEqual([
      { stationId: "2329", spotIds: ["marina", "moitas"] },
      { stationId: "3294", spotIds: ["guincho"] },
    ]);
  });
});

describe("classifyProximity", () => {
  it("classifies the marina station as at-spot for Marina de Cascais", () => {
    const result = classifyProximity("2329", MARINA);
    expect(result.kind).toBe("at-spot");
    expect(result.station.name).toBe("Marina de Cascais");
  });

  it("classifies Cabo Raso as nearby for Guincho, about 2.9 km SSW", () => {
    const result = classifyProximity("3294", GUINCHO);
    expect(result.kind).toBe("nearby");
    expect(result.station.name).toBe("Cabo Raso");
    expect(result.distanceKm).toBeGreaterThan(2.8);
    expect(result.distanceKm).toBeLessThan(3.0);
    expect(result.bearingLabel).toBe("SSW");
  });

  // The safety property: an unknown station must never reach the verdict path.
  it("classifies an unmapped station as nearby, never at-spot", () => {
    const result = classifyProximity("15435", LAGOA);
    expect(result.kind).toBe("nearby");
    expect(result.station).toBeNull();
  });

  it("classifies a spot with no coordinates as nearby", () => {
    const result = classifyProximity("2329", { latitude: undefined, longitude: undefined });
    expect(result.kind).toBe("nearby");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/__tests__/stations.test.js`
Expected: FAIL — cannot resolve `../stations`.

- [ ] **Step 3: Write the implementation**

Create `lib/stations.js`:

```js
import { getCardinalDirection } from "./utils";

/**
 * Windguru stations we know the position of.
 *
 * Coordinates come from lib/forecast-experiment/locations.js, which sites
 * cabo-raso and cascais-bay against the same physical sensors.
 *
 * Station 15435 (Lagoa da Albufeira) is deliberately absent: it is dead, and
 * we do not know where it actually stands. Guessing its position from the
 * spot's coordinates would classify it "at-spot" on no evidence, which is
 * exactly the mistake classifyProximity exists to prevent.
 */
export const STATIONS = {
  "2329": { name: "Marina de Cascais", latitude: 38.6919, longitude: -9.4203 },
  "3294": { name: "Cabo Raso", latitude: 38.7089, longitude: -9.4859 },
};

/** Under this, the station is measuring the spot rather than the region. */
export const AT_SPOT_KM = 1;

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function stationIdFromUrl(url) {
  if (typeof url !== "string") return null;
  const match = url.match(/windguru\.cz\/station\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * One entry per distinct station, carrying the spots that point at it.
 * Two spots share 2329 and two share 3294, so polling per spot would fetch
 * the same sensor twice.
 */
export function stationTargetsFromSpots(spots) {
  const byStation = new Map();

  for (const spot of spots || []) {
    const stationId = stationIdFromUrl(spot?.liveReportUrl);
    if (!stationId) continue;
    if (!byStation.has(stationId)) byStation.set(stationId, []);
    byStation.get(stationId).push(spot._id);
  }

  return [...byStation.entries()].map(([stationId, spotIds]) => ({ stationId, spotIds }));
}

export function distanceKm(from, to) {
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.sin(deltaLon / 2) ** 2 * Math.cos(fromLat) * Math.cos(toLat);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function bearingDegrees(from, to) {
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const y = Math.sin(deltaLon) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon);

  return (Math.atan2(y, x) * 180) / Math.PI;
}

/**
 * Whether this station measures the spot, or merely the neighbourhood.
 *
 * Only an "at-spot" station is allowed to move the verdict. An unmapped
 * station is always "nearby", so adding a spot with an unknown station cannot
 * silently start flipping verdicts.
 */
export function classifyProximity(stationId, spot) {
  const station = STATIONS[stationId] || null;
  const hasSpotCoords =
    Number.isFinite(spot?.latitude) && Number.isFinite(spot?.longitude);

  if (!station || !hasSpotCoords) {
    return { kind: "nearby", station, distanceKm: null, bearingLabel: null };
  }

  const km = distanceKm(spot, station);
  if (km < AT_SPOT_KM) {
    return { kind: "at-spot", station, distanceKm: km, bearingLabel: null };
  }

  return {
    kind: "nearby",
    station,
    distanceKm: km,
    bearingLabel: getCardinalDirection(bearingDegrees(spot, station)),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/__tests__/stations.test.js`
Expected: PASS, 8 tests.

If the bearing assertion fails, print the actual value before adjusting — `getCardinalDirection` takes degrees where 0 is north, and `bearingDegrees` returns −180..180. Confirm `getCardinalDirection` handles negative degrees; if it does not, normalise with `(deg + 360) % 360` inside `classifyProximity` rather than changing the test's expected `SSW`.

- [ ] **Step 5: Run the full suite and commit**

```bash
npm test
git add lib/stations.js lib/__tests__/stations.test.js
git commit -m "feat(stations): station registry, url parsing and proximity

Two spots share station 2329 and two share 3294, so targets dedupe by
station rather than fanning out per spot.

Proximity gates the verdict effect. Cabo Raso is 2.9km from Guincho on an
exposed headland, so its reading cannot be treated as Guincho's forecast
error. An unmapped station classifies nearby, never at-spot, so a new spot
with an unknown station cannot silently start moving verdicts. Station
15435 is deliberately absent rather than guessed from spot coordinates."
```

---

### Task 2: Windguru client with the liveness guard

**Files:**
- Create: `lib/windguru.js`
- Modify: `lib/forecast-experiment/windguruClient.js`
- Test: `lib/__tests__/windguru.test.js`

**Interfaces:**
- Consumes: `round1`, `isValidWindReading` from `lib/forecast-experiment/units.js`.
- Produces:
  - `WINDGURU_IAPI_BASE: string`
  - `windguruHeaders(stationId: string) => Record<string,string>`
  - `fetchCurrentStationPayload(stationId: string) => Promise<object>`
  - `parseCurrentReading(payload: object, opts?: {nowMs?: number}) => {time, speed, gust?, direction?, tempC?}|null`
  - `fetchStationReading(stationId: string, opts?: {nowMs?: number}) => Promise<Reading|null>`
  - `assessQuality({windSpeedKnots, windGustKnots, temperatureC, observedAt}) => "ok"|"stale"|"suspect"` — single definition, imported by the fx client
  - `fetchWindguruCurrentStation(stationId)` — moved here unchanged, re-exported by the fx client.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/windguru.test.js`. The dead-station payload is the real response captured from station 15435 on 2026-08-04.

```js
import { describe, it, expect } from "vitest";
import { parseCurrentReading } from "../windguru";

const OBSERVED_UNIXTIME = 1785861742;
const NOW = OBSERVED_UNIXTIME * 1000 + 60_000;

const LIVE = {
  wind_avg: 4,
  wind_max: 4.5,
  wind_min: null,
  wind_direction: 49,
  temperature: 24.77778,
  mslp: 1020.69855,
  rh: 75,
  datetime: "2026-08-04 17:42:22 WEST",
  unixtime: OBSERVED_UNIXTIME,
};

// A live station reporting calm omits the wind fields entirely.
const CALM = {
  wind_direction: 12,
  temperature: 22,
  datetime: "2026-08-04 17:42:22 WEST",
  unixtime: OBSERVED_UNIXTIME,
};

// Station 15435, dead. No unixtime, no wind fields, no temperature.
const DEAD = { datetime: "2026-08-04 17:43:00 WEST" };

describe("parseCurrentReading", () => {
  it("extracts a live reading", () => {
    expect(parseCurrentReading(LIVE, { nowMs: NOW })).toEqual({
      time: OBSERVED_UNIXTIME * 1000,
      speed: 4,
      gust: 4.5,
      direction: 49,
      tempC: 24.8,
    });
  });

  // The whole point of the guard: a dead station must yield nothing, not a
  // fresh-timestamped zero. Dedupe cannot catch a zero whose time is new
  // on every poll.
  it("returns null for a dead station that omits unixtime", () => {
    expect(parseCurrentReading(DEAD, { nowMs: NOW })).toBeNull();
  });

  it("returns a real zero for a live station reporting calm", () => {
    const reading = parseCurrentReading(CALM, { nowMs: NOW });
    expect(reading).not.toBeNull();
    expect(reading.speed).toBe(0);
    expect(reading.time).toBe(OBSERVED_UNIXTIME * 1000);
  });

  it("rejects a reading more than 24 hours old", () => {
    expect(parseCurrentReading(LIVE, { nowMs: NOW + 25 * 60 * 60 * 1000 })).toBeNull();
  });

  it("rejects a reading from the future", () => {
    expect(parseCurrentReading(LIVE, { nowMs: NOW - 10 * 60 * 1000 })).toBeNull();
  });

  it("returns null for junk", () => {
    expect(parseCurrentReading(null, { nowMs: NOW })).toBeNull();
    expect(parseCurrentReading({}, { nowMs: NOW })).toBeNull();
    expect(parseCurrentReading({ unixtime: 0 }, { nowMs: NOW })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/__tests__/windguru.test.js`
Expected: FAIL — cannot resolve `../windguru`.

- [ ] **Step 3: Write the implementation**

Create `lib/windguru.js`:

```js
import { isValidWindReading, round1 } from "./forecast-experiment/units";

export const WINDGURU_IAPI_BASE = "https://www.windguru.cz/int/iapi.php";

/** Readings older than this are refused by the live path. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** Tolerance for clock skew between us and the station. */
const FUTURE_TOLERANCE_MS = 60 * 1000;

export function windguruHeaders(stationId) {
  return {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept: "application/json, */*",
    Referer: `https://www.windguru.cz/station/${stationId}`,
  };
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function sanitizeWind(value) {
  const number = numeric(value);
  if (!isValidWindReading(number)) return undefined;
  return round1(number);
}

export async function fetchCurrentStationPayload(stationId) {
  const response = await fetch(
    `${WINDGURU_IAPI_BASE}?q=station_data_current&id_station=${stationId}`,
    { cache: "no-store", headers: windguruHeaders(stationId) }
  );

  if (!response.ok) {
    throw new Error(`Windguru API error: ${response.status}`);
  }

  const data = await response.json();
  if (data?.return === "error") {
    throw new Error(data.message || "Windguru API error");
  }
  return data;
}

/**
 * A station reading, or null when the station is not actually reporting.
 *
 * A dead station returns {"datetime": "..."} with no unixtime and no wind
 * fields. A live station reporting calm ALSO omits wind_avg and wind_max —
 * so the wind fields cannot tell the two apart, and `wind_avg ?? 0` turns a
 * dead station into a fabricated calm reading. Because the fallback
 * timestamp would be Date.now(), it would be new on every poll and dedupe
 * could never catch it.
 *
 * unixtime is the discriminator. Present means a real reading, including a
 * legitimate zero. Absent means no reading at all.
 */
export function parseCurrentReading(payload, { nowMs = Date.now() } = {}) {
  if (!payload || typeof payload !== "object") return null;

  const unixtime = numeric(payload.unixtime);
  if (!unixtime || unixtime <= 0) return null;

  // Deliberately NOT rejecting on absent wind fields. A calm live station
  // omits wind_avg and wind_max too (route.js:58), so that check would throw
  // away every genuine calm reading. unixtime has already excluded the dead
  // station, which is the only thing absent wind could have caught.
  const time = unixtime * 1000;
  if (time > nowMs + FUTURE_TOLERANCE_MS) return null;
  if (time < nowMs - MAX_AGE_MS) return null;

  const speed = sanitizeWind(payload.wind_avg ?? 0);
  if (speed === undefined) return null;

  const tempC = numeric(payload.temperature);

  return {
    time,
    speed,
    gust: sanitizeWind(payload.wind_max),
    direction: numeric(payload.wind_direction),
    tempC: tempC === undefined ? undefined : round1(tempC),
  };
}

export async function fetchStationReading(stationId, { nowMs = Date.now() } = {}) {
  const payload = await fetchCurrentStationPayload(stationId);
  return parseCurrentReading(payload, { nowMs });
}

/**
 * The forecast-experiment shape, moved here so there is one iAPI client.
 * Re-exported by lib/forecast-experiment/windguruClient.js unchanged.
 */
export function assessQuality({ windSpeedKnots, windGustKnots, temperatureC, observedAt }) {
  const ageMs = Date.now() - observedAt;
  if (ageMs > 60 * 60 * 1000) return "stale";
  if (windSpeedKnots === 0 && windGustKnots === 0 && Number.isFinite(temperatureC)) {
    return "suspect";
  }
  return "ok";
}

export async function fetchWindguruCurrentStation(stationId) {
  const data = await fetchCurrentStationPayload(stationId);

  const observedAt = data.unixtime ? data.unixtime * 1000 : Date.now();
  const windSpeedKnots = sanitizeWind(data.wind_avg ?? 0);
  const windGustKnots = sanitizeWind(data.wind_max ?? 0);
  const temperatureC = numeric(data.temperature);
  const quality = assessQuality({ windSpeedKnots, windGustKnots, temperatureC, observedAt });

  return {
    observedAt,
    windSpeedKnots,
    windGustKnots,
    windDirectionDeg: numeric(data.wind_direction),
    temperatureC,
    quality,
    raw: data,
  };
}
```

- [ ] **Step 4: Point the fx client at the shared module**

In `lib/forecast-experiment/windguruClient.js`, delete the local `IAPI_BASE`, `windguruHeaders`, `assessQuality` and `fetchWindguruCurrentStation` definitions, and add at the top:

```js
import {
  WINDGURU_IAPI_BASE,
  assessQuality,
  fetchWindguruCurrentStation,
  windguruHeaders,
} from "../windguru.js";
```

Replace uses of `IAPI_BASE` with `WINDGURU_IAPI_BASE` in `fetchWindguruStationData`, and re-export:

```js
export { fetchWindguruCurrentStation };
```

Delete the local `assessQuality` definition — `parseWindguruStationData` now calls
the imported one. Do **not** keep a second copy: the same quality rules living in
two files is exactly how they drift apart. `fetchWindguruStationData` and
`parseWindguruStationData` otherwise stay in the fx client unchanged.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run lib/__tests__/windguru.test.js`
Expected: PASS, 6 tests.

Run: `npm test`
Expected: PASS. The fx suite exercises `parseWindguruStationData`; if it fails, the `assessQuality` copy in Step 4 was dropped rather than kept.

- [ ] **Step 6: Commit**

```bash
git add lib/windguru.js lib/__tests__/windguru.test.js lib/forecast-experiment/windguruClient.js
git commit -m "feat(windguru): shared iAPI client with a liveness guard

Station 15435 is dead and returns {\"datetime\":...} with no unixtime and
no wind fields. The existing parse path turns that into a fresh-timestamped
zero-knot reading, because observedAt falls back to Date.now() and
sanitizeWind uses ?? 0. Dedupe cannot catch it: the timestamp is new every
poll, so it would write a fabricated calm reading every five minutes.

The ?? 0 is right for its original purpose — a live station reporting calm
also omits wind_avg — so the fix is not to remove it but to require
unixtime, which a dead station does not send. Tested against the real
15435 payload and a live-but-calm payload.

The forecast-experiment client now re-exports the current-station fetch
instead of owning its own copy. Its historical path is untouched."
```

---

### Task 3: Batch dedupe helper

**Files:**
- Create: `lib/convex/stationReadings.js`
- Test: `tests/convex/stationReadings.test.mjs`

**Interfaces:**
- Produces: `dedupeReadingsByTime(readings: Array<{time}>) => Array<{time}>` — first occurrence wins, ascending by time.

Follows the existing `lib/convex/forecastSlotDedupe.js` pattern: pure logic lives in `lib/convex/` so Convex functions stay thin and the logic tests under `node:test` without a deployment.

- [ ] **Step 1: Write the failing test**

Create `tests/convex/stationReadings.test.mjs`:

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dedupeReadingsByTime } from "../../lib/convex/stationReadings.js";

describe("dedupeReadingsByTime", () => {
  it("keeps the first reading for each timestamp", () => {
    const result = dedupeReadingsByTime([
      { time: 2000, speed: 12 },
      { time: 1000, speed: 10 },
      { time: 2000, speed: 99 },
    ]);

    assert.equal(result.length, 2);
    assert.deepEqual(result.map((r) => r.time), [1000, 2000]);
    assert.equal(result[1].speed, 12);
  });

  it("drops readings without a usable time", () => {
    const result = dedupeReadingsByTime([
      { time: 1000, speed: 10 },
      { time: null, speed: 5 },
      { speed: 7 },
    ]);

    assert.deepEqual(result.map((r) => r.time), [1000]);
  });

  it("returns an empty array for empty or missing input", () => {
    assert.deepEqual(dedupeReadingsByTime([]), []);
    assert.deepEqual(dedupeReadingsByTime(undefined), []);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/convex/stationReadings.test.mjs`
Expected: FAIL — cannot find module `lib/convex/stationReadings.js`.

- [ ] **Step 3: Write the implementation**

Create `lib/convex/stationReadings.js`:

```js
/**
 * Collapse a batch to one reading per timestamp, ascending.
 *
 * The live path fetches one reading at a time, but the backfill pages
 * thousands at once and the same observation can appear in two overlapping
 * weekly chunks. Deduping in memory first keeps the mutation from doing an
 * indexed lookup per duplicate.
 */
export function dedupeReadingsByTime(readings) {
  const byTime = new Map();

  for (const reading of readings || []) {
    if (!Number.isFinite(reading?.time)) continue;
    if (!byTime.has(reading.time)) byTime.set(reading.time, reading);
  }

  return [...byTime.values()].sort((a, b) => a.time - b.time);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/convex/stationReadings.test.mjs`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/convex/stationReadings.js tests/convex/stationReadings.test.mjs
git commit -m "feat(stations): batch dedupe helper for station readings

Follows the lib/convex/forecastSlotDedupe.js pattern so the logic tests
without a deployment. The backfill pages overlapping weekly chunks, so
collapsing duplicates in memory saves an indexed lookup per duplicate."
```

---

### Task 4: Schema, Convex functions and the cron

**Files:**
- Modify: `convex/schema.ts:189-199`
- Create: `convex/stations.ts`
- Modify: `convex/crons.ts`

**Interfaces:**
- Consumes: `stationTargetsFromSpots` (Task 1), `fetchStationReading` (Task 2), `dedupeReadingsByTime` (Task 3).
- Produces:
  - `api.stations.getStationReadings({stationId: string, sinceAt: number, limit?: number}) => Array<{stationId, time, speed, gust?, direction?, tempC?}>` — newest first.
  - `api.stations.saveStationReadings({stationId: string, readings: Array<{time, speed, gust?, direction?, tempC?}>}) => {inserted: number, skipped: number}`
  - `internal.stations.pollStations` — the cron entry point.

This task has no unit test; Convex functions require a deployment. Verification is explicit manual steps against the dev push.

**Stop before Step 4 and confirm with the user.** Steps 1–3 are local edits. Step 4 pushes schema to the deployment that serves production.

- [ ] **Step 1: Make `spotId` optional**

In `convex/schema.ts`, replace the `station_readings` definition (currently lines 189–199) with:

```ts
    /**
     * Live station readings, keyed by station rather than spot.
     *
     * Two spots share station 2329 and two share 3294. A per-spot row would
     * duplicate one physical measurement as if it were two independent ones,
     * and would double the table. spotId is optional and currently unused;
     * by_station_time is the index that matters.
     */
    station_readings: defineTable({
        spotId: v.optional(v.id("spots")),
        stationId: v.string(),
        time: v.number(), // Epoch ms of the reading
        speed: v.number(), // knots
        gust: v.optional(v.number()),
        direction: v.optional(v.number()),
        tempC: v.optional(v.number()),
    })
        .index("by_spot_time", ["spotId", "time"])
        .index("by_station_time", ["stationId", "time"]),
```

- [ ] **Step 2: Write `convex/stations.ts`**

```ts
import { v } from "convex/values";
import { internalAction, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { stationTargetsFromSpots } from "../lib/stations";
import { fetchStationReading } from "../lib/windguru";
import { dedupeReadingsByTime } from "../lib/convex/stationReadings";

const READING_FIELDS = {
  time: v.number(),
  speed: v.number(),
  gust: v.optional(v.number()),
  direction: v.optional(v.number()),
  tempC: v.optional(v.number()),
};

/**
 * Readings for one station, newest first.
 *
 * The Now card asks for the trailing 90 minutes. The default limit is sized
 * for that at a 5-minute cadence, with headroom for a station reporting more
 * often than we poll.
 */
export const getStationReadings = query({
  args: {
    stationId: v.string(),
    sinceAt: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("station_readings")
      .withIndex("by_station_time", (q) =>
        q.eq("stationId", args.stationId).gte("time", args.sinceAt)
      )
      .order("desc")
      .take(args.limit ?? 200);

    return rows;
  },
});

/**
 * Insert readings that are not already stored.
 *
 * Public rather than internal because the backfill script drives it over HTTP,
 * matching the existing saveForecastSlots and saveObservations mutations.
 */
export const saveStationReadings = mutation({
  args: {
    stationId: v.string(),
    readings: v.array(v.object(READING_FIELDS)),
  },
  handler: async (ctx, args) => {
    let inserted = 0;
    let skipped = 0;

    for (const reading of dedupeReadingsByTime(args.readings)) {
      const existing = await ctx.db
        .query("station_readings")
        .withIndex("by_station_time", (q) =>
          q.eq("stationId", args.stationId).eq("time", reading.time)
        )
        .first();

      if (existing) {
        skipped += 1;
        continue;
      }

      await ctx.db.insert("station_readings", {
        stationId: args.stationId,
        time: reading.time,
        speed: reading.speed,
        gust: reading.gust,
        direction: reading.direction,
        tempC: reading.tempC,
      });
      inserted += 1;
    }

    return { inserted, skipped };
  },
});

/** Spots carrying a live report url, for target derivation. */
export const listStationSpots = query({
  args: {},
  handler: async (ctx) => {
    const spots = await ctx.db.query("spots").collect();
    return spots
      .filter((spot) => Boolean(spot.liveReportUrl))
      .map((spot) => ({ _id: spot._id, liveReportUrl: spot.liveReportUrl }));
  },
});

/**
 * Poll every distinct station behind a spot's liveReportUrl.
 *
 * Each station is isolated: a dead or erroring feed must never stop the
 * others, following the model-ingest precedent in 5311534. A station that
 * returns nothing usable — 15435 is dead and sends no unixtime — simply
 * contributes no rows.
 */
export const pollStations = internalAction({
  args: {},
  handler: async (ctx) => {
    const spots = await ctx.runQuery(api.stations.listStationSpots, {});
    const targets = stationTargetsFromSpots(spots);

    let inserted = 0;
    for (const target of targets) {
      try {
        const reading = await fetchStationReading(target.stationId);
        if (!reading) continue;

        const result = await ctx.runMutation(api.stations.saveStationReadings, {
          stationId: target.stationId,
          readings: [reading],
        });
        inserted += result.inserted;
      } catch (error) {
        console.error(`station ${target.stationId} poll failed`, error);
      }
    }

    return { stations: targets.length, inserted };
  },
});
```

`internal` is not imported here — `pollStations` is referenced as
`internal.stations.pollStations` from `convex/crons.ts`, which imports it
already.

- [ ] **Step 3: Register the cron**

In `convex/crons.ts`, add before `export default crons;`:

```ts
// Live station readings. Five minutes matches the stations' own cadence.
// This runs in Convex rather than as a Render worker deliberately: the
// forecast-experiment observations worker died on 2026-06-10 and went
// unnoticed for eight weeks, because it was a separate service that could
// stop without anything noticing.
crons.interval(
  "poll windguru stations",
  { minutes: 5 },
  internal.stations.pollStations,
  {}
);
```

- [ ] **Step 4: Confirm the table is empty, then push**

**Check with the user before running this step.** It writes to the deployment that serves production.

Run: `npx convex data station_readings --limit 5`
Expected: an empty table. If it returns rows, stop and report — the optional-`spotId` change is safe for existing rows, but the assumption that nothing has ever written this table is wrong and worth understanding first.

Then push:

Run: `npx convex dev --once`
Expected: schema and functions deploy without error.

- [ ] **Step 5: Verify the poll works**

Run: `npx convex run stations:pollStations '{}'`
Expected: `{ stations: 3, inserted: 2 }` on the first call — 2329 and 3294 return readings, 15435 returns nothing.

Run it a second time immediately.
Expected: `inserted: 0`, because the stations have not produced a new timestamp yet. This confirms dedupe.

Run: `npx convex run stations:getStationReadings '{"stationId":"15435","sinceAt":0}'`
Expected: `[]`. This is the guard working — the dead station wrote nothing.

Run: `npx convex run stations:getStationReadings '{"stationId":"2329","sinceAt":0}'`
Expected: one row with a plausible speed and a `time` within the last few minutes.

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts convex/stations.ts convex/crons.ts
git commit -m "feat(stations): poll windguru into station_readings every 5 minutes

Rows are keyed by station, so spotId becomes optional. Two spots share
2329 and two share 3294; per-spot rows would have duplicated one physical
measurement and doubled the table.

The cron runs in Convex rather than as a Render worker on purpose. The
forecast-experiment observations worker died on 2026-06-10 and went
unnoticed for eight weeks because it was a separate service that could
stop quietly. A Convex cron has nothing separate to die.

Each station is isolated in its own try/catch, following the model-ingest
precedent in 5311534: a dead feed must degrade to no data, never take
down the others."
```

---

### Task 5: Build the station card

**Files:**
- Create: `lib/station.js`
- Test: `lib/__tests__/station.test.js`

**Interfaces:**
- Consumes: `getCardinalDirection` from `lib/utils.js`; the proximity shape from Task 1.
- Produces: `buildStationCard({readings, forecastSlot, proximity, nowMs}) => {speed, gust, directionLabel, agoLabel, delta, history, caption}|null`

The returned shape is consumed by `StationCard` in `components/now/EvidenceStack.js:98`, which reads `speed`, `gust`, `directionLabel`, `agoLabel`, `delta`, `history[].speed` and `caption`.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/station.test.js`:

```js
import { describe, it, expect } from "vitest";
import { buildStationCard } from "../station";

const NOW = 1785861800000;
const MINUTE = 60 * 1000;

const AT_SPOT = {
  kind: "at-spot",
  station: { name: "Marina de Cascais" },
  distanceKm: 0.1,
  bearingLabel: null,
};

const NEARBY = {
  kind: "nearby",
  station: { name: "Cabo Raso" },
  distanceKm: 2.93,
  bearingLabel: "SSW",
};

const reading = (minutesAgo, speed) => ({
  time: NOW - minutesAgo * MINUTE,
  speed,
  gust: speed + 2,
  direction: 315,
});

describe("buildStationCard", () => {
  it("returns null without readings", () => {
    expect(
      buildStationCard({ readings: [], forecastSlot: null, proximity: AT_SPOT, nowMs: NOW })
    ).toBeNull();
  });

  // Matches LiveWindIndicator.js:68 — hiding beats showing an old number.
  it("returns null when the newest reading is over an hour old", () => {
    expect(
      buildStationCard({
        readings: [reading(61, 18)],
        forecastSlot: null,
        proximity: AT_SPOT,
        nowMs: NOW,
      })
    ).toBeNull();
  });

  it("reports the newest reading", () => {
    const card = buildStationCard({
      readings: [reading(10, 14), reading(2, 18)],
      forecastSlot: null,
      proximity: AT_SPOT,
      nowMs: NOW,
    });

    expect(card.speed).toBe(18);
    expect(card.gust).toBe(20);
    expect(card.directionLabel).toBe("NW");
    expect(card.agoLabel).toBe("2 MIN AGO");
  });

  it("computes the delta against forecast for an at-spot station", () => {
    const card = buildStationCard({
      readings: [reading(2, 18)],
      forecastSlot: { speed: 15 },
      proximity: AT_SPOT,
      nowMs: NOW,
    });

    expect(card.delta).toBe(3);
    expect(card.caption).toBe("AT THE SPOT");
  });

  // The reason proximity exists: a sensor 2.9 km away on a headland is not
  // measuring this spot's forecast error, and delta feeds deriveVerdict.
  it("suppresses the delta for a nearby station and attributes the reading", () => {
    const card = buildStationCard({
      readings: [reading(2, 18)],
      forecastSlot: { speed: 15 },
      proximity: NEARBY,
      nowMs: NOW,
    });

    expect(card.delta).toBeNull();
    expect(card.caption).toBe("CABO RASO · 2.9 KM SSW");
  });

  it("buckets the trailing 90 minutes oldest first and drops older readings", () => {
    const card = buildStationCard({
      readings: [reading(120, 5), reading(80, 10), reading(40, 20), reading(2, 18)],
      forecastSlot: null,
      proximity: AT_SPOT,
      nowMs: NOW,
    });

    expect(card.history.map((p) => p.speed)).toEqual([10, 20, 18]);
  });

  it("labels an unmapped nearby station without inventing a distance", () => {
    const card = buildStationCard({
      readings: [reading(2, 18)],
      forecastSlot: { speed: 15 },
      proximity: { kind: "nearby", station: null, distanceKm: null, bearingLabel: null },
      nowMs: NOW,
    });

    expect(card.delta).toBeNull();
    expect(card.caption).toBe("NEARBY STATION");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/__tests__/station.test.js`
Expected: FAIL — cannot resolve `../station`.

- [ ] **Step 3: Write the implementation**

Create `lib/station.js`:

```js
import { getCardinalDirection } from "./utils";

/** Match LiveWindIndicator: past this, hide rather than show an old number. */
const STALE_MS = 60 * 60 * 1000;
/** The sparkline's span. */
const HISTORY_MS = 90 * 60 * 1000;
/** One bar per bucket; 90 minutes at 5 gives the ~18 bars StationCard draws. */
const BUCKET_MS = 5 * 60 * 1000;

function agoLabel(time, nowMs) {
  const minutes = Math.floor((nowMs - time) / 60_000);
  if (minutes < 1) return "JUST NOW";
  return `${minutes} MIN AGO`;
}

function caption(proximity) {
  if (proximity?.kind === "at-spot") return "AT THE SPOT";
  if (!proximity?.station || !Number.isFinite(proximity.distanceKm)) {
    return "NEARBY STATION";
  }
  const km = Math.round(proximity.distanceKm * 10) / 10;
  return `${proximity.station.name.toUpperCase()} · ${km} KM ${proximity.bearingLabel}`;
}

/** One averaged point per 5-minute bucket, oldest first. Empty buckets vanish. */
function bucketHistory(readings, nowMs) {
  const cutoff = nowMs - HISTORY_MS;
  const buckets = new Map();

  for (const reading of readings) {
    if (reading.time < cutoff) continue;
    const key = Math.floor(reading.time / BUCKET_MS);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(reading.speed);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, speeds]) => ({
      speed: Math.round((speeds.reduce((sum, s) => sum + s, 0) / speeds.length) * 10) / 10,
    }));
}

/**
 * The STATION card, or null when there is nothing honest to show.
 *
 * delta is null for anything but an at-spot station. It feeds deriveVerdict
 * (lib/verdict.js:54), where a 50-59 score plus a station running 2kn over
 * flips NO to MARGINAL — so a sensor 2.9km away on a headland would put a
 * standing offset into the verdict and present terrain as forecast error.
 */
export function buildStationCard({ readings, forecastSlot, proximity, nowMs = Date.now() }) {
  const sorted = [...(readings || [])]
    .filter((r) => Number.isFinite(r?.time) && Number.isFinite(r?.speed))
    .sort((a, b) => a.time - b.time);

  if (sorted.length === 0) return null;

  const latest = sorted[sorted.length - 1];
  if (nowMs - latest.time > STALE_MS) return null;

  const atSpot = proximity?.kind === "at-spot";
  const forecastSpeed = forecastSlot?.speed;
  const delta =
    atSpot && Number.isFinite(forecastSpeed)
      ? Math.round((latest.speed - forecastSpeed) * 10) / 10
      : null;

  return {
    speed: latest.speed,
    gust: latest.gust ?? null,
    directionLabel: Number.isFinite(latest.direction)
      ? getCardinalDirection(latest.direction)
      : null,
    agoLabel: agoLabel(latest.time, nowMs),
    delta,
    history: bucketHistory(sorted, nowMs),
    caption: caption(proximity),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/__tests__/station.test.js`
Expected: PASS, 7 tests.

If `directionLabel` comes back as something other than `"NW"` for 315 degrees, read `getCardinalDirection` in `lib/utils.js` and align the test to its actual 16-point output rather than changing the implementation.

- [ ] **Step 5: Run the full suite and commit**

```bash
npm test
git add lib/station.js lib/__tests__/station.test.js
git commit -m "feat(stations): build the Now station card from stored readings

delta is suppressed for anything but an at-spot station. It feeds
deriveVerdict, where a 50-59 score plus a station 2kn over forecast flips
NO to MARGINAL — so Cabo Raso's headland exposure would have put a
standing offset into Guincho's verdict and read as a wrong forecast.

The caption carries provenance instead of the bias line the spec cut:
riders are told which sensor they are looking at rather than left to
assume it is theirs. Staleness follows LiveWindIndicator at 60 minutes."
```

---

### Task 6: Wire the card into the Now screen

**Files:**
- Modify: `components/now/useNowData.js`

**Interfaces:**
- Consumes: `stationIdFromUrl` and `classifyProximity` (Task 1), `buildStationCard` (Task 5), `api.stations.getStationReadings` (Task 4).
- Produces: `data.station` for `NowContent.js:163`, and a real `stationDelta` for `deriveVerdict` / `verdictReason`.

`NowContent.js` already passes `station={showStation ? data.station : null}` to `EvidenceStack`, so no change is needed there.

- [ ] **Step 1: Add the imports**

In `components/now/useNowData.js`, after the existing `lib/reportData` import:

```js
import { classifyProximity, stationIdFromUrl } from "../../lib/stations";
import { buildStationCard } from "../../lib/station";
```

- [ ] **Step 2: Fetch and build the card**

Immediately after the `agreement` block ends (`if (cancelled) return;`, currently line 111) and before `const verdict = deriveVerdict({...})`, insert:

```js
        // The live station, when the chosen spot has one. As with agreement,
        // a failure here must read as "no station", never as a reading.
        let station = null;
        const stationId = stationIdFromUrl(chosen.spot.liveReportUrl);
        if (stationId) {
          try {
            const readings = await client.query(api.stations.getStationReadings, {
              stationId,
              sinceAt: now - 90 * 60 * 1000,
            });
            station = buildStationCard({
              readings,
              forecastSlot: chosen.slot,
              proximity: classifyProximity(stationId, chosen.spot),
              nowMs: now,
            });
          } catch {
            station = null;
          }
        }
        if (cancelled) return;
```

- [ ] **Step 3: Replace both `stationDelta: null` sites**

At the `deriveVerdict` call (currently line 117):

```js
        const verdict = deriveVerdict({
          score: chosen.score,
          agreement,
          stationDelta: station?.delta ?? null,
        });
```

At the `verdictReason` call (currently line 146):

```js
            reason: verdictReason({
              verdict,
              holdsUntil: holdsUntil(chosen.slots, now),
              agreement,
              stationDelta: station?.delta ?? null,
              nextWindowStart: next?.window?.start ?? null,
            }),
```

- [ ] **Step 4: Expose the card**

In the same `setState` call, add `station` to the `data` object, next to `agreement`:

```js
            agreement,
            station,
```

- [ ] **Step 5: Verify nothing regressed**

Run: `npm test`
Expected: PASS. `lib/__tests__/verdict.test.js` covers `deriveVerdict` directly and must be unaffected — a nearby station yields `delta: null`, which is exactly today's behaviour.

- [ ] **Step 6: Check it in the running app**

Run: `npm run dev`

Open the Now screen with the flag on for this session only:
`http://localhost:3000/?flag_stationEvidence=true`

If that override does not work, read `lib/flags.js` for the override mechanism this build allows — `overridesEnabled()` gates it, and overrides are disabled in production builds.

Expected: with Marina de Cascais as the chosen spot, a STATION card showing a current speed, a direction, `AT THE SPOT`, and a sparkline. With Guincho chosen, a card showing `CABO RASO · 2.9 KM SSW` and **no** delta pill.

The sparkline will be sparse until the cron has run for a while — that is expected, not a bug.

- [ ] **Step 7: Commit**

```bash
git add components/now/useNowData.js
git commit -m "feat(now): feed the station card and the verdict from stored readings

useNowData hardcoded stationDelta to null at both call sites, so
StationCard was unreachable regardless of the flag. It now resolves the
spot's station, queries the trailing 90 minutes and builds the card.

The station query is wrapped like the agreement query: a failure must read
as no station, never as a reading. delta is null for a nearby station, so
Guincho's verdict path is byte-identical to today's."
```

---

### Task 7: Backfill the history

**Files:**
- Create: `scripts/backfill-station-readings.mjs`

**Interfaces:**
- Consumes: `api.forecastExperiment.listObservationsForWindow`, `api.stations.saveStationReadings` (Task 4), `dateRangeWeeks` from `lib/forecast-experiment/time.js`.

Nothing in the app consumes this data. It exists to make the wind queryable and chartable, which is what prompted the work.

- [ ] **Step 1: Write the script**

Create `scripts/backfill-station-readings.mjs`:

```js
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";
import { dateRangeWeeks } from "../lib/forecast-experiment/time.js";

dotenv.config({ path: ".env.local" });

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

/**
 * fx locations that are Windguru stations. cascais-region is the IPMA surface
 * feed, not a station, so it is not backfilled.
 */
const TARGETS = [
  { locationSlug: "cabo-raso", stationId: "3294", startDate: "2022-01-01" },
  { locationSlug: "cascais-bay", stationId: "2329", startDate: "2020-01-01" },
];

const BATCH_SIZE = 500;
const startOverride = process.env.BACKFILL_START_DATE;
const endDate = process.env.BACKFILL_END_DATE || new Date().toISOString().slice(0, 10);
const stationFilter = process.env.BACKFILL_STATION_ID;

const DAY_MS = 24 * 60 * 60 * 1000;
const toMs = (date) => new Date(`${date}T00:00:00Z`).getTime();
/**
 * dateRangeWeeks returns an inclusive last day, so the window has to run to
 * the END of week.to. Using its midnight would silently drop the final day of
 * every chunk — about a seventh of the archive, with nothing to show for it.
 */
const endOfDayMs = (date) => toMs(date) + DAY_MS;

async function flush(stationId, readings) {
  let inserted = 0;
  for (let i = 0; i < readings.length; i += BATCH_SIZE) {
    const result = await convex.mutation(api.stations.saveStationReadings, {
      stationId,
      readings: readings.slice(i, i + BATCH_SIZE),
    });
    inserted += result.inserted;
  }
  return inserted;
}

for (const target of TARGETS) {
  if (stationFilter && target.stationId !== stationFilter) continue;

  const from = startOverride || target.startDate;
  let inserted = 0;
  let scanned = 0;

  for (const week of dateRangeWeeks(from, endDate)) {
    const rows = await convex.query(api.forecastExperiment.listObservationsForWindow, {
      locationSlug: target.locationSlug,
      startAt: toMs(week.from),
      endAt: endOfDayMs(week.to),
    });

    scanned += rows.length;

    const readings = rows
      // Matches fx-backfill-windguru-history.mjs: suspect rows are the
      // 0/0-with-temperature pattern, which is not a real calm reading.
      .filter((row) => row.quality !== "suspect")
      .filter((row) => Number.isFinite(row.windSpeedKnots))
      .map((row) => ({
        time: row.observedAt,
        speed: row.windSpeedKnots,
        gust: Number.isFinite(row.windGustKnots) ? row.windGustKnots : undefined,
        direction: Number.isFinite(row.windDirectionDeg) ? row.windDirectionDeg : undefined,
        tempC: Number.isFinite(row.temperatureC) ? row.temperatureC : undefined,
      }));

    if (readings.length > 0) {
      inserted += await flush(target.stationId, readings);
    }

    console.log(
      `${target.stationId} ${week.from}..${week.to} scanned=${scanned} inserted=${inserted}`
    );
  }

  console.log(`${target.stationId} done: scanned=${scanned} inserted=${inserted}`);
}
```

- [ ] **Step 2: Dry-run a single week**

Run:

```bash
BACKFILL_STATION_ID=3294 BACKFILL_START_DATE=2026-06-01 BACKFILL_END_DATE=2026-06-08 \
  node scripts/backfill-station-readings.mjs
```

Expected: roughly 700–1000 inserted. Station 3294 measured about 750 readings
per week in the spec's density sampling, and a full week at 10-minute cadence
caps at 1008.

A result near 600 means the final day of the chunk is being dropped — check
`endOfDayMs` is used for `endAt`, not `toMs`. This is worth checking rather than
accepting, because a missing seventh of the archive looks like nothing at all in
the output.

- [ ] **Step 3: Verify idempotency**

Run the exact same command again.
Expected: `inserted=0`. Same rows, already stored, caught by the `(stationId, time)` dedupe.

If this reports a non-zero count, stop — re-running the full backfill would duplicate the archive.

- [ ] **Step 4: Confirm the scale with the user, then run the full backfill**

**Check with the user before this step.** It writes roughly 470k rows to the deployment that serves production and will take a while.

```bash
node scripts/backfill-station-readings.mjs
```

Expected totals, from the spans in the spec: about 156k rows for 3294 and about 315k for 2329. A materially different number is worth reporting rather than accepting.

- [ ] **Step 5: Spot-check the result**

Run: `npx convex run stations:getStationReadings '{"stationId":"2329","sinceAt":1590969600000,"limit":5}'`

`1590969600000` is 2020-06-01. Expected: five rows from June 2020 with plausible speeds.

- [ ] **Step 6: Commit**

```bash
git add scripts/backfill-station-readings.mjs
git commit -m "feat(stations): backfill windguru history from fx_observations

Copies the existing archive — roughly 470k readings across 2329 and 3294,
already in this deployment — into station_readings. Idempotent through the
same (stationId, time) dedupe as the live path and resumable by date range,
so an interrupted run can simply be re-run.

Nothing in the app reads this. The Now card needs 90 minutes, not six
years. It exists to make the wind queryable, which is what prompted the
work."
```

---

## Done

When all seven tasks are complete:

- `station_readings` fills every five minutes from 2329 and 3294, and never from dead 15435.
- The Now screen shows a live station card for Marina de Cascais with a delta that can move the verdict, and an attributed Cabo Raso reading for Guincho that cannot.
- Six years of history are queryable.

**Not done, and deliberately:** `NEXT_PUBLIC_FLAG_STATION_EVIDENCE` stays off. Enabling it is a Render env var change, made after eyeballing a live delta on Marina de Cascais — see "Verification before enabling the flag" in the spec.
