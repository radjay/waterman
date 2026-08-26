import { api } from "../../../convex/_generated/api.js";
import { FX_OBSERVATION_SOURCES } from "../locations.js";
import { fetchWindguruCurrentStation } from "../windguruClient.js";
import { fetchIpmaHourlyObservations, parseIpmaObservations } from "../ipmaClient.js";

export function hasFreshCaboRasoToday(observations, now = Date.now()) {
  const today = new Date(now).toLocaleDateString("en-CA", { timeZone: "Europe/Lisbon" });
  return observations.some((o) => {
    if (o.locationSlug !== "cabo-raso") return false;
    const obsDate = new Date(o.observedAt).toLocaleDateString("en-CA", {
      timeZone: "Europe/Lisbon",
    });
    return obsDate === today;
  });
}

export async function runFetchObservations({ query, mutation }) {
  const workerRunId = await mutation(api.forecastExperiment.startWorkerRun, {
    workerName: "fx-fetch-observations",
  });

  let attemptedCount = 0;
  let insertedCount = 0;
  let skippedCount = 0;

  try {
    for (const source of FX_OBSERVATION_SOURCES) {
      await mutation(api.forecastExperiment.upsertObservationSource, source);
    }

    const observations = [];
    const windguruSources = FX_OBSERVATION_SOURCES.filter(
      (source) => source.provider === "windguru" && source.enabled
    );
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

    const ipmaSources = FX_OBSERVATION_SOURCES.filter(
      (source) => source.provider === "ipma" && source.enabled
    );
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

    const result = await mutation(api.forecastExperiment.saveObservations, { observations });
    insertedCount = result.inserted;
    skippedCount += result.skipped;

    let nowcastFollowUp = false;
    if (hasFreshCaboRasoToday(observations)) {
      const trigger = await mutation(api.forecastExperiment.requestNowcastFollowUpIfRecommended, {});
      nowcastFollowUp = Boolean(trigger?.acted);
    }

    await mutation(api.forecastExperiment.finishWorkerRun, {
      workerRunId,
      status: "success",
      attemptedCount,
      insertedCount,
      skippedCount,
    });
    return { attemptedCount, insertedCount, skippedCount, nowcastFollowUp };
  } catch (error) {
    await mutation(api.forecastExperiment.finishWorkerRun, {
      workerRunId,
      status: insertedCount > 0 ? "partial" : "failed",
      attemptedCount,
      insertedCount,
      skippedCount,
      errorMessage: error.message,
    });
    throw error;
  }
}
