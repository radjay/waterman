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

  // Phase 5 5.2 — event-driven nowcast trigger from fresh Cabo observations.
  // After ingesting new Cabo Raso data for the current Lisbon local day,
  // ask the Convex hook if a nowcast follow-up is recommended. If yes,
  // immediately run the generator (it will produce a nowcast-mode prediction
  // because fresh Cabo will be visible, and it is cheap to no-op otherwise).
  // This gives rapid tightening of the "today" window as live station data arrives.
  // The 15–30 min Render safety-net cron (to be added) guarantees progress even
  // if this path is delayed.
  const hasFreshCaboRasoToday = observations.some((o) => {
    if (o.locationSlug !== "cabo-raso") return false;
    const obsDate = new Date(o.observedAt).toLocaleDateString("en-CA", { timeZone: "Europe/Lisbon" });
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Lisbon" });
    return obsDate === today;
  });

  if (hasFreshCaboRasoToday) {
    try {
      const trigger = await convex.mutation(api.forecastExperiment.requestNowcastFollowUpIfRecommended);
      if (trigger?.acted && trigger.recommendation?.nextRunInMinutes) {
        console.log(
          `[fx-observations] Phase 5 Nowcast follow-up recommended (${trigger.recommendation.nextRunInMinutes} min) — spawning immediate generator run`
        );
        // Spawn the generator synchronously for the follow-up. It re-queries fresh Cabo
        // and will emit a nowcast prediction + a fresh rerunRecommendation if still applicable.
        // Using the same script keeps all mode / conservative / calibration logic in one place.
        const { execSync } = await import("child_process");
        execSync("node scripts/fx-generate-predictions.mjs", {
          stdio: "inherit",
          env: process.env,
        });
      }
    } catch (triggerErr) {
      // Non-fatal — the safety-net cron will still pick up the recommendation later.
      console.error("[fx-observations] Nowcast follow-up trigger failed (non-fatal):", triggerErr.message);
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
