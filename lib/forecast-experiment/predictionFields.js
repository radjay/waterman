/** ML-predicted kick-in timestamp (ms). Reads legacy kickInP50At when present. */
export function getPredictedKickInAt(prediction) {
  if (!prediction) return undefined;
  if (prediction.predictedKickInAt != null) return prediction.predictedKickInAt;
  return prediction.kickInP50At;
}

/** High-confidence kick-in (stricter probability threshold). Reads legacy kickInP75At when present. */
export function getPredictedStrongKickInAt(prediction) {
  if (!prediction) return undefined;
  if (prediction.predictedStrongKickInAt != null) return prediction.predictedStrongKickInAt;
  return prediction.kickInP75At;
}
