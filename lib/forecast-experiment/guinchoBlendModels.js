import { classifyWindRegime, WIND_REGIME_NORTADA } from "./modelSkillAnalysis.js";
import { effectiveWindKnots } from "./units.js";
import {
  GUINCHO_MODEL_SLUGS,
  GUINCHO_VOTE_MODELS,
  RIDEABLE_KNOTS,
  ROUTER_MODEL_SLUG,
  ROUTER_TIEBREAK_MODEL,
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
