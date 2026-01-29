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
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as calendar from "../calendar.js";
import type * as crons from "../crons.js";
import type * as prompts from "../prompts.js";
import type * as seed from "../seed.js";
import type * as seedScoringPrompts from "../seedScoringPrompts.js";
import type * as spots from "../spots.js";

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
  admin: typeof admin;
  auth: typeof auth;
  calendar: typeof calendar;
  crons: typeof crons;
  prompts: typeof prompts;
  seed: typeof seed;
  seedScoringPrompts: typeof seedScoringPrompts;
  spots: typeof spots;
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
