import { v } from "convex/values";
import { api } from "./_generated/api";
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
    dayRegime: v.optional(v.string()),
    regimeSummary: v.optional(v.string()),
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
      await ctx.db.insert("fx_model_skill_scores", { ...score, updatedAt: now }); // mode (if present) is already on the score object
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
    mode: v.optional(v.string()),
    thresholdKnots: v.number(),
    predictedKickInAt: v.optional(v.number()),
    predictedStrongKickInAt: v.optional(v.number()),
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

export const listPredictionsForWindow = query({
  args: {
    targetLocationSlug: v.string(),
    startDateLocal: v.string(),
    endDateLocal: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("fx_predictions")
      .withIndex("by_target_date", (q) => q.eq("targetLocationSlug", args.targetLocationSlug))
      .collect();
    return rows.filter(
      (row) =>
        row.forecastDateLocal >= args.startDateLocal &&
        row.forecastDateLocal <= args.endDateLocal
    );
  },
});

export const savePredictionScores = mutation({
  args: {
    scores: v.array(v.object({
      modelVersion: v.string(),
      locationSlug: v.string(),
      sport: v.string(),
      season: v.string(),
      thresholdKnots: v.number(),
      // Phase 5: optional mode tag (day-ahead | nowcast) for separate scoring tracking.
      mode: v.optional(v.string()),
      sampleCount: v.number(),
      kickInMaeMinutes: v.optional(v.number()),
      rideableHitRate: v.optional(v.number()),
      rideableBrier: v.optional(v.number()),
      falsePositiveCount: v.optional(v.number()),
      falseNegativeCount: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const score of args.scores) {
      await ctx.db.insert("fx_model_skill_scores", {
        provider: "prediction",
        model: score.modelVersion,
        locationSlug: score.locationSlug,
        sport: score.sport,
        season: score.season,
        regime: score.mode ?? "all",
        leadBucketHours: `${score.thresholdKnots}kt`,
        sampleCount: score.sampleCount,
        onsetMaeMinutes: score.kickInMaeMinutes,
        rideableBrier: score.rideableBrier,
        updatedAt: now,
      });
    }
    return { inserted: args.scores.length };
  },
});

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
    const filtered = rows.filter((row) => row.observedAt <= args.endAt);
    // Callers should keep windows small (see fetchObservations.js weekly chunking).
    return filtered;
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

export const listRecentReports = query({
  args: {
    locationSlug: v.string(),
    sinceAt: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("fx_user_reports")
      .withIndex("by_location_observed", (q) =>
        q.eq("locationSlug", args.locationSlug).gte("observedAt", args.sinceAt)
      )
      .take(args.limit ?? 20);
    return rows.sort((a, b) => b.observedAt - a.observedAt);
  },
});

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
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("fx_observations")
      .withIndex("by_location_observed", (q) =>
        q.eq("locationSlug", args.locationSlug).gte("observedAt", args.sinceAt)
      )
      .take(args.limit ?? 1000);
    return rows.sort((a, b) => b.observedAt - a.observedAt);
  },
});

export const experimentDashboard = query({
  args: {},
  handler: async (ctx) => {
    const caboRasoObs = await ctx.db
      .query("fx_observations")
      .withIndex("by_location_observed", (q) => q.eq("locationSlug", "cabo-raso"))
      .order("desc")
      .take(1);
    const bayReports = await ctx.db
      .query("fx_user_reports")
      .withIndex("by_location_observed", (q) => q.eq("locationSlug", "cascais-bay"))
      .order("desc")
      .take(200);
    const predictions = await ctx.db
      .query("fx_predictions")
      .withIndex("by_generated")
      .order("desc")
      .take(30);
    const bayPredictions = predictions.filter(
      (prediction) => prediction.targetLocationSlug === "cascais-bay"
    );
    const resolveMode = (prediction: { mode?: string; inputs?: { mode?: string } }) =>
      prediction.mode ?? prediction.inputs?.mode ?? null;
    const latestForMode = (mode: string) =>
      bayPredictions
        .filter((prediction) => resolveMode(prediction) === mode)
        .sort((a, b) => b.generatedAt - a.generatedAt)[0] ?? null;
    const latestDayAheadPrediction = latestForMode("day-ahead");
    const latestNowcastPrediction = latestForMode("nowcast");
    const latestBayPrediction =
      latestNowcastPrediction ?? latestDayAheadPrediction ?? bayPredictions[0] ?? null;

    // Latest daily label for the bay (used to show label source: observed / report-assisted / lag-inferred / insufficient)
    const latestBayLabel = await ctx.db
      .query("fx_daily_labels")
      .withIndex("by_location_date", (q) => q.eq("locationSlug", "cascais-bay"))
      .order("desc")
      .first();

    const workerRuns = await ctx.db
      .query("fx_worker_runs")
      .withIndex("by_status_started")
      .order("desc")
      .take(10);
    return {
      latestCaboRaso: caboRasoObs[0] ?? null,
      recentBayReports: bayReports,
      latestPredictions: predictions,
      latestBayPrediction,
      latestDayAheadPrediction,
      latestNowcastPrediction,
      latestBayLabel: latestBayLabel ?? null,
      recentWorkerRuns: workerRuns,
    };
  },
});

/**
 * Phase 5 5.2 — dedicated, clean query for the latest rerun recommendation.
 * Any future scheduler, UI poller, or external system can call this instead of
 * digging through recentWorkerRuns. Returns the most recent recommendation
 * from a successful fx-generate-predictions run (or null).
 */
export const getLatestNowcastRerunRecommendation = query({
  args: {},
  handler: async (ctx) => {
    const runs = await ctx.db
      .query("fx_worker_runs")
      .withIndex("by_status_started")
      .order("desc")
      .take(20);

    const latest = runs.find(
      (r) =>
        r.workerName === "fx-generate-predictions" &&
        r.status === "success" &&
        r.metadata?.rerunRecommendation
    );

    return latest?.metadata?.rerunRecommendation ?? null;
  },
});

/**
 * Phase 5 5.2 — event-driven nowcast follow-up hook.
 * Runs when fresh Cabo exists for today's Lisbon local date and the last
 * nowcast prediction is older than the debounce window (10 min).
 */
export const requestNowcastFollowUpIfRecommended = mutation({
  args: {},
  handler: async (ctx) => {
    const NOWCAST_DEBOUNCE_MS = 10 * 60_000;
    const CABO_FRESH_MS = 6 * 60 * 60_000;
    const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Lisbon" });

    const cabo = await ctx.db
      .query("fx_observations")
      .withIndex("by_location_observed", (q) => q.eq("locationSlug", "cabo-raso"))
      .order("desc")
      .first();

    if (!cabo) {
      return { acted: false, reason: "no-cabo" };
    }

    const caboDateKey = new Date(cabo.observedAt).toLocaleDateString("en-CA", {
      timeZone: "Europe/Lisbon",
    });
    const caboAgeMs = Date.now() - cabo.observedAt;
    if (caboDateKey !== todayKey || caboAgeMs > CABO_FRESH_MS) {
      return { acted: false, reason: "no-fresh-cabo-today" };
    }

    const recentPredictions = await ctx.db
      .query("fx_predictions")
      .withIndex("by_target_date", (q) =>
        q.eq("targetLocationSlug", "cascais-bay").eq("forecastDateLocal", todayKey)
      )
      .collect();

    const lastNowcast = recentPredictions
      .filter(
        (prediction) =>
          (prediction.mode ?? prediction.inputs?.mode) === "nowcast"
      )
      .sort((a, b) => b.generatedAt - a.generatedAt)[0];

    if (lastNowcast && Date.now() - lastNowcast.generatedAt < NOWCAST_DEBOUNCE_MS) {
      return { acted: false, reason: "debounced", lastGeneratedAt: lastNowcast.generatedAt };
    }

    const recommendation = {
      nextRunInMinutes: 15,
      reason: "Phase 5 nowcast: fresh Cabo for today — tighten window with frequent re-runs",
    };

    await ctx.db.insert("fx_worker_runs", {
      workerName: "fx-nowcast-followup-requested",
      startedAt: Date.now(),
      status: "success",
      finishedAt: Date.now(),
      metadata: {
        reason: "Phase 5 event-driven nowcast trigger from fresh Cabo",
        recommendation,
      },
    });
    return { acted: true, recommendation };
  },
});

export const debugSummary = query({
  args: {},
  handler: async (ctx) => {
    const workerRuns = await ctx.db.query("fx_worker_runs").order("desc").take(20);
    const predictions = await ctx.db.query("fx_predictions").withIndex("by_generated").order("desc").take(10);
    const skillScores = await ctx.db.query("fx_model_skill_scores").take(100);
    const observationCount = (await ctx.db.query("fx_observations").take(1)).length;
    return {
      workerRuns,
      predictions,
      skillScores,
      hasObservations: observationCount > 0,
    };
  },
});

export const purgeUnusableForecastPoints = mutation({
  args: {
    cursor: v.optional(v.string()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const pageSize = args.pageSize ?? 500;
    const page = await ctx.db
      .query("fx_forecast_points")
      .order("asc")
      .paginate({ numItems: pageSize, cursor: args.cursor ?? null });

    let deleted = 0;
    for (const point of page.page) {
      const speed = point.windSpeedKnots;
      const gust = point.windGustKnots;
      const unusable =
        (speed == null && gust == null) ||
        (speed === 0 && gust === 0);
      if (!unusable) continue;
      await ctx.db.delete(point._id);
      deleted += 1;
    }

    return {
      deleted,
      scanned: page.page.length,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

export const purgeEmptyForecastRuns = mutation({
  args: {},
  handler: async (ctx) => {
    const runs = await ctx.db.query("fx_forecast_runs").collect();
    let deletedRuns = 0;
    for (const run of runs) {
      const remaining = await ctx.db
        .query("fx_forecast_points")
        .withIndex("by_run", (q) => q.eq("forecastRunId", run._id))
        .take(1);
      if (remaining.length === 0) {
        await ctx.db.delete(run._id);
        deletedRuns += 1;
      }
    }
    return { deletedRuns };
  },
});
