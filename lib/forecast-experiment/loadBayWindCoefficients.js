import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_BAY_WIND_COEFFICIENTS } from "./bayWindCoefficients.js";

const COEFFICIENTS_JSON_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../data/forecast-experiment/bay-wind-v2-coefficients.json"
);

export async function loadBayWindCoefficients() {
  if (!existsSync(COEFFICIENTS_JSON_PATH)) {
    return DEFAULT_BAY_WIND_COEFFICIENTS;
  }
  try {
    const raw = await readFile(COEFFICIENTS_JSON_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_BAY_WIND_COEFFICIENTS,
      ...parsed,
      biasByRegimeHour: {
        ...DEFAULT_BAY_WIND_COEFFICIENTS.biasByRegimeHour,
        ...parsed.biasByRegimeHour,
      },
      lagMinutesByForecastPeak:
        parsed.lagMinutesByForecastPeak ?? DEFAULT_BAY_WIND_COEFFICIENTS.lagMinutesByForecastPeak,
    };
  } catch {
    return DEFAULT_BAY_WIND_COEFFICIENTS;
  }
}
