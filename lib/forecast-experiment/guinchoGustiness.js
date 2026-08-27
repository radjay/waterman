function round2(value) {
  return Math.round(value * 100) / 100;
}

/** Gustiness ratio = gust / speed. Undefined when speed is missing/zero or gust is missing. */
export function gustinessRatio({ windSpeedKnots, windGustKnots } = {}) {
  if (!Number.isFinite(windSpeedKnots) || windSpeedKnots <= 0) return undefined;
  if (!Number.isFinite(windGustKnots)) return undefined;
  return windGustKnots / windSpeedKnots;
}

/** MAE and bias of gustiness ratio, forecast vs observed, over the given pairs. */
export function computeGustinessSkill(pairs) {
  let sumAbs = 0;
  let sumSigned = 0;
  let count = 0;
  for (const pair of pairs) {
    const observedRatio = gustinessRatio(pair.observed);
    const forecastRatio = gustinessRatio(pair.forecast);
    if (!Number.isFinite(observedRatio) || !Number.isFinite(forecastRatio)) continue;
    sumAbs += Math.abs(forecastRatio - observedRatio);
    sumSigned += forecastRatio - observedRatio;
    count += 1;
  }
  if (!count) return { gustinessMae: undefined, gustinessBias: undefined, gustinessHours: 0 };
  return {
    gustinessMae: round2(sumAbs / count),
    gustinessBias: round2(sumSigned / count),
    gustinessHours: count,
  };
}
