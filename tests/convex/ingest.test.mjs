import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  scrapeableSpots,
  scrapeOneSpot,
  mapDbSlots,
  SPOT_STAGGER_MS,
} from "../../lib/ingest/scrapePlan.js";
import { assertBundledMlModel } from "../../lib/forecast-experiment/jobs/runGeneratePredictions.js";
import {
  BUNDLED_BAY_WIND_ML_MODEL,
  BUNDLED_BAY_WIND_NOWCAST_ML_MODEL,
} from "../../lib/forecast-experiment/bundledMl.js";
import { hasFreshCaboRasoToday } from "../../lib/forecast-experiment/jobs/runFetchObservations.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

describe("scrapeableSpots", () => {
  it("skips webcam-only spots", () => {
    const planned = scrapeableSpots([
      { _id: "a", name: "Guincho", webcamOnly: false },
      { _id: "b", name: "Cam", webcamOnly: true },
      { _id: "c", name: "CDS" },
    ]);
    assert.deepEqual(
      planned.map((s) => s.name),
      ["Guincho", "CDS"]
    );
  });
});

describe("scrapeOneSpot", () => {
  it("writes slots and model slots then scores stay scheduled by the save mutation", async () => {
    const calls = [];
    const result = await scrapeOneSpot({
      spot: { _id: "spot1", name: "Praia do CDS", url: "https://windy.app/forecast2/spot/1/CDS" },
      now: 1_700_000_000_000,
      extractSpotId: () => "1",
      getForecast: async () => ({
        slots: [
          {
            timestamp: 1_700_000_360_000,
            speed: 12,
            gust: 14,
            direction: 330,
            waveHeight: 0.4,
            wavePeriod: 6,
            waveDirection: 300,
          },
        ],
        tides: [{ time: 1_700_000_000_000, type: "high", height: 2.1 }],
      }),
      getModelForecasts: async () => [
        { model: "ecmwf", slots: [{ timestamp: 1_700_000_360_000, speed: 11, gust: 13, direction: 330 }] },
      ],
      saveForecastSlots: async (args) => {
        calls.push(["slots", args]);
        return { isSuccessful: true };
      },
      saveTides: async (args) => calls.push(["tides", args]),
      saveModelSlots: async (args) => {
        calls.push(["models", args]);
        return { inserted: 1 };
      },
      updateWindySpotId: async (args) => calls.push(["windy", args]),
    });

    assert.equal(result.ok, true);
    assert.equal(result.slotsCount, 1);
    assert.equal(result.tidesCount, 1);
    assert.equal(result.modelsSaved, 1);
    assert.equal(calls[0][0], "windy");
    assert.equal(calls[1][0], "slots");
    assert.equal(calls[2][0], "models");
    assert.equal(calls[3][0], "tides");
    assert.deepEqual(mapDbSlots([{ timestamp: 1, speed: 2, gust: 3, direction: 4 }])[0].speed, 2);
    assert.ok(SPOT_STAGGER_MS > 0);
  });

  it("records an empty scrape when Windy fails and does not throw", async () => {
    const saves = [];
    const result = await scrapeOneSpot({
      spot: { _id: "spot1", name: "Guincho", windySpotId: "9" },
      getForecast: async () => {
        throw new Error("Windy HTTP 502");
      },
      getModelForecasts: async () => {
        throw new Error("should not run");
      },
      extractSpotId: () => "9",
      saveForecastSlots: async (args) => {
        saves.push(args);
        return { isSuccessful: false };
      },
      saveTides: async () => {
        throw new Error("should not save tides");
      },
      saveModelSlots: async () => {
        throw new Error("should not save models");
      },
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /502/);
    assert.equal(saves.length, 1);
    assert.deepEqual(saves[0].slots, []);
  });
});

describe("bundled ML JSON", () => {
  it("loads trained artifacts instead of the tiny default fixture", () => {
    assertBundledMlModel(BUNDLED_BAY_WIND_ML_MODEL, "forecast");
    assertBundledMlModel(BUNDLED_BAY_WIND_NOWCAST_ML_MODEL, "nowcast");
    assert.notEqual(BUNDLED_BAY_WIND_ML_MODEL.kickInRegressor?.tree_info?.length, 1);
  });

  it("fails the fx job when the bundled model is missing", () => {
    assert.throws(() => assertBundledMlModel(null, "forecast"), /missing kickInRegressor/);
    assert.throws(() => assertBundledMlModel({}, "forecast"), /missing kickInRegressor/);
  });
});

describe("observations nowcast hint", () => {
  it("detects fresh Cabo Raso observations for the Lisbon day", () => {
    const now = Date.parse("2026-08-26T12:00:00Z");
    assert.equal(
      hasFreshCaboRasoToday(
        [{ locationSlug: "cabo-raso", observedAt: Date.parse("2026-08-26T10:00:00Z") }],
        now
      ),
      true
    );
    assert.equal(
      hasFreshCaboRasoToday(
        [{ locationSlug: "cascais-bay", observedAt: Date.parse("2026-08-26T10:00:00Z") }],
        now
      ),
      false
    );
  });
});

describe("Unit 4 wiring", () => {
  it("schedules scrape and each fx job from Convex crons", () => {
    const crons = read("convex/crons.ts");
    assert.match(crons, /internal\.ingest\.scrapeAllSpots/);
    assert.match(crons, /0 0,6,12,18 \* \* \*/);
    assert.match(crons, /internal\.fxJobs\.fetchOpenMeteoRuns/);
    assert.match(crons, /internal\.fxJobs\.buildLabels/);
    assert.match(crons, /internal\.fxJobs\.scoreModels/);
    assert.match(crons, /internal\.fxJobs\.scorePredictions/);
    assert.match(crons, /internal\.fxJobs\.generatePredictions/);
    assert.match(crons, /internal\.fxJobs\.fetchObservations/);
    assert.match(crons, /layers: "nowcast"/);
  });

  it("fans out scrape per spot instead of scraping the whole coast in one action", () => {
    const ingest = read("convex/ingest.ts");
    assert.match(ingest, /internal\.ingest\.scrapeSpot/);
    assert.match(ingest, /SPOT_STAGGER_MS/);
    assert.match(ingest, /webcamOnly/);
  });

  it("drops scraper and fx services from render.yaml", () => {
    const render = read("render.yaml");
    assert.doesNotMatch(render, /waterman-scraper/);
    assert.doesNotMatch(render, /waterman-fx-openmeteo/);
    assert.doesNotMatch(render, /waterman-fx-labels/);
    assert.doesNotMatch(render, /waterman-fx-observations/);
    assert.doesNotMatch(render, /waterman-fx-nowcast/);
    assert.match(render, /name: waterman/);
  });

  it("does not add D1 or a second database", () => {
    const ingest = read("convex/ingest.ts");
    const fx = read("convex/fxJobs.ts");
    assert.doesNotMatch(ingest, /D1|durable.?object|KV /i);
    assert.doesNotMatch(fx, /D1|durable.?object/i);
  });
});
