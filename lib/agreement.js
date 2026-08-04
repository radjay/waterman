import { isDirectionInRange } from "./criteria";

/**
 * Per-model agreement.
 *
 * The design asks for "per-model, per-hour verdicts rather than one blended
 * score". Running the LLM scorer across 5 models x every slot is not
 * affordable, so the model votes are deterministic thresholds and the LLM score
 * stays as the score. That is also honest about what the screen claims: the
 * heading is "WHEN EACH MODEL SAYS GO", which is a threshold question, not a
 * quality judgement.
 *
 * Wind only. Windy.app serves wave data from separate models, and it is
 * byte-identical across all five wind models — so there is no model spread for
 * surfing and the grid is hidden for it entirely.
 */

/** The five wind models that return genuinely distinct series. */
export const WIND_MODELS = ["ecmwf", "gfs27_long", "iconeuro", "iconglobal", "lew"];

/**
 * Request values that must never be trusted:
 *  - gdps, cfs echo back model:"gfs27_long"        -> caught by the echo check
 *  - arome echoes "arome" but returns GFS data     -> caught only by content dedup
 *  - gfs27 echoes correctly but duplicates gfs27_long over our range
 */
export const MODEL_LABELS = {
  ecmwf: "ECMWF",
  gfs27_long: "GFS",
  gfs27: "GFS-S",
  iconeuro: "ICON-EU",
  iconglobal: "ICON",
  lew: "LEW",
};

export const modelLabel = (model) => MODEL_LABELS[model] || String(model).toUpperCase();

/**
 * Sport-level fallback thresholds, used when a spot/sport pair has no
 * spotConfigs row — coverage is known to be incomplete.
 *
 * A sport-level default is a defensible judgement about whether wind is usable
 * at all, which is exactly what the vote asks. Seeded from the existing configs
 * (wingfoil minSpeed 15 / minGust 18).
 *
 * Surf has no entry on purpose: swell suitability is almost entirely
 * spot-specific, so a sport-level default would be meaningless rather than
 * merely approximate.
 */
/** Sports whose verdict is decided by wind. Surfing is decided by swell. */
export const WIND_SPORTS = ["wingfoil", "kitesurfing"];

export const SPORT_DEFAULT_THRESHOLDS = {
  wingfoil: { minSpeed: 15, minGust: 18 },
  kitesurfing: { minSpeed: 14, minGust: 17 },
};

/**
 * Resolve the threshold for a spot/sport, falling back to the sport default.
 * @returns {{minSpeed:number,minGust:number,directionFrom?:number,directionTo?:number,isDefault:boolean}|null}
 */
export function thresholdFor(spotConfig, sport) {
  // Model votes are a WIND question, and the five models differ only in wind.
  // A surf spot whose config happens to carry minSpeed/minGust would otherwise
  // be voted on wind criteria and reported as surf agreement — the grid is
  // hidden for surfing precisely because there is no swell spread to show.
  if (!WIND_SPORTS.includes(sport)) return null;

  const hasConfig =
    spotConfig && (spotConfig.minSpeed > 0 || spotConfig.minGust > 0);

  if (hasConfig) {
    return {
      minSpeed: spotConfig.minSpeed || 0,
      minGust: spotConfig.minGust || 0,
      directionFrom: spotConfig.directionFrom,
      directionTo: spotConfig.directionTo,
      isDefault: false,
    };
  }

  const fallback = SPORT_DEFAULT_THRESHOLDS[sport];
  if (!fallback) return null;
  return { ...fallback, isDefault: true };
}

/**
 * How close a model has to get to count as "nearly".
 *
 * A hard threshold turns a two-knot spread into unanimous disagreement. At
 * Marina de Cascais the models sit at 12.2-15.6 against a 15 kn minimum: one
 * clears it and four are within a knot or two, which is a very different
 * statement from four models saying no. A binary vote reported the second.
 */
export const MARGINAL_TOLERANCE = 0.85;

export const VOTE = { YES: true, NEAR: "near", NO: false };

/**
 * Does this model call this slot good?
 *
 * Three-state, not binary. `NEAR` is a model that lands just under the bar —
 * the design gives it its own cell treatment for exactly this reason, and
 * collapsing it into "no" overstates the disagreement.
 *
 * A zero or absent threshold must never produce a vote. `matchesWingfoilCriteria`
 * uses `config.minSpeed || 0`, which silently passes every slot — that would
 * turn the agreement bars into a permanent, meaningless "5 of 5".
 *
 * @returns {true|"near"|false|null} null means "cannot say" (no usable threshold)
 */
export function modelVote(slot, threshold) {
  if (!slot || !threshold) return null;
  if (!(threshold.minSpeed > 0) && !(threshold.minGust > 0)) return null;

  const speed = slot.speed ?? 0;
  const gust = slot.gust ?? 0;
  const speedOk = speed >= threshold.minSpeed;
  const gustOk = gust >= threshold.minGust;

  // spotConfigs direction ranges are authored in DISPLAY bearings — the value
  // the UI shows via getDisplayWindDirection, which is the stored bearing + 180.
  // Comparing the raw stored value against them fails every slot: Marina de
  // Cascais stores 156 for a wind the app shows as NNW (336), and its range is
  // 315->135. That silently made every model vote "no" and reported a
  // unanimous disagreement that no model had expressed.
  const directionOk = isDirectionInRange(
    ((slot.direction ?? 0) + 180) % 360,
    threshold.directionFrom,
    threshold.directionTo
  );

  if (!directionOk) return VOTE.NO;
  if (speedOk && gustOk) return VOTE.YES;

  // Within touching distance on both, and pointing the right way.
  const speedNear = speed >= threshold.minSpeed * MARGINAL_TOLERANCE;
  const gustNear = gust >= threshold.minGust * MARGINAL_TOLERANCE;
  if (speedNear && gustNear) return VOTE.NEAR;

  return VOTE.NO;
}

export const BANDS = {
  GOOD: "good",
  SPLIT: "split",
  NO: "no",
  /**
   * Distinct from SPLIT on purpose. Absence of evidence and evidence of
   * disagreement are different answers, and the week strip gives the split
   * state its own dashed band precisely because the design treats disagreement
   * as information. Collapsing a lookup miss into that band would manufacture
   * disagreement that no model expressed.
   */
  UNKNOWN: "unknown",
};

/**
 * Agreement across models for one spot/sport/timestamp.
 *
 * @param {Array<{model:string, slot:object}>} modelSlots
 * @param {object} threshold - from thresholdFor()
 * @returns {{band:string, agreed:number, total:number,
 *   models:Array<{model:string,label:string,vote:boolean}>, outlier:string|null}}
 */
export function agreementFor(modelSlots, threshold) {
  const votes = (modelSlots || [])
    .map(({ model, slot }) => ({ model, vote: modelVote(slot, threshold) }))
    .filter((v) => v.vote !== null);

  const total = votes.length;
  if (total === 0) {
    return { band: BANDS.UNKNOWN, agreed: 0, total: 0, near: 0, models: [], outlier: null };
  }

  const agreed = votes.filter((v) => v.vote === VOTE.YES).length;
  const near = votes.filter((v) => v.vote === VOTE.NEAR).length;

  // GOOD needs a strong majority: 4 of 5.
  const goodThreshold = Math.ceil(0.8 * total);
  let band;
  if (agreed >= goodThreshold) band = BANDS.GOOD;
  // A handful of near-misses alongside a yes is a split, not a rejection —
  // the models are arguing about a knot, not about whether to go.
  else if (agreed >= 2 || (agreed >= 1 && agreed + near >= goodThreshold)) band = BANDS.SPLIT;
  else band = BANDS.NO;

  // Name the outlier only when exactly one model dissents in either direction —
  // otherwise "the outlier" is not a meaningful thing to point at.
  let outlier = null;
  if (agreed === total - 1) outlier = votes.find((v) => v.vote !== VOTE.YES)?.model ?? null;
  else if (agreed === 1) outlier = votes.find((v) => v.vote === VOTE.YES)?.model ?? null;

  return {
    band,
    agreed,
    near,
    total,
    models: votes.map((v) => ({ ...v, label: modelLabel(v.model) })),
    outlier,
  };
}

/**
 * One plain-language line about the spread, for under the grid.
 * Returns null when there is nothing worth saying.
 */
export function agreementSentence(agreement) {
  if (!agreement || agreement.band === BANDS.UNKNOWN) return null;
  const { agreed, total, outlier, band } = agreement;

  const near = agreement.near ?? 0;

  if (agreed === total && total > 1) return `All ${total} models agree.`;
  if (band === BANDS.GOOD && outlier) {
    return `${modelLabel(outlier)} is the only one that disagrees.`;
  }
  if (agreed === 1 && near >= 1 && outlier) {
    // The common real case, and the one a binary vote reported as a rout.
    return `${modelLabel(outlier)} clears the bar; ${near} other${
      near === 1 ? "" : "s"
    } come close.`;
  }
  if (band === BANDS.SPLIT) {
    return `Models are split — ${agreed} of ${total} call it on${
      near ? `, ${near} close behind` : ""
    }.`;
  }
  if (agreed === 1 && outlier) {
    return `Only ${modelLabel(outlier)} calls it on.`;
  }
  if (agreed === 0 && near > 0) {
    return `None clear the bar, though ${near} come close.`;
  }
  return `${agreed} of ${total} models call it on.`;
}

/**
 * Group per-model slot rows by timestamp.
 * @param {Array<{model:string,timestamp:number,speed:number,gust:number,direction:number}>} rows
 * @returns {Map<number, Array<{model:string, slot:object}>>}
 */
export function groupByTimestamp(rows) {
  const map = new Map();
  for (const row of rows || []) {
    if (!map.has(row.timestamp)) map.set(row.timestamp, []);
    map.get(row.timestamp).push({ model: row.model, slot: row });
  }
  return map;
}
