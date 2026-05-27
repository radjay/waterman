import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_BAY_WIND_ML_MODEL } from "./bayWindMlModelDefaults.js";

export { DEFAULT_BAY_WIND_ML_MODEL } from "./bayWindMlModelDefaults.js";

const MODEL_PATH = join(process.cwd(), "data/forecast-experiment/bay-wind-v3-model.json");

let cachedModel;

export function loadBayWindMlModel({ modelPath = MODEL_PATH } = {}) {
  if (cachedModel && modelPath === MODEL_PATH) return cachedModel;
  try {
    const raw = readFileSync(modelPath, "utf8");
    cachedModel = JSON.parse(raw);
    return cachedModel;
  } catch {
    return DEFAULT_BAY_WIND_ML_MODEL;
  }
}

export function clearBayWindMlModelCache() {
  cachedModel = undefined;
}
