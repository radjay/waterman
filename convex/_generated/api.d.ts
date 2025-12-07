/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as addWebcams from "../addWebcams.js";
import type * as calendar from "../calendar.js";
import type * as fixConfig from "../fixConfig.js";
import type * as migrate from "../migrate.js";
import type * as seed from "../seed.js";
import type * as spots from "../spots.js";
import type * as updateCarcavelosConfig from "../updateCarcavelosConfig.js";
import type * as updateStats from "../updateStats.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  addWebcams: typeof addWebcams;
  calendar: typeof calendar;
  fixConfig: typeof fixConfig;
  migrate: typeof migrate;
  seed: typeof seed;
  spots: typeof spots;
  updateCarcavelosConfig: typeof updateCarcavelosConfig;
  updateStats: typeof updateStats;
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
