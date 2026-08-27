import {
  aggregateHourlyObservationsWithDirection,
  aggregateCurveMetrics,
  classifyWindRegime,
  computeDailyCurveMetrics,
  computeSkillMetrics,
  WIND_REGIME_NORTADA,
  WIND_REGIME_NON_NORTADA,
} from "./modelSkillAnalysis.js";
import { localDateKey } from "./time.js";
import { effectiveWindKnots, isUsableForecastPoint, parseNumericKnots } from "./units.js";
import {
  buildBlendMean3Points,
  buildRouterPoints,
  buildVotePoints,
  buildWeightedBlendPoints,
  computeDirectionWeights,
} from "./guinchoBlendModels.js";
import { VIRTUAL_MODEL_LABELS, VIRTUAL_MODEL_SLUGS } from "./guinchoModelSkillConstants.js";
export {
  CABO_RASO_STATION_ID,
  GUINCHO_LATITUDE,
  GUINCHO_LONGITUDE,
  GUINCHO_MODELS,
  GUINCHO_MODEL_SLUGS,
  GUINCHO_SPOT_ID,
  GUINCHO_TIMEZONE,
  OVERLAP_PEER_MIN_N,
  RIDEABLE_KNOTS,
  SAMPLE_DAY_DEFAULT,
  SESSION_MIN_HOURS,
  SPOT_CHECK_BUCKETS,
  SPOT_CHECK_MIN_HOURS,
  SPOT_CHECK_PER_BUCKET,
  START_HOUR,
  END_HOUR,
  WINDY_MODEL,
  WINNER_CAVEAT,
} from "./guinchoModelSkillConstants.js";
import {
  END_HOUR,
  GUINCHO_LATITUDE,
  GUINCHO_LONGITUDE,
  GUINCHO_MODELS,
  GUINCHO_MODEL_SLUGS,
  GUINCHO_TIMEZONE,
  OVERLAP_PEER_MIN_N,
  RIDEABLE_KNOTS,
  SAMPLE_DAY_DEFAULT,
  SESSION_MIN_HOURS,
  SPOT_CHECK_BUCKETS,
  SPOT_CHECK_MIN_HOURS,
  SPOT_CHECK_PER_BUCKET,
  START_HOUR,
  WINDY_MODEL,
  WINNER_CAVEAT,
} from "./guinchoModelSkillConstants.js";

const PREVIOUS_RUNS_ENDPOINT = "https://previous-runs-api.open-meteo.com/v1/forecast";
const SCATTER_CAP = 250;

const LEAD_KEYS = {
  0: {
    speed: ["wind_speed_10m", "wind_speed_10m_previous_day0"],
    gust: ["wind_gusts_10m", "wind_gusts_10m_previous_day0"],
    direction: ["wind_direction_10m", "wind_direction_10m_previous_day0"],
  },
  1: {
    speed: ["wind_speed_10m_previous_day1"],
    gust: ["wind_gusts_10m_previous_day1"],
    direction: ["wind_direction_10m_previous_day1"],
  },
  2: {
    speed: ["wind_speed_10m_previous_day2"],
    gust: ["wind_gusts_10m_previous_day2"],
    direction: ["wind_direction_10m_previous_day2"],
  },
};

export function modelLabel(slug) {
  if (slug === WINDY_MODEL) return "Windy blended";
  if (VIRTUAL_MODEL_LABELS[slug]) return VIRTUAL_MODEL_LABELS[slug];
  return GUINCHO_MODELS.find((model) => model.slug === slug)?.windyLabel ?? slug;
}

export function leadDayFromMs(validTime, scrapeTime) {
  if (!Number.isFinite(validTime) || !Number.isFinite(scrapeTime)) return null;
  const hours = (validTime - scrapeTime) / 3_600_000;
  if (hours < 0 || hours >= 72) return null;
  return Math.floor(hours / 24);
}

export function mapStationReading(row) {
  if (!row) return null;
  return {
    observedAt: row.time,
    windSpeedKnots: row.speed,
    windGustKnots: row.gust,
    windDirectionDeg: row.direction,
  };
}

export function mapWindySlot(row) {
  if (!row) return null;
  return {
    validTime: row.timestamp,
    scrapeTimestamp: row.scrapeTimestamp,
    windSpeedKnots: row.speed,
    windGustKnots: row.gust,
    windDirectionDeg: row.direction,
  };
}

export function pickWindyByLeadHour(slots) {
  const byLead = new Map();
  for (const slot of slots ?? []) {
    const leadDay = leadDayFromMs(slot.validTime, slot.scrapeTimestamp);
    if (leadDay === null) continue;
    const leadKey = String(leadDay);
    if (!byLead.has(leadKey)) byLead.set(leadKey, new Map());
    const hours = byLead.get(leadKey);
    const previous = hours.get(slot.validTime);
    if (!previous || slot.scrapeTimestamp > previous.scrapeTimestamp) {
      hours.set(slot.validTime, slot);
    }
  }
  return byLead;
}

function firstNumeric(hourly, keys, index) {
  for (const key of keys) {
    const series = hourly?.[key];
    if (!series) continue;
    const value = parseNumericKnots(series[index]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function parseHourTime(time) {
  if (typeof time !== "string") return NaN;
  if (time.endsWith("Z") || /[+-]\d\d:\d\d$/.test(time)) return Date.parse(time);
  return Date.parse(`${time}Z`);
}

export function parsePreviousRunsHourly(json, { modelSlug }) {
  const hourly = json?.hourly;
  if (!hourly?.time) return [];
  const points = [];
  for (let index = 0; index < hourly.time.length; index += 1) {
    const validTime = parseHourTime(hourly.time[index]);
    if (!Number.isFinite(validTime)) continue;
    for (const leadDay of [0, 1, 2]) {
      const keys = LEAD_KEYS[leadDay];
      const point = {
        model: modelSlug,
        leadDay,
        validTime,
        windSpeedKnots: firstNumeric(hourly, keys.speed, index),
        windGustKnots: firstNumeric(hourly, keys.gust, index),
        windDirectionDeg: firstNumeric(hourly, keys.direction, index),
      };
      if (!isUsableForecastPoint(point)) continue;
      points.push(point);
    }
  }
  return points;
}

export function buildGuinchoPreviousRunsUrl({ startDate, endDate, openMeteoModel }) {
  const url = new URL(PREVIOUS_RUNS_ENDPOINT);
  url.searchParams.set("latitude", String(GUINCHO_LATITUDE));
  url.searchParams.set("longitude", String(GUINCHO_LONGITUDE));
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set(
    "hourly",
    [
      "wind_speed_10m",
      "wind_gusts_10m",
      "wind_direction_10m",
      "wind_speed_10m_previous_day0",
      "wind_gusts_10m_previous_day0",
      "wind_direction_10m_previous_day0",
      "wind_speed_10m_previous_day1",
      "wind_gusts_10m_previous_day1",
      "wind_direction_10m_previous_day1",
      "wind_speed_10m_previous_day2",
      "wind_gusts_10m_previous_day2",
      "wind_direction_10m_previous_day2",
    ].join(",")
  );
  url.searchParams.set("wind_speed_unit", "kn");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("models", openMeteoModel);
  return url;
}

function forecastHourFromPoint(point) {
  return {
    validTime: point.validTime,
    windSpeedKnots: point.windSpeedKnots,
    windGustKnots: point.windGustKnots,
    windDirectionDeg: point.windDirectionDeg,
    effectiveWindKnots: effectiveWindKnots(point),
    modelCount: 1,
  };
}

function indexForecast(points) {
  const index = new Map();
  for (const point of points ?? []) {
    const key = `${point.model}:${point.leadDay}:${point.validTime}`;
    index.set(key, forecastHourFromPoint(point));
  }
  return index;
}

function collectDates(observations) {
  const dates = new Set();
  for (const obs of observations ?? []) {
    if (!Number.isFinite(obs.observedAt)) continue;
    dates.add(localDateKey(obs.observedAt, GUINCHO_TIMEZONE));
  }
  return [...dates].sort();
}

function collectObservedHours(observations, datesLocal) {
  const hours = [];
  for (const dateLocal of datesLocal) {
    const dayHours = aggregateHourlyObservationsWithDirection(observations, dateLocal, {
      timezone: GUINCHO_TIMEZONE,
      startHour: START_HOUR,
      endHour: END_HOUR,
    });
    for (const hour of dayHours) {
      if (hour.sampleCount === 0) continue;
      if (!Number.isFinite(hour.effectiveWindKnots)) continue;
      hours.push({ ...hour, dateLocal, regime: classifyWindRegime(hour.windDirectionDeg) });
    }
  }
  return hours;
}

function isRideableHour(hour) {
  return hour.effectiveWindKnots >= RIDEABLE_KNOTS;
}

function pairAtHour(hour, forecastHour) {
  if (!forecastHour) return null;
  if (!Number.isFinite(forecastHour.effectiveWindKnots)) return null;
  return {
    validTime: hour.validTime,
    dateLocal: hour.dateLocal,
    regime: hour.regime,
    observed: hour,
    forecast: forecastHour,
  };
}

function peerSetForLead(forecastIndex, leadDay, modelSlugs = GUINCHO_MODEL_SLUGS) {
  return modelSlugs.filter((model) => {
    for (const key of forecastIndex.keys()) {
      if (key.startsWith(`${model}:${leadDay}:`)) return true;
    }
    return false;
  });
}

function sharedHours(observedHours, forecastIndex, models, leadDay, windyByTime = null) {
  return observedHours.filter((hour) => {
    for (const model of models) {
      if (!forecastIndex.has(`${model}:${leadDay}:${hour.validTime}`)) return false;
    }
    if (windyByTime && !windyByTime.has(hour.validTime)) return false;
    return true;
  });
}

function pairsForModel(hours, forecastIndex, model, leadDay) {
  const pairs = [];
  for (const hour of hours) {
    const pair = pairAtHour(hour, forecastIndex.get(`${model}:${leadDay}:${hour.validTime}`));
    if (pair) pairs.push(pair);
  }
  return pairs;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function meanUnder(actualValues, predictedValues) {
  let sum = 0;
  let count = 0;
  for (let index = 0; index < actualValues.length; index += 1) {
    const actual = actualValues[index];
    const predicted = predictedValues[index];
    if (!Number.isFinite(actual) || !Number.isFinite(predicted)) continue;
    sum += Math.max(0, predicted - actual);
    count += 1;
  }
  return count ? round2(sum / count) : undefined;
}

function ratioPct(num, den) {
  if (!den) return undefined;
  return round1((100 * num) / den);
}

function f1Pct(precisionPct, recallPct) {
  if (!Number.isFinite(precisionPct) || !Number.isFinite(recallPct)) return undefined;
  if (precisionPct + recallPct === 0) return 0;
  return round1((2 * precisionPct * recallPct) / (precisionPct + recallPct));
}

/**
 * Session skill: call every day the station was rideable, and do not call
 * days that were too light. Extra wind is not a miss.
 */
export function computeUnderperformance(pairs, {
  threshold = RIDEABLE_KNOTS,
  sessionMinHours = SESSION_MIN_HOURS,
} = {}) {
  let calledHours = 0;
  let actualHours = 0;
  let hitHours = 0;
  let falseGoHours = 0;
  const byDate = new Map();

  for (const pair of pairs) {
    const observed = pair.observed?.effectiveWindKnots;
    const forecast = pair.forecast?.effectiveWindKnots;
    const dateLocal = pair.dateLocal;
    if (!byDate.has(dateLocal)) byDate.set(dateLocal, { called: 0, actual: 0 });
    const day = byDate.get(dateLocal);
    const called = Number.isFinite(forecast) && forecast >= threshold;
    const actual = Number.isFinite(observed) && observed >= threshold;
    if (called) {
      calledHours += 1;
      day.called += 1;
      if (!actual) falseGoHours += 1;
    }
    if (actual) {
      actualHours += 1;
      day.actual += 1;
    }
    if (called && actual) hitHours += 1;
  }

  let actualDays = 0;
  let calledDays = 0;
  let hitDays = 0;
  let falseGoDays = 0;
  let missedDays = 0;
  for (const day of byDate.values()) {
    const actual = day.actual >= sessionMinHours;
    const called = day.called >= sessionMinHours;
    if (actual) actualDays += 1;
    if (called) calledDays += 1;
    if (actual && called) hitDays += 1;
    if (called && !actual) falseGoDays += 1;
    if (actual && !called) missedDays += 1;
  }

  const precisionPct = ratioPct(hitDays, calledDays);
  const recallPct = ratioPct(hitDays, actualDays);
  const hourPrecisionPct = ratioPct(hitHours, calledHours);
  const hourRecallPct = ratioPct(hitHours, actualHours);

  const speedUnderMae = meanUnder(
    pairs.map((pair) => pair.observed?.windSpeedKnots),
    pairs.map((pair) => pair.forecast?.windSpeedKnots)
  );
  const gustUnderMae = meanUnder(
    pairs.map((pair) => pair.observed?.windGustKnots),
    pairs.map((pair) => pair.forecast?.windGustKnots)
  );
  const underMae = meanUnder(
    pairs.map((pair) => pair.observed?.effectiveWindKnots),
    pairs.map((pair) => pair.forecast?.effectiveWindKnots)
  );

  return {
    underMae,
    speedUnderMae,
    gustUnderMae,
    calledHours,
    actualHours,
    hitHours,
    falseGoHours,
    falseGoPct: ratioPct(falseGoHours, calledHours),
    hourRecallPct,
    hourPrecisionPct,
    hourF1Pct: f1Pct(hourPrecisionPct, hourRecallPct),
    actualDays,
    calledDays,
    hitDays,
    missedDays,
    falseGoDays,
    falseGoDayPct: ratioPct(falseGoDays, calledDays),
    missedPct: ratioPct(missedDays, actualDays),
    recallPct,
    precisionPct,
    sessionF1Pct: f1Pct(precisionPct, recallPct),
  };
}

function curveFromPairs(pairs) {
  const byDate = new Map();
  for (const pair of pairs) {
    if (!byDate.has(pair.dateLocal)) byDate.set(pair.dateLocal, []);
    byDate.get(pair.dateLocal).push(pair);
  }
  const samples = [];
  for (const dayPairs of byDate.values()) {
    const curve = computeDailyCurveMetrics(dayPairs);
    if (curve) samples.push(curve);
  }
  return aggregateCurveMetrics(samples);
}

function rowFromPairs(model, pairs, { contextOnly = false } = {}) {
  const overall = computeSkillMetrics(pairs);
  const nortadaPairs = pairs.filter((pair) => pair.regime === WIND_REGIME_NORTADA);
  const otherPairs = pairs.filter((pair) => pair.regime === WIND_REGIME_NON_NORTADA);
  const nortada = computeSkillMetrics(nortadaPairs);
  const other = computeSkillMetrics(otherPairs);
  const under = computeUnderperformance(pairs);
  const nortadaUnder = computeUnderperformance(nortadaPairs);
  const curve = curveFromPairs(pairs);
  return {
    model,
    label: modelLabel(model),
    synthetic: VIRTUAL_MODEL_SLUGS.includes(model) || undefined,
    hours: overall.sampleCount,
    mae: overall.effective?.mae,
    rmse: overall.effective?.rmse,
    bias: overall.effective?.bias,
    speedMae: overall.speed?.mae,
    gustMae: overall.gust?.mae,
    underMae: under.underMae,
    speedUnderMae: under.speedUnderMae,
    gustUnderMae: under.gustUnderMae,
    calledHours: under.calledHours,
    actualHours: under.actualHours,
    hitHours: under.hitHours,
    falseGoHours: under.falseGoHours,
    falseGoPct: under.falseGoPct,
    hourRecallPct: under.hourRecallPct,
    hourF1Pct: under.hourF1Pct,
    actualDays: under.actualDays,
    calledDays: under.calledDays,
    hitDays: under.hitDays,
    missedDays: under.missedDays,
    falseGoDays: under.falseGoDays,
    falseGoDayPct: under.falseGoDayPct,
    missedPct: under.missedPct,
    recallPct: under.recallPct,
    precisionPct: under.precisionPct,
    sessionF1Pct: under.sessionF1Pct,
    curve: curve?.shape?.mean,
    nortadaMae: nortada.effective?.mae,
    nortadaGustMae: nortada.gust?.mae,
    otherMae: other.effective?.mae,
    nortadaFalseGoDayPct: nortadaUnder.falseGoDayPct,
    nortadaSessionF1Pct: nortadaUnder.sessionF1Pct,
    nortadaRecallPct: nortadaUnder.recallPct,
    nortadaHours: nortada.sampleCount,
    otherHours: other.sampleCount,
    contextOnly,
  };
}

function rankTuple(row) {
  if (Number.isFinite(row.sessionF1Pct) && (row.actualDays ?? 0) > 0) {
    return [
      0,
      -row.sessionF1Pct,
      -(row.recallPct ?? 0),
      row.falseGoDayPct ?? Infinity,
      row.underMae ?? Infinity,
    ];
  }
  if (Number.isFinite(row.hourF1Pct) && (row.actualHours ?? 0) > 0) {
    return [
      1,
      -row.hourF1Pct,
      -(row.hourRecallPct ?? 0),
      row.falseGoPct ?? Infinity,
      row.underMae ?? Infinity,
    ];
  }
  return [2, row.underMae ?? Infinity, row.mae ?? Infinity];
}

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const left = rankTuple(a);
    const right = rankTuple(b);
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) return left[index] - right[index];
    }
    return 0;
  });
}

function tableFor(observedHours, forecastIndex, models, leadDay, { windyByTime = null } = {}) {
  const hours = sharedHours(observedHours, forecastIndex, models, leadDay, windyByTime);
  const rows = models.map((model) => rowFromPairs(model, pairsForModel(hours, forecastIndex, model, leadDay)));
  if (windyByTime) {
    const windyPairs = hours
      .map((hour) => {
        const slot = windyByTime.get(hour.validTime);
        if (!slot) return null;
        return pairAtHour(hour, forecastHourFromPoint({ ...slot, model: WINDY_MODEL }));
      })
      .filter(Boolean);
    const contextOnly = hours.length < OVERLAP_PEER_MIN_N;
    rows.push(rowFromPairs(WINDY_MODEL, windyPairs, { contextOnly }));
  }
  return {
    hours: hours.length,
    rows: sortRows(rows),
    windyPeer: Boolean(windyByTime) && hours.length >= OVERLAP_PEER_MIN_N,
  };
}

function sampleScatter(pairs) {
  if (pairs.length <= SCATTER_CAP) {
    return pairs.map((pair) => ({
      observed: pair.observed.effectiveWindKnots,
      forecast: pair.forecast.effectiveWindKnots,
      falseGo:
        pair.forecast.effectiveWindKnots >= RIDEABLE_KNOTS &&
        pair.observed.effectiveWindKnots < RIDEABLE_KNOTS,
    }));
  }
  const step = pairs.length / SCATTER_CAP;
  const sampled = [];
  for (let i = 0; i < SCATTER_CAP; i += 1) {
    const pair = pairs[Math.floor(i * step)];
    sampled.push({
      observed: pair.observed.effectiveWindKnots,
      forecast: pair.forecast.effectiveWindKnots,
      falseGo:
        pair.forecast.effectiveWindKnots >= RIDEABLE_KNOTS &&
        pair.observed.effectiveWindKnots < RIDEABLE_KNOTS,
    });
  }
  return sampled;
}

function hasSharedForecast(hour, forecastIndex, models) {
  return models.every((model) => forecastIndex.has(`${model}:1:${hour.validTime}`));
}

function countRegimes(hours, rideableOnly) {
  let nortada = 0;
  let other = 0;
  for (const hour of hours) {
    if (rideableOnly && !isRideableHour(hour)) continue;
    if (hour.regime === WIND_REGIME_NORTADA) nortada += 1;
    else if (hour.regime === WIND_REGIME_NON_NORTADA) other += 1;
  }
  return { nortada, other };
}

function majorityRegime(hours) {
  let counts = countRegimes(hours, true);
  if (counts.nortada + counts.other < SPOT_CHECK_MIN_HOURS) {
    counts = countRegimes(hours, false);
  }
  if (counts.nortada >= counts.other && counts.nortada >= SPOT_CHECK_MIN_HOURS) {
    return { regime: "nortada", ...counts };
  }
  if (counts.other > counts.nortada && counts.other >= SPOT_CHECK_MIN_HOURS) {
    return { regime: "other", ...counts };
  }
  return null;
}

function modelCalledDay(hours, forecastIndex, model) {
  const forecastGo = hours.filter((hour) => {
    const forecast = forecastIndex.get(`${model}:1:${hour.validTime}`);
    return forecast && forecast.effectiveWindKnots >= RIDEABLE_KNOTS;
  }).length;
  return forecastGo >= SPOT_CHECK_MIN_HOURS;
}

function dayIsSessionError(hours, forecastIndex, models) {
  const actual = hours.filter(isRideableHour).length >= SPOT_CHECK_MIN_HOURS;
  return models.some((model) => {
    const called = modelCalledDay(hours, forecastIndex, model);
    return (called && !actual) || (actual && !called);
  });
}

function bucketIdForDay(dateLocal, hours) {
  const majority = majorityRegime(hours);
  if (!majority) return null;
  const season = isNortadaSeasonDate(dateLocal) ? "maySep" : "octApr";
  return `${majority.regime}-${season}`;
}

function pickSpread(dates, count) {
  if (dates.length <= count) return dates;
  if (count <= 1) return dates.slice(0, 1);
  const picked = [];
  const seen = new Set();
  for (let i = 0; i < count; i += 1) {
    const index = Math.round((i * (dates.length - 1)) / (count - 1));
    const date = dates[index];
    if (seen.has(date)) continue;
    seen.add(date);
    picked.push(date);
  }
  return picked;
}

function pickSpotCheckDates(observedHours, forecastIndex, models) {
  const hoursByDate = new Map();
  for (const hour of observedHours) {
    if (!hasSharedForecast(hour, forecastIndex, models)) continue;
    if (!hoursByDate.has(hour.dateLocal)) hoursByDate.set(hour.dateLocal, []);
    hoursByDate.get(hour.dateLocal).push(hour);
  }
  const byBucket = Object.fromEntries(
    SPOT_CHECK_BUCKETS.map((bucket) => [bucket.id, { falseGo: [], other: [] }])
  );
  for (const [dateLocal, hours] of hoursByDate) {
    const bucketId = bucketIdForDay(dateLocal, hours);
    if (!bucketId || !byBucket[bucketId]) continue;
    const pile = dayIsSessionError(hours, forecastIndex, models) ? "falseGo" : "other";
    byBucket[bucketId][pile].push(dateLocal);
  }
  const datesByBucket = {};
  const uniqueDates = [];
  const seen = new Set();
  for (const bucket of SPOT_CHECK_BUCKETS) {
    const falseGo = [...(byBucket[bucket.id]?.falseGo ?? [])].sort();
    const other = [...(byBucket[bucket.id]?.other ?? [])].sort();
    const picked = pickSpread(falseGo, SPOT_CHECK_PER_BUCKET);
    if (picked.length < SPOT_CHECK_PER_BUCKET) {
      const fill = pickSpread(
        other.filter((date) => !picked.includes(date)),
        SPOT_CHECK_PER_BUCKET - picked.length
      );
      picked.push(...fill);
    }
    if (falseGo.includes(SAMPLE_DAY_DEFAULT) || other.includes(SAMPLE_DAY_DEFAULT)) {
      if (!picked.includes(SAMPLE_DAY_DEFAULT)) {
        picked[picked.length - 1] = SAMPLE_DAY_DEFAULT;
      }
    }
    picked.sort();
    datesByBucket[bucket.id] = picked;
    for (const date of picked) {
      if (seen.has(date)) continue;
      seen.add(date);
      uniqueDates.push(date);
    }
  }
  uniqueDates.sort();
  return { datesByBucket, uniqueDates };
}

function sampleDayPayload(dateLocal, observedHours, forecastIndex, models) {
  const dayHours = observedHours
    .filter((hour) => hour.dateLocal === dateLocal)
    .sort((a, b) => a.hourLocal - b.hourLocal);
  const counts = majorityRegime(dayHours) ?? { nortada: 0, other: 0 };
  const hours = dayHours.map((hour) => {
    const modelsKt = {};
    for (const model of models) {
      const forecast = forecastIndex.get(`${model}:1:${hour.validTime}`);
      modelsKt[model] = {
        speed: forecast?.windSpeedKnots,
        gust: forecast?.windGustKnots,
      };
    }
    return {
      hourLocal: hour.hourLocal,
      observedSpeed: hour.windSpeedKnots,
      observedGust: hour.windGustKnots,
      models: modelsKt,
    };
  });
  const observedGoHours = dayHours.filter(isRideableHour).length;
  const falseSessionByModel = {};
  const missedSessionByModel = {};
  for (const model of models) {
    const forecastGo = dayHours.filter((hour) => {
      const forecast = forecastIndex.get(`${model}:1:${hour.validTime}`);
      return forecast && forecast.effectiveWindKnots >= RIDEABLE_KNOTS;
    }).length;
    const called = forecastGo >= SPOT_CHECK_MIN_HOURS;
    const actual = observedGoHours >= SPOT_CHECK_MIN_HOURS;
    falseSessionByModel[model] = called && !actual;
    missedSessionByModel[model] = actual && !called;
  }
  return {
    dateLocal,
    nortadaHours: counts.nortada,
    otherHours: counts.other,
    observedGoHours,
    falseSessionByModel,
    missedSessionByModel,
    hours,
  };
}

function monthlyCoverage(observedHours, forecastIndex, models) {
  const byMonth = new Map();
  for (const hour of observedHours) {
    const month = hour.dateLocal.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, { month, stationHours: 0, scoredHours: 0 });
    const row = byMonth.get(month);
    row.stationHours += 1;
    const scored = models.some((model) => forecastIndex.has(`${model}:1:${hour.validTime}`));
    if (scored) row.scoredHours += 1;
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function isNortadaSeasonDate(dateLocal) {
  const month = Number(String(dateLocal).slice(5, 7));
  return month >= 5 && month <= 9;
}

function compactSlice(table, peerSet) {
  const rows = (table.rows ?? []).filter((row) => peerSet.includes(row.model));
  return {
    hours: table.hours,
    rows: rows.map((row) => ({
      model: row.model,
      label: row.label,
      hours: row.hours,
      mae: row.mae,
      speedMae: row.speedMae,
      gustMae: row.gustMae,
      underMae: row.underMae,
      speedUnderMae: row.speedUnderMae,
      gustUnderMae: row.gustUnderMae,
      falseGoDayPct: row.falseGoDayPct,
      falseGoPct: row.falseGoPct,
      calledDays: row.calledDays,
      falseGoDays: row.falseGoDays,
      actualDays: row.actualDays,
      hitDays: row.hitDays,
      missedDays: row.missedDays,
      missedPct: row.missedPct,
      recallPct: row.recallPct,
      sessionF1Pct: row.sessionF1Pct,
      hourF1Pct: row.hourF1Pct,
      hourRecallPct: row.hourRecallPct,
    })),
    overall: pickSafest(rows),
    speed: pickBest(rows, "speedUnderMae"),
    gust: pickBest(rows, "gustUnderMae"),
  };
}

function pickBest(rows, key) {
  const ranked = rows
    .filter((row) => Number.isFinite(row[key]))
    .sort((a, b) => a[key] - b[key]);
  const best = ranked[0];
  if (!best) return null;
  return { model: best.model, label: best.label, mae: best[key] };
}

function pickSafest(rows) {
  const ranked = sortRows(
    (rows ?? []).filter(
      (row) =>
        !row.contextOnly &&
        ((row.actualDays ?? 0) > 0 ||
          (row.calledDays ?? 0) > 0 ||
          (row.actualHours ?? 0) > 0 ||
          (row.calledHours ?? 0) > 0)
    )
  );
  const best = ranked[0];
  if (!best) return null;
  return {
    model: best.model,
    label: best.label,
    mae: best.underMae,
    underMae: best.underMae,
    falseGoDayPct: best.falseGoDayPct,
    falseGoDays: best.falseGoDays,
    calledDays: best.calledDays,
    falseGoPct: best.falseGoPct,
    actualDays: best.actualDays,
    hitDays: best.hitDays,
    missedDays: best.missedDays,
    missedPct: best.missedPct,
    recallPct: best.recallPct,
    precisionPct: best.precisionPct,
    sessionF1Pct: best.sessionF1Pct,
    hourF1Pct: best.hourF1Pct,
    hourRecallPct: best.hourRecallPct,
  };
}

function buildWinner(table, peerSet) {
  const openRows = (table?.rows ?? []).filter((row) => peerSet.includes(row.model));
  const effective = pickSafest(openRows);
  const speed = pickBest(openRows, "speedUnderMae");
  const gust = pickBest(openRows, "gustUnderMae");
  if (!effective || openRows[0]?.hours === 0) return null;
  const nortadaOrder = [...openRows]
    .filter(
      (item) => Number.isFinite(item.nortadaSessionF1Pct) || Number.isFinite(item.nortadaFalseGoDayPct)
    )
    .sort((a, b) => {
      const aF1 = a.nortadaSessionF1Pct ?? -Infinity;
      const bF1 = b.nortadaSessionF1Pct ?? -Infinity;
      if (aF1 !== bF1) return bF1 - aF1;
      return (a.nortadaFalseGoDayPct ?? Infinity) - (b.nortadaFalseGoDayPct ?? Infinity);
    });
  const nortadaWinner = nortadaOrder[0]?.model;
  const agrees = Boolean(speed?.model && gust?.model && speed.model === gust.model);
  return {
    model: effective.model,
    label: effective.label,
    leadDay: 1,
    hoursMode: "all",
    mae: effective.underMae,
    underMae: effective.underMae,
    falseGoDayPct: effective.falseGoDayPct,
    falseGoDays: effective.falseGoDays,
    calledDays: effective.calledDays,
    falseGoPct: effective.falseGoPct,
    actualDays: effective.actualDays,
    hitDays: effective.hitDays,
    missedDays: effective.missedDays,
    missedPct: effective.missedPct,
    recallPct: effective.recallPct,
    precisionPct: effective.precisionPct,
    sessionF1Pct: effective.sessionF1Pct,
    hourF1Pct: effective.hourF1Pct,
    hourRecallPct: effective.hourRecallPct,
    bias: openRows.find((item) => item.model === effective.model)?.bias,
    hours: openRows[0].hours,
    caveat: WINNER_CAVEAT,
    agrees,
    effective,
    speed,
    gust,
    nortadaDisagrees: Boolean(nortadaWinner && nortadaWinner !== effective.model),
    nortadaWinner: nortadaWinner && nortadaWinner !== effective.model ? nortadaWinner : null,
  };
}

export function scoreGuinchoModelSkill({ observations, openMeteoPoints, windySlots = [] }) {
  const datesLocal = collectDates(observations);
  const observedHours = collectObservedHours(observations, datesLocal);
  const realForecastIndex = indexForecast(openMeteoPoints);
  const directionWeights = computeDirectionWeights(observedHours, realForecastIndex);
  const simpleVirtualPoints = [
    ...buildRouterPoints(openMeteoPoints),
    ...buildVotePoints(openMeteoPoints),
    ...buildBlendMean3Points(openMeteoPoints),
  ];
  const weightedBlendPoints = buildWeightedBlendPoints(openMeteoPoints, directionWeights);
  const forecastIndex = indexForecast([...openMeteoPoints, ...simpleVirtualPoints, ...weightedBlendPoints]);
  const windyByLead = pickWindyByLeadHour(windySlots);
  const skipped = [];
  const fullSeries = { byLead: {} };
  const overlap = { byLead: {} };
  const breakdown = { byLead: {} };
  const scatter = {};
  const leadDayMae = { rideable: {}, all: {} };

  for (const leadDay of [0, 1, 2]) {
    const peerSet = peerSetForLead(forecastIndex, leadDay);
    const missing = GUINCHO_MODEL_SLUGS.filter((model) => !peerSet.includes(model));
    for (const model of missing) skipped.push({ model, leadDay });

    const allHours = observedHours;
    const rideableHours = observedHours.filter(isRideableHour);
    const windyHours = windyByLead.get(String(leadDay)) ?? new Map();

    const allTable = tableFor(allHours, forecastIndex, peerSet, leadDay);
    const rideableTable = tableFor(rideableHours, forecastIndex, peerSet, leadDay);
    fullSeries.byLead[leadDay] = { all: allTable, rideable: rideableTable };

    const overlapAll = tableFor(allHours, forecastIndex, peerSet, leadDay, { windyByTime: windyHours });
    const overlapRideable = tableFor(rideableHours, forecastIndex, peerSet, leadDay, {
      windyByTime: windyHours,
    });
    overlap.byLead[leadDay] = { all: overlapAll, rideable: overlapRideable };

    leadDayMae.all[leadDay] = allTable.rows.map((row) => ({
      model: row.model,
      label: row.label,
      mae: row.mae,
      underMae: row.underMae,
      falseGoPct: row.falseGoPct,
      falseGoDayPct: row.falseGoDayPct,
      sessionF1Pct: row.sessionF1Pct,
      recallPct: row.recallPct,
      hours: row.hours,
      contextOnly: row.contextOnly,
    }));
    leadDayMae.rideable[leadDay] = rideableTable.rows.map((row) => ({
      model: row.model,
      label: row.label,
      mae: row.mae,
      underMae: row.underMae,
      falseGoPct: row.falseGoPct,
      falseGoDayPct: row.falseGoDayPct,
      sessionF1Pct: row.sessionF1Pct,
      recallPct: row.recallPct,
      hours: row.hours,
    }));

    const slicesFor = (hours) => ({
      nortada: compactSlice(
        tableFor(
          hours.filter((hour) => hour.regime === WIND_REGIME_NORTADA),
          forecastIndex,
          peerSet,
          leadDay
        ),
        peerSet
      ),
      other: compactSlice(
        tableFor(
          hours.filter((hour) => hour.regime === WIND_REGIME_NON_NORTADA),
          forecastIndex,
          peerSet,
          leadDay
        ),
        peerSet
      ),
      maySep: compactSlice(
        tableFor(
          hours.filter((hour) => isNortadaSeasonDate(hour.dateLocal)),
          forecastIndex,
          peerSet,
          leadDay
        ),
        peerSet
      ),
      octApr: compactSlice(
        tableFor(
          hours.filter((hour) => !isNortadaSeasonDate(hour.dateLocal)),
          forecastIndex,
          peerSet,
          leadDay
        ),
        peerSet
      ),
    });
    breakdown.byLead[leadDay] = {
      all: slicesFor(allHours),
      rideable: slicesFor(rideableHours),
    };

    scatter[leadDay] = {};
    for (const model of peerSet) {
      const pairs = pairsForModel(allHours, forecastIndex, model, leadDay);
      scatter[leadDay][model] = sampleScatter(pairs);
    }
    if (windyHours.size > 0) {
      const windyPairs = allHours
        .map((hour) => {
          const slot = windyHours.get(hour.validTime);
          if (!slot) return null;
          return pairAtHour(hour, forecastHourFromPoint({ ...slot, model: WINDY_MODEL }));
        })
        .filter(Boolean);
      scatter[leadDay][WINDY_MODEL] = sampleScatter(windyPairs);
    }
  }

  const day1Peers = peerSetForLead(forecastIndex, 1);
  const winner = buildWinner(fullSeries.byLead[1]?.all, day1Peers);
  const { datesByBucket, uniqueDates } = pickSpotCheckDates(observedHours, forecastIndex, day1Peers);
  const sampleDays = uniqueDates.map((dateLocal) =>
    sampleDayPayload(dateLocal, observedHours, forecastIndex, day1Peers)
  );
  const spotChecks = SPOT_CHECK_BUCKETS.map((bucket) => ({
    id: bucket.id,
    title: bucket.title,
    note: bucket.note,
    dates: datesByBucket[bucket.id] ?? [],
  }));

  const blendLeaderboard = { byLead: {} };
  for (const leadDay of [0, 1, 2]) {
    const combinedPeerSet = peerSetForLead(forecastIndex, leadDay, [
      ...GUINCHO_MODEL_SLUGS,
      ...VIRTUAL_MODEL_SLUGS,
    ]);
    blendLeaderboard.byLead[leadDay] = tableFor(observedHours, forecastIndex, combinedPeerSet, leadDay);
  }

  return {
    generatedAt: Date.now(),
    peerSet: day1Peers,
    skipped,
    winner,
    fullSeries,
    overlap,
    breakdown,
    leadDayMae,
    scatter,
    sampleDays,
    spotChecks,
    coverage: monthlyCoverage(observedHours, forecastIndex, day1Peers),
    blendLeaderboard,
    labels: Object.fromEntries([
      ...GUINCHO_MODELS.map((model) => [model.slug, model.windyLabel]),
      [WINDY_MODEL, "Windy blended"],
      ...Object.entries(VIRTUAL_MODEL_LABELS),
    ]),
  };
}
