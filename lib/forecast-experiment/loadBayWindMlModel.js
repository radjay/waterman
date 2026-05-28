import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_BAY_WIND_ML_MODEL } from "./bayWindMlModelDefaults.js";

export { DEFAULT_BAY_WIND_ML_MODEL } from "./bayWindMlModelDefaults.js";

const MODEL_PATH = join(process.cwd(), "data/forecast-experiment/bay-wind-v3-model.json");
const NOWCAST_MODEL_PATH = join(
  process.cwd(),
  "data/forecast-experiment/bay-wind-v3-nowcast-model.json"
);

let cachedModel;
let cachedNowcastModel;

export function loadBayWindMlModel({ modelPath = MODEL_PATH } = {}) {
  if (cachedModel && modelPath === MODEL_PATH) return cachedModel;
  try {
    const raw = readFileSync(modelPath, "utf8");
    const parsed = JSON.parse(raw);
    if (modelPath === MODEL_PATH) cachedModel = parsed;
    return parsed;
  } catch {
    return DEFAULT_BAY_WIND_ML_MODEL;
  }
}

/** Dedicated nowcast head (trained on --nowcast export rows). Falls back to forecast model. */
export function loadBayWindNowcastMlModel({ modelPath = NOWCAST_MODEL_PATH } = {}) {
  if (cachedNowcastModel && modelPath === NOWCAST_MODEL_PATH) return cachedNowcastModel;
  try {
    const raw = readFileSync(modelPath, "utf8");
    const parsed = JSON.parse(raw);
    if (modelPath === NOWCAST_MODEL_PATH) cachedNowcastModel = parsed;
    return parsed;
  } catch {
    return loadBayWindMlModel();
  }
}

export function clearBayWindMlModelCache() {
  cachedModel = undefined;
  cachedNowcastModel = undefined;
}
