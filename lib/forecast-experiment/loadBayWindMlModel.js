import { readFileSync } from "node:fs";
import {
  BUNDLED_BAY_WIND_ML_MODEL,
  BUNDLED_BAY_WIND_NOWCAST_ML_MODEL,
} from "./bundledMl.js";

export { DEFAULT_BAY_WIND_ML_MODEL } from "./bayWindMlModelDefaults.js";

let cachedModel;
let cachedNowcastModel;

export function loadBayWindMlModel({ modelPath } = {}) {
  if (!modelPath) {
    if (!cachedModel) cachedModel = BUNDLED_BAY_WIND_ML_MODEL;
    return cachedModel;
  }
  try {
    return JSON.parse(readFileSync(modelPath, "utf8"));
  } catch {
    console.error(`Bay wind ML model missing at ${modelPath}; using bundled model`);
    return BUNDLED_BAY_WIND_ML_MODEL;
  }
}

/** Dedicated nowcast head (trained on --nowcast export rows). Falls back to forecast model. */
export function loadBayWindNowcastMlModel({ modelPath } = {}) {
  if (!modelPath) {
    if (!cachedNowcastModel) cachedNowcastModel = BUNDLED_BAY_WIND_NOWCAST_ML_MODEL;
    return cachedNowcastModel;
  }
  try {
    return JSON.parse(readFileSync(modelPath, "utf8"));
  } catch {
    console.error(`Bay wind nowcast model missing at ${modelPath}; using bundled nowcast model`);
    return BUNDLED_BAY_WIND_NOWCAST_ML_MODEL;
  }
}

export function clearBayWindMlModelCache() {
  cachedModel = undefined;
  cachedNowcastModel = undefined;
}
