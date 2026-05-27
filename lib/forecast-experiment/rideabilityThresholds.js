export const RIDEABILITY_THRESHOLD_PRESETS = {
  windfoil: 10,
  "wingfoil-light": 12,
  "wingfoil-heavy": 15,
};

export const DEFAULT_RIDEABILITY_PRESET = "wingfoil-light";

export function resolveRideabilityThreshold({ thresholdKnots, preset } = {}) {
  if (Number.isFinite(thresholdKnots)) return thresholdKnots;
  if (preset && Number.isFinite(RIDEABILITY_THRESHOLD_PRESETS[preset])) {
    return RIDEABILITY_THRESHOLD_PRESETS[preset];
  }
  return RIDEABILITY_THRESHOLD_PRESETS[DEFAULT_RIDEABILITY_PRESET];
}
