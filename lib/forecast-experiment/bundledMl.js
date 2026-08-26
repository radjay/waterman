import forecastModel from "../../data/forecast-experiment/bay-wind-v3-model.json" with { type: "json" };
import nowcastModel from "../../data/forecast-experiment/bay-wind-v3-nowcast-model.json" with { type: "json" };
import coefficientsJson from "../../data/forecast-experiment/bay-wind-v2-coefficients.json" with { type: "json" };
import { DEFAULT_BAY_WIND_COEFFICIENTS } from "./bayWindCoefficients.js";

export const BUNDLED_BAY_WIND_ML_MODEL = forecastModel;
export const BUNDLED_BAY_WIND_NOWCAST_ML_MODEL = nowcastModel;

export function bundledBayWindCoefficients() {
  return {
    ...DEFAULT_BAY_WIND_COEFFICIENTS,
    ...coefficientsJson,
    biasByRegimeHour: {
      ...DEFAULT_BAY_WIND_COEFFICIENTS.biasByRegimeHour,
      ...coefficientsJson.biasByRegimeHour,
    },
    lagMinutesByForecastPeak:
      coefficientsJson.lagMinutesByForecastPeak ??
      DEFAULT_BAY_WIND_COEFFICIENTS.lagMinutesByForecastPeak,
  };
}
