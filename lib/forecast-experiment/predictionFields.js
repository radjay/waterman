/** ML-predicted kick-in timestamp (ms). Reads legacy kickInP50At when present. */
export function getPredictedKickInAt(prediction) {
  if (!prediction) return undefined;
  if (prediction.predictedKickInAt != null) return prediction.predictedKickInAt;
  return prediction.kickInP50At;
}

/** Earliest kick-in timestamp we stored for a local day (stable chart marker + backtest anchor). */
export function resolveStoredKickInAtMs(predictions, dateLocal) {
  let earliest;
  for (const prediction of predictions ?? []) {
    if (prediction.forecastDateLocal !== dateLocal) continue;
    const kickIn = getPredictedKickInAt(prediction);
    if (kickIn == null) continue;
    if (earliest == null || kickIn < earliest) earliest = kickIn;
  }
  return earliest;
}

/** Kick-in from the most recently generated stored prediction for a local day. */
export function resolveLatestStoredKickInAtMs(predictions, dateLocal) {
  let latestPrediction;
  for (const prediction of predictions ?? []) {
    if (prediction.forecastDateLocal !== dateLocal) continue;
    const kickIn = getPredictedKickInAt(prediction);
    if (kickIn == null) continue;
    if (!latestPrediction || prediction.generatedAt > latestPrediction.generatedAt) {
      latestPrediction = prediction;
    }
  }
  return latestPrediction ? getPredictedKickInAt(latestPrediction) : undefined;
}

/** Earliest + latest kick-in for chart display and backtest comparison. */
export function resolveKickInHistory({ liveKickInMs, storedPredictions, dateLocal }) {
  const earliestStored = resolveStoredKickInAtMs(storedPredictions, dateLocal);
  const latestStored = resolveLatestStoredKickInAtMs(storedPredictions, dateLocal);
  const earliestKickInAtMs = earliestStored ?? liveKickInMs;
  const latestKickInAtMs = latestStored ?? liveKickInMs ?? earliestKickInAtMs;
  return {
    earliestKickInAtMs,
    latestKickInAtMs,
    showBoth:
      earliestKickInAtMs != null &&
      latestKickInAtMs != null &&
      earliestKickInAtMs !== latestKickInAtMs,
  };
}

/** @deprecated Use resolveKickInHistory().earliestKickInAtMs */
export function resolveChartKickInAtMs({ liveKickInMs, storedPredictions, dateLocal }) {
  return resolveKickInHistory({ liveKickInMs, storedPredictions, dateLocal }).earliestKickInAtMs;
}

/** High-confidence kick-in (stricter probability threshold). Reads legacy kickInP75At when present. */
export function getPredictedStrongKickInAt(prediction) {
  if (!prediction) return undefined;
  if (prediction.predictedStrongKickInAt != null) return prediction.predictedStrongKickInAt;
  return prediction.kickInP75At;
}
