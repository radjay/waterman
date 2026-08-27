import { classifyWindRegime, WIND_REGIME_NORTADA, WIND_REGIME_NON_NORTADA } from "./modelSkillAnalysis.js";
import { effectiveWindKnots } from "./units.js";
import {
  BLEND_MEAN3_SLUG,
  BLEND_WEIGHTED_SLUG,
  GUINCHO_MODEL_SLUGS,
  GUINCHO_VOTE_MODELS,
  RIDEABLE_KNOTS,
  ROUTER_MODEL_SLUG,
  ROUTER_TIEBREAK_MODEL,
  SESSION_MIN_HOURS,
  VOTE_ANY_SLUG,
  VOTE_MAJORITY_SLUG,
} from "./guinchoModelSkillConstants.js";

const ROUTER_PRIMARY_NORTADA = "icon-eu";
const ROUTER_PRIMARY_OTHER = "icon-global";

/** Group forecast points by lead day + valid time, model -> point. */
export function indexPointsByHour(points) {
  const byHour = new Map();
  for (const point of points ?? []) {
    const key = `${point.leadDay}:${point.validTime}`;
    if (!byHour.has(key)) byHour.set(key, new Map());
    byHour.get(key).set(point.model, point);
  }
  return byHour;
}

export function parseHourKey(key) {
  const [leadDay, validTime] = key.split(":");
  return { leadDay: Number(leadDay), validTime: Number(validTime) };
}

function copyPoint(model, leadDay, validTime, source) {
  return {
    model,
    leadDay,
    validTime,
    windSpeedKnots: source.windSpeedKnots,
    windGustKnots: source.windGustKnots,
    windDirectionDeg: source.windDirectionDeg,
  };
}

/**
 * Direction-consensus bucket for one hour: majority of `models`' own
 * forecast direction, classified nortada/other. A 2-2 tie defers to
 * ROUTER_TIEBREAK_MODEL. Returns null if any voting model is missing.
 */
export function consensusBucket(hourModels, models = GUINCHO_MODEL_SLUGS) {
  let nortadaVotes = 0;
  let otherVotes = 0;
  for (const model of models) {
    const point = hourModels.get(model);
    if (!point) return null;
    if (classifyWindRegime(point.windDirectionDeg) === WIND_REGIME_NORTADA) nortadaVotes += 1;
    else otherVotes += 1;
  }
  if (nortadaVotes > otherVotes) return "nortada";
  if (otherVotes > nortadaVotes) return "other";
  const tiebreak = hourModels.get(ROUTER_TIEBREAK_MODEL);
  return classifyWindRegime(tiebreak?.windDirectionDeg) === WIND_REGIME_NORTADA ? "nortada" : "other";
}

/**
 * Router: per hour, copy ICON7's point on a consensus-nortada hour,
 * ICON13's on a consensus-other hour. Consensus uses each model's OWN
 * forecast direction, never the station's -- a real router never knows
 * the true station direction ahead of time.
 */
export function buildRouterPoints(points, { models = GUINCHO_MODEL_SLUGS } = {}) {
  const byHour = indexPointsByHour(points);
  const routerPoints = [];
  for (const [key, hourModels] of byHour) {
    const bucket = consensusBucket(hourModels, models);
    if (!bucket) continue;
    const chosenModel = bucket === "nortada" ? ROUTER_PRIMARY_NORTADA : ROUTER_PRIMARY_OTHER;
    const chosen = hourModels.get(chosenModel);
    if (!chosen) continue;
    const { leadDay, validTime } = parseHourKey(key);
    routerPoints.push(copyPoint(ROUTER_MODEL_SLUG, leadDay, validTime, chosen));
  }
  return routerPoints;
}

function maxByEffective(points) {
  return points.reduce((best, point) => {
    if (!best) return point;
    return effectiveWindKnots(point) > effectiveWindKnots(best) ? point : best;
  }, null);
}

function minByEffective(points) {
  return points.reduce((worst, point) => {
    if (!worst) return point;
    return effectiveWindKnots(point) < effectiveWindKnots(worst) ? point : worst;
  }, null);
}

/**
 * Vote: call go if >= 1 member is >= 12kt (`vote-any`) or >= 2 of 3
 * (`vote-majority`). The stand-in wind value must cross 12kt in the same
 * direction as the vote itself, per rule, per hour, because downstream
 * scoring re-derives "called" from this value's own effective wind, not a
 * separate flag: on a go hour, use the max among go-voters (guaranteed
 * >= 12); on a no-go hour, use the min across all members (guaranteed
 * < 12, since fewer members went go than the rule needed).
 */
export function buildVotePoints(points, {
  models = GUINCHO_VOTE_MODELS,
  threshold = RIDEABLE_KNOTS,
} = {}) {
  const byHour = indexPointsByHour(points);
  const votePoints = [];
  for (const [key, hourModels] of byHour) {
    const memberPoints = models.map((model) => hourModels.get(model));
    if (memberPoints.some((point) => !point)) continue;
    const goMembers = memberPoints.filter((point) => effectiveWindKnots(point) >= threshold);
    const goCount = goMembers.length;
    const { leadDay, validTime } = parseHourKey(key);
    for (const [slug, minGo] of [[VOTE_ANY_SLUG, 1], [VOTE_MAJORITY_SLUG, 2]]) {
      const called = goCount >= minGo;
      const representative = called ? maxByEffective(goMembers) : minByEffective(memberPoints);
      votePoints.push(copyPoint(slug, leadDay, validTime, representative));
    }
  }
  return votePoints;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function meanField(points, field) {
  const values = points.map((point) => point[field]).filter(Number.isFinite);
  if (!values.length) return undefined;
  return round1(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** Equal-weight mean of the three vote members' wind, per hour. */
export function buildBlendMean3Points(points, { models = GUINCHO_VOTE_MODELS } = {}) {
  const byHour = indexPointsByHour(points);
  const blendPoints = [];
  for (const [key, hourModels] of byHour) {
    const memberPoints = models.map((model) => hourModels.get(model));
    if (memberPoints.some((point) => !point)) continue;
    const { leadDay, validTime } = parseHourKey(key);
    blendPoints.push({
      model: BLEND_MEAN3_SLUG,
      leadDay,
      validTime,
      windSpeedKnots: meanField(memberPoints, "windSpeedKnots"),
      windGustKnots: meanField(memberPoints, "windGustKnots"),
      windDirectionDeg: memberPoints[0].windDirectionDeg,
    });
  }
  return blendPoints;
}

function pairsFromRealIndex(observedHours, realForecastIndex, model, leadDay) {
  const pairs = [];
  for (const hour of observedHours) {
    const forecast = realForecastIndex.get(`${model}:${leadDay}:${hour.validTime}`);
    if (!forecast || !Number.isFinite(forecast.windSpeedKnots) && !Number.isFinite(forecast.windGustKnots)) continue;
    const forecastEffective =
      forecast.effectiveWindKnots ??
      (Number.isFinite(forecast.windSpeedKnots) && Number.isFinite(forecast.windGustKnots)
        ? (forecast.windSpeedKnots + forecast.windGustKnots) / 2
        : (forecast.windSpeedKnots ?? forecast.windGustKnots));
    if (!Number.isFinite(forecastEffective)) continue;
    pairs.push({ dateLocal: hour.dateLocal, observedEffective: hour.effectiveWindKnots, forecastEffective });
  }
  return pairs;
}

function sessionF1ForPairs(pairs, { threshold = 12, sessionMinHours = SESSION_MIN_HOURS } = {}) {
  const byDate = new Map();
  for (const pair of pairs) {
    if (!byDate.has(pair.dateLocal)) byDate.set(pair.dateLocal, { called: 0, actual: 0 });
    const day = byDate.get(pair.dateLocal);
    if (pair.forecastEffective >= threshold) day.called += 1;
    if (pair.observedEffective >= threshold) day.actual += 1;
  }
  let actualDays = 0;
  let calledDays = 0;
  let hitDays = 0;
  for (const day of byDate.values()) {
    const actual = day.actual >= sessionMinHours;
    const called = day.called >= sessionMinHours;
    if (actual) actualDays += 1;
    if (called) calledDays += 1;
    if (actual && called) hitDays += 1;
  }
  const precision = calledDays ? hitDays / calledDays : 0;
  const recall = actualDays ? hitDays / actualDays : 0;
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

/**
 * Per-bucket blend weights: each vote member's own historical session F1 in
 * that station-observed direction regime, normalised to sum to 1. These are
 * constants derived once from the whole archive -- using station-observed
 * regime here does not leak anything into any forecast, because the weight
 * VALUES are applied uniformly going forward; only the per-hour CHOICE of
 * which weight set to use must come from forecast data (see
 * buildWeightedBlendPoints, which uses consensusBucket for that).
 */
export function computeDirectionWeights(observedHours, realForecastIndex, {
  models = GUINCHO_VOTE_MODELS,
  leadDay = 1,
} = {}) {
  const weights = { nortada: {}, other: {} };
  for (const [bucket, regime] of [["nortada", WIND_REGIME_NORTADA], ["other", WIND_REGIME_NON_NORTADA]]) {
    const hours = observedHours.filter((hour) => hour.regime === regime);
    const scores = models.map((model) => sessionF1ForPairs(pairsFromRealIndex(hours, realForecastIndex, model, leadDay)));
    const total = scores.reduce((sum, value) => sum + value, 0);
    models.forEach((model, index) => {
      weights[bucket][model] = total > 0 ? scores[index] / total : 1 / models.length;
    });
  }
  return weights;
}

/** Weighted average of the three vote members, weight set chosen per hour by forecast-direction consensus. */
export function buildWeightedBlendPoints(points, weights, {
  models = GUINCHO_VOTE_MODELS,
  directionModels = GUINCHO_MODEL_SLUGS,
} = {}) {
  const byHour = indexPointsByHour(points);
  const blendPoints = [];
  for (const [key, hourModels] of byHour) {
    const memberPoints = models.map((model) => hourModels.get(model));
    if (memberPoints.some((point) => !point)) continue;
    const bucket = consensusBucket(hourModels, directionModels);
    if (!bucket) continue;
    const bucketWeights = weights[bucket];
    const totalWeight = models.reduce((sum, model) => sum + (bucketWeights[model] ?? 0), 0) || 1;
    const weightedField = (field) =>
      round1(
        models.reduce((sum, model, index) => {
          const value = memberPoints[index]?.[field];
          if (!Number.isFinite(value)) return sum;
          return sum + value * ((bucketWeights[model] ?? 0) / totalWeight);
        }, 0)
      );
    const { leadDay, validTime } = parseHourKey(key);
    blendPoints.push({
      model: BLEND_WEIGHTED_SLUG,
      leadDay,
      validTime,
      windSpeedKnots: weightedField("windSpeedKnots"),
      windGustKnots: weightedField("windGustKnots"),
      windDirectionDeg: memberPoints[0].windDirectionDeg,
    });
  }
  return blendPoints;
}
