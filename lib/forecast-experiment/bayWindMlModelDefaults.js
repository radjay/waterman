import { ML_FEATURE_NAMES } from "./mlFeatures.js";

const FEATURE_HOUR_START = 6;
const FEATURE_HOUR_END = 21;

/** Minimal fixture model for tests and client-side backtest when no trained artifact is loaded. */
export const DEFAULT_BAY_WIND_ML_MODEL = {
  version: 1,
  modelVersion: "bay-wind-v3-ml",
  featureNames: ML_FEATURE_NAMES,
  featureHours: Array.from({ length: FEATURE_HOUR_END - FEATURE_HOUR_START + 1 }, (_, index) => FEATURE_HOUR_START + index),
  kickInRegressor: {
    feature_names: ML_FEATURE_NAMES,
    tree_info: [
      {
        tree_index: 0,
        tree_structure: {
          split_feature: "icon7_h14_effective",
          threshold: 12,
          decision_type: "<=",
          default_left: true,
          left_child: { leaf_value: 780 },
          right_child: { leaf_value: 540 },
        },
      },
    ],
  },
  hourlyRideableClassifiers: Object.fromEntries(
    Array.from({ length: FEATURE_HOUR_END - FEATURE_HOUR_START + 1 }, (_, index) => {
      const hour = FEATURE_HOUR_START + index;
      return [
        `h${hour}`,
        {
          feature_names: ML_FEATURE_NAMES,
          tree_info: [
            {
              tree_index: 0,
              tree_structure: {
                split_feature: `icon7_h${hour}_effective`,
                threshold: 12,
                decision_type: "<=",
                default_left: true,
                left_child: { leaf_value: -2 },
                right_child: { leaf_value: 2 },
              },
            },
          ],
        },
      ];
    })
  ),
  trainingMeta: { synthetic: true },
};
