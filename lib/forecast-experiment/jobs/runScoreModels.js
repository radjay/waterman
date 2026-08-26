import { api } from "../../../convex/_generated/api.js";
import { FX_LOCATIONS } from "../locations.js";
import {
  bucketLeadHours,
  meanAbsoluteError,
  rootMeanSquaredError,
  brierScore,
  forecastRideableProbability,
} from "../skill.js";
import { effectiveWindKnots } from "../units.js";

function average(values) {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function scoreLocation({ location, points, observations }) {
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
    const actualWind = average(obsRows.map((obs) => effectiveWindKnots(obs)).filter(Number.isFinite));
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
    const predicted = rows.map((row) => effectiveWindKnots(row.point));
    const probabilities = rows.map((row) =>
      forecastRideableProbability(row.point, location.defaultRideableWindKnots)
    );
    const outcomes = rows.map((row) => (row.actualWind >= location.defaultRideableWindKnots ? 1 : 0));
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

export async function runScoreModels({ query, mutation, daysBack = 30 }) {
  const workerRunId = await mutation(api.forecastExperiment.startWorkerRun, {
    workerName: "fx-score-models",
  });

  let attemptedCount = 0;
  let insertedCount = 0;

  try {
    const now = Date.now();
    const startAt = now - daysBack * 24 * 60 * 60_000;
    const endAt = now;
    const scores = [];

    for (const location of FX_LOCATIONS.filter((item) => item.role !== "context")) {
      const points = await query(api.forecastExperiment.listForecastPointsForWindow, {
        locationSlug: location.slug,
        startAt,
        endAt,
      });
      const observations = await query(api.forecastExperiment.listObservationsForWindow, {
        locationSlug: location.slug,
        startAt,
        endAt,
      });
      attemptedCount += 1;
      scores.push(...scoreLocation({ location, points, observations }));
    }

    if (scores.length > 0) {
      const result = await mutation(api.forecastExperiment.saveSkillScores, { scores });
      insertedCount = result.inserted;
    }

    await mutation(api.forecastExperiment.finishWorkerRun, {
      workerRunId,
      status: "success",
      attemptedCount,
      insertedCount,
    });
    return { attemptedCount, insertedCount };
  } catch (error) {
    await mutation(api.forecastExperiment.finishWorkerRun, {
      workerRunId,
      status: "failed",
      attemptedCount,
      insertedCount,
      errorMessage: error.message,
    });
    throw error;
  }
}
