import {
  BACKTEST_FORECAST_MODEL_BLENDED,
  BACKTEST_FORECAST_MODEL_ML,
} from "./backtest.js";
import { buildBayWindPredictionV2 } from "./bayWindPrediction.js";
import { buildBayWindPredictionV3, resolveMlModelVersion } from "./bayWindPredictionMl.js";
import { buildBayWindPredictionV4 } from "./bayWindPredictionV4.js";
import { DEFAULT_BAY_WIND_COEFFICIENTS, DEFAULT_FORECAST_MODEL } from "./bayWindCoefficients.js";
import { DEFAULT_BAY_WIND_ML_MODEL } from "./bayWindMlModelDefaults.js";
import { buildBaselinePrediction } from "./prediction.js";
import {
  PREDICTION_MODEL_V1,
  PREDICTION_MODEL_V2,
  PREDICTION_MODEL_V3,
  PREDICTION_MODEL_V4,
} from "./predictionBacktestConstants.js";

export {
  PREDICTION_MODEL_V1,
  PREDICTION_MODEL_V2,
  PREDICTION_MODEL_V3,
  PREDICTION_MODEL_V4,
};

export function resolvePredictionBacktestConfig(modelVersion, { coefficients, mlModel } = {}) {
  if (modelVersion === PREDICTION_MODEL_V4) {
    const model = mlModel ?? DEFAULT_BAY_WIND_ML_MODEL;
    return {
      buildPrediction: buildBayWindPredictionV4,
      predictionOptions: {
        coefficients: coefficients ?? DEFAULT_BAY_WIND_COEFFICIENTS,
        mlModel: model,
        mode: "day-ahead",
      },
      forecastModel: BACKTEST_FORECAST_MODEL_ML,
      modelVersionLabel: "bay-wind-v4-ensemble",
    };
  }

  if (modelVersion === PREDICTION_MODEL_V3) {
    const model = mlModel ?? DEFAULT_BAY_WIND_ML_MODEL;
    return {
      buildPrediction: buildBayWindPredictionV3,
      predictionOptions: {
        model,
      },
      forecastModel: BACKTEST_FORECAST_MODEL_ML,
      modelVersionLabel: resolveMlModelVersion(model),
    };
  }

  if (modelVersion === PREDICTION_MODEL_V2) {
    return {
      buildPrediction: buildBayWindPredictionV2,
      predictionOptions: {
        coefficients: coefficients ?? DEFAULT_BAY_WIND_COEFFICIENTS,
        mode: "day-ahead",
      },
      forecastModel: DEFAULT_FORECAST_MODEL,
      modelVersionLabel: "bay-wind-v2",
    };
  }

  return {
    buildPrediction: buildBaselinePrediction,
    predictionOptions: {},
    forecastModel: BACKTEST_FORECAST_MODEL_BLENDED,
    modelVersionLabel: "baseline-ensemble-v1",
  };
}
