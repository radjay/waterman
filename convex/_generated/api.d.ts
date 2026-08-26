/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _archive_addLiveReports from "../_archive/addLiveReports.js";
import type * as _archive_addSpotCoordinates from "../_archive/addSpotCoordinates.js";
import type * as _archive_addWebcams from "../_archive/addWebcams.js";
import type * as _archive_fixConfig from "../_archive/fixConfig.js";
import type * as _archive_migrate from "../_archive/migrate.js";
import type * as _archive_updateCarcavelosConfig from "../_archive/updateCarcavelosConfig.js";
import type * as _archive_updateStats from "../_archive/updateStats.js";
import type * as addKitesurfing from "../addKitesurfing.js";
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as calendar from "../calendar.js";
import type * as crons from "../crons.js";
import type * as forecastExperiment from "../forecastExperiment.js";
import type * as fxJobs from "../fxJobs.js";
import type * as historyRetention from "../historyRetention.js";
import type * as ingest from "../ingest.js";
import type * as journal from "../journal.js";
import type * as models from "../models.js";
import type * as openrouter from "../openrouter.js";
import type * as personalization from "../personalization.js";
import type * as prompts from "../prompts.js";
import type * as queryHelpers_conditionScores from "../queryHelpers/conditionScores.js";
import type * as queryHelpers_forecastSlots from "../queryHelpers/forecastSlots.js";
import type * as scoreRetention from "../scoreRetention.js";
import type * as seed from "../seed.js";
import type * as seedScoringPrompts from "../seedScoringPrompts.js";
import type * as spots from "../spots.js";
import type * as stations from "../stations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_archive/addLiveReports": typeof _archive_addLiveReports;
  "_archive/addSpotCoordinates": typeof _archive_addSpotCoordinates;
  "_archive/addWebcams": typeof _archive_addWebcams;
  "_archive/fixConfig": typeof _archive_fixConfig;
  "_archive/migrate": typeof _archive_migrate;
  "_archive/updateCarcavelosConfig": typeof _archive_updateCarcavelosConfig;
  "_archive/updateStats": typeof _archive_updateStats;
  addKitesurfing: typeof addKitesurfing;
  admin: typeof admin;
  auth: typeof auth;
  calendar: typeof calendar;
  crons: typeof crons;
  forecastExperiment: typeof forecastExperiment;
  fxJobs: typeof fxJobs;
  historyRetention: typeof historyRetention;
  ingest: typeof ingest;
  journal: typeof journal;
  models: typeof models;
  openrouter: typeof openrouter;
  personalization: typeof personalization;
  prompts: typeof prompts;
  "queryHelpers/conditionScores": typeof queryHelpers_conditionScores;
  "queryHelpers/forecastSlots": typeof queryHelpers_forecastSlots;
  scoreRetention: typeof scoreRetention;
  seed: typeof seed;
  seedScoringPrompts: typeof seedScoringPrompts;
  spots: typeof spots;
  stations: typeof stations;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
