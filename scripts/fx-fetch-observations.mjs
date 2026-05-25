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
    if (obs.quality === "suspect") {
      skippedCount += 1;
      continue;
    }
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
  skippedCount += result.skipped;

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
