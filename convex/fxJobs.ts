"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { runFetchOpenMeteo } from "../lib/forecast-experiment/jobs/runFetchOpenMeteo.js";
import { runFetchObservations } from "../lib/forecast-experiment/jobs/runFetchObservations.js";
import { runBuildLabels } from "../lib/forecast-experiment/jobs/runBuildLabels.js";
import { runScoreModels } from "../lib/forecast-experiment/jobs/runScoreModels.js";
import { runScorePredictions } from "../lib/forecast-experiment/jobs/runScorePredictions.js";
import { runGeneratePredictions } from "../lib/forecast-experiment/jobs/runGeneratePredictions.js";
import {
  BUNDLED_BAY_WIND_ML_MODEL,
  BUNDLED_BAY_WIND_NOWCAST_ML_MODEL,
  bundledBayWindCoefficients,
} from "../lib/forecast-experiment/bundledMl.js";

function store(ctx: any) {
  return {
    query: (ref: any, args: any) => ctx.runQuery(ref, args),
    mutation: (ref: any, args: any) => ctx.runMutation(ref, args),
  };
}

export const fetchOpenMeteoRuns = internalAction({
  args: {},
  handler: async (ctx) => {
    const result = await runFetchOpenMeteo({ ...store(ctx), forecastDays: 7 });
    console.log(
      `fx openmeteo: attempted ${result.attemptedCount}, inserted ${result.insertedCount}, skipped ${result.skippedCount}`
    );
    return result;
  },
});

export const fetchObservations = internalAction({
  args: {},
  handler: async (ctx) => {
    const result = await runFetchObservations(store(ctx));
    console.log(
      `fx observations: attempted ${result.attemptedCount}, inserted ${result.insertedCount}, skipped ${result.skippedCount}`
    );
    if (result.nowcastFollowUp) {
      await ctx.scheduler.runAfter(0, internal.fxJobs.generatePredictions, {
        layers: "nowcast",
      });
    }
    return result;
  },
});

export const buildLabels = internalAction({
  args: {},
  handler: async (ctx) => {
    const result = await runBuildLabels({ ...store(ctx), daysBack: 7 });
    console.log(`fx labels: attempted ${result.attemptedCount}, inserted ${result.insertedCount}`);
    return result;
  },
});

export const scoreModels = internalAction({
  args: {},
  handler: async (ctx) => {
    const result = await runScoreModels({ ...store(ctx), daysBack: 30 });
    console.log(`fx score models: attempted ${result.attemptedCount}, inserted ${result.insertedCount}`);
    return result;
  },
});

export const scorePredictions = internalAction({
  args: {},
  handler: async (ctx) => {
    const result = await runScorePredictions({ ...store(ctx), daysBack: 30 });
    console.log(
      `fx score predictions: attempted ${result.attemptedCount}, inserted ${result.insertedCount}`
    );
    return result;
  },
});

export const generatePredictions = internalAction({
  args: {
    layers: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await runGeneratePredictions({
      ...store(ctx),
      mlModel: BUNDLED_BAY_WIND_ML_MODEL,
      nowcastMlModel: BUNDLED_BAY_WIND_NOWCAST_ML_MODEL,
      coefficients: bundledBayWindCoefficients(),
      layers: args.layers ?? "both",
      predictionVersion: "v3.5",
    });
    console.log(`fx generate predictions: inserted ${result.insertedCount}`);
    return result;
  },
});
