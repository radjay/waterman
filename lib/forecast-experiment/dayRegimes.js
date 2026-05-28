/**
 * Day-level regime classification for Phase 1.2 analysis.
 *
 * Regimes:
 * - nortada: spring–autumn day with observed strong north wind at Cabo, Marina, or Guincho
 *   (any time 06:00–21:00; no marina kick-in required; any one station is enough)
 * - flat: No nortada signal and weak winds, no bay kick
 * - sea-breeze: Late bay kick with weak Cabo morning (when kick data exists)
 * - other: Residual
 */

import { isNortadaDirection } from "./modelSkillAnalysis.js";
import { normalizeObservationsForBacktest } from "./labels.js";
import { localDayWindowMs } from "./time.js";
import { effectiveWindKnots } from "./units.js";

const DEFAULT_TIMEZONE = "Europe/Lisbon";
const LATE_KICK_START_HOUR = 12;
const WEAK_CABO_THRESHOLD_FACTOR = 0.8;
const FLAT_PEAK_FACTOR = 0.7;
const SUSTAINED_GAP_MS = 45 * 60_000;

/** Nortada tagging window: March through November (spring–summer–autumn). */
export const NORTADA_SEASON_START_MONTH = 3;
export const NORTADA_SEASON_END_MONTH = 11;
export const NORTADA_DAYLIGHT_START_HOUR = 6;
export const NORTADA_DAYLIGHT_END_HOUR = 21;
/** Sustained north-wind signal threshold (regime, not rideability). */
export const NORTADA_SUSTAINED_THRESHOLD_KNOTS = 10;
/** Peak north-wind signal threshold. */
export const NORTADA_PEAK_THRESHOLD_KNOTS = 12;
/** Active nortada window: daylight readings with effective wind above this (kt). */
export const NORTADA_ACTIVE_WINDOW_MIN_KNOTS = 10;

export const REGIME_NORTADA = "nortada";
export const REGIME_FLAT = "flat";
export const REGIME_SEA_BREEZE = "sea-breeze";
export const REGIME_OTHER = "other";
export const REGIMES = [REGIME_NORTADA, REGIME_FLAT, REGIME_SEA_BREEZE, REGIME_OTHER];

export const NORTADA_STATIONS = ["cabo-raso", "cascais-bay", "guincho"];

export function localHourFromMs(ms, timezone = DEFAULT_TIMEZONE) {
  if (ms == null || !Number.isFinite(ms)) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date(ms));
  const hour = Number(Object.fromEntries(parts.map((part) => [part.type, part.value])).hour);
  return Number.isFinite(hour) ? hour : null;
}

export function isInNortadaSeason(dateLocal) {
  const month = Number(dateLocal?.slice(5, 7));
  if (!Number.isFinite(month)) return false;
  return month >= NORTADA_SEASON_START_MONTH && month <= NORTADA_SEASON_END_MONTH;
}

export function cleanObservations(observations) {
  return normalizeObservationsForBacktest(observations || [])
    .map((obs) => ({
      ...obs,
      effective: effectiveWindKnots(obs),
    }))
    .filter((obs) => obs.effective != null);
}

/** @deprecated use cleanObservations */
export function cleanCaboObservations(caboObservations) {
  return cleanObservations(caboObservations);
}

export function filterObservationsToLocalHourWindow(
  observations,
  dateLocal,
  timezone = DEFAULT_TIMEZONE,
  startHour = NORTADA_DAYLIGHT_START_HOUR,
  endHour = NORTADA_DAYLIGHT_END_HOUR
) {
  const { startAt, endAt } = localDayWindowMs(dateLocal, timezone);
  const windowStart = startAt + startHour * 3_600_000;
  const windowEnd = startAt + endHour * 3_600_000;

  return cleanObservations(observations).filter(
    (obs) => obs.observedAt >= windowStart && obs.observedAt <= windowEnd
  );
}

/**
 * Readings during the active nortada window: 06:00–21:00 Lisbon with effective wind > min kt.
 */
export function filterObservationsToActiveNortadaWindow(
  observations,
  dateLocal,
  timezone = DEFAULT_TIMEZONE,
  minEffectiveKnots = NORTADA_ACTIVE_WINDOW_MIN_KNOTS
) {
  return filterObservationsToLocalHourWindow(observations, dateLocal, timezone).filter(
    (obs) => obs.effective > minEffectiveKnots
  );
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

/** Summarize effective wind over active-window readings (> min kt during the day). */
export function summarizeActiveNortadaWindow(readings) {
  const effective = (readings || []).map((obs) => obs.effective).filter(Number.isFinite);
  if (effective.length === 0) return null;
  return {
    readingCount: effective.length,
    meanEffectiveKnots: round1(effective.reduce((sum, value) => sum + value, 0) / effective.length),
    peakEffectiveKnots: round1(Math.max(...effective)),
  };
}

/**
 * Detect strong north wind on one station during daylight hours.
 * Returns { kind: "sustained"|"peak", station, observedAt, effectiveKnots } or null.
 */
export function detectNortadaSignalInObservations(
  observations,
  {
    station = "unknown",
    sustainedThresholdKnots = NORTADA_SUSTAINED_THRESHOLD_KNOTS,
    peakThresholdKnots = NORTADA_PEAK_THRESHOLD_KNOTS,
  } = {}
) {
  const clean = cleanObservations(observations);
  if (clean.length === 0) return null;

  for (let index = 0; index < clean.length - 1; index += 1) {
    const current = clean[index];
    const next = clean[index + 1];
    if (
      current.effective >= sustainedThresholdKnots &&
      next.effective >= sustainedThresholdKnots &&
      next.observedAt - current.observedAt <= SUSTAINED_GAP_MS &&
      (isNortadaDirection(current.windDirectionDeg) ||
        isNortadaDirection(next.windDirectionDeg))
    ) {
      return {
        kind: "sustained",
        station,
        observedAt: current.observedAt,
        effectiveKnots: Math.max(current.effective, next.effective),
      };
    }
  }

  let peak = clean[0];
  for (const obs of clean) {
    if (obs.effective > peak.effective) peak = obs;
  }

  if (
    peak.effective >= peakThresholdKnots &&
    isNortadaDirection(peak.windDirectionDeg)
  ) {
    return {
      kind: "peak",
      station,
      observedAt: peak.observedAt,
      effectiveKnots: peak.effective,
    };
  }

  return null;
}

/**
 * True when any of Cabo / Marina / Guincho observed nortada during the season window.
 */
export function detectObservedNortada({
  dateLocal,
  caboObservations = [],
  marinaObservations = [],
  guinchoObservations = [],
  timezone = DEFAULT_TIMEZONE,
  sustainedThresholdKnots = NORTADA_SUSTAINED_THRESHOLD_KNOTS,
  peakThresholdKnots = NORTADA_PEAK_THRESHOLD_KNOTS,
}) {
  if (!isInNortadaSeason(dateLocal)) return null;

  const stations = [
    { station: "cabo-raso", observations: caboObservations },
    { station: "cascais-bay", observations: marinaObservations },
    { station: "guincho", observations: guinchoObservations },
  ];

  for (const { station, observations } of stations) {
    const daylight = filterObservationsToLocalHourWindow(
      observations,
      dateLocal,
      timezone
    );
    const signal = detectNortadaSignalInObservations(daylight, {
      station,
      sustainedThresholdKnots,
      peakThresholdKnots,
    });
    if (signal) return signal;
  }

  return null;
}

/**
 * First sustained north crossing before endHourLocal (legacy helper for uplift filters).
 */
export function firstSustainedNortadaCrossingBeforeHour(
  caboObservations,
  thresholdKnots,
  endHourLocal,
  dateLocal,
  timezone = DEFAULT_TIMEZONE
) {
  const { startAt } = localDayWindowMs(dateLocal, timezone);
  const cutoffAt = startAt + endHourLocal * 3_600_000;
  const earlyCabo = cleanObservations(caboObservations).filter((obs) => obs.observedAt < cutoffAt);

  for (let index = 0; index < earlyCabo.length - 1; index += 1) {
    const current = earlyCabo[index];
    const next = earlyCabo[index + 1];
    if (
      current.effective >= thresholdKnots &&
      next.effective >= thresholdKnots &&
      next.observedAt - current.observedAt <= SUSTAINED_GAP_MS &&
      (isNortadaDirection(current.windDirectionDeg) ||
        isNortadaDirection(next.windDirectionDeg))
    ) {
      return current;
    }
  }
  return undefined;
}

export function hadSustainedNortadaCaboBeforeHour(
  caboObservations,
  thresholdKnots,
  endHourLocal,
  dateLocal,
  timezone = DEFAULT_TIMEZONE
) {
  return !!firstSustainedNortadaCrossingBeforeHour(
    caboObservations,
    thresholdKnots,
    endHourLocal,
    dateLocal,
    timezone
  );
}

function peakEffectiveAcrossStations({
  caboObservations = [],
  marinaObservations = [],
  guinchoObservations = [],
}) {
  const peaks = [caboObservations, marinaObservations, guinchoObservations]
    .map((observations) => {
      const clean = cleanObservations(observations);
      if (clean.length === 0) return null;
      return Math.max(...clean.map((obs) => obs.effective));
    })
    .filter(Number.isFinite);

  if (peaks.length === 0) return null;
  return Math.max(...peaks);
}

function caboMorningPeak(caboObservations, dateLocal, timezone, endHour = LATE_KICK_START_HOUR) {
  const { startAt } = localDayWindowMs(dateLocal, timezone);
  const cutoffAt = startAt + endHour * 3_600_000;
  const morning = cleanObservations(caboObservations).filter((obs) => obs.observedAt < cutoffAt);
  if (morning.length === 0) return null;
  return Math.max(...morning.map((obs) => obs.effective));
}

/**
 * Classify a single day into a regime.
 */
export function classifyDayRegime({
  label,
  caboObservations = [],
  marinaObservations = [],
  guinchoObservations = [],
  thresholdKnots = NORTADA_PEAK_THRESHOLD_KNOTS,
  timezone = DEFAULT_TIMEZONE,
}) {
  if (label?.dayRegime && REGIMES.includes(label.dayRegime)) {
    return label.dayRegime;
  }

  const nortadaSignal = detectObservedNortada({
    dateLocal: label.dateLocal,
    caboObservations,
    marinaObservations,
    guinchoObservations,
    timezone,
  });

  if (nortadaSignal) {
    return REGIME_NORTADA;
  }

  const hasBayKick = !!label?.actualKickInAt;
  const kickInHourLocal = hasBayKick
    ? localHourFromMs(label.actualKickInAt, timezone)
    : null;
  const peakEffective = peakEffectiveAcrossStations({
    caboObservations,
    marinaObservations,
    guinchoObservations,
  });
  const caboMorning = caboMorningPeak(caboObservations, label.dateLocal, timezone);
  const caboWeakMorning =
    caboMorning != null
      ? caboMorning < thresholdKnots * WEAK_CABO_THRESHOLD_FACTOR
      : false;

  if (!hasBayKick) {
    if (peakEffective != null && peakEffective < thresholdKnots * FLAT_PEAK_FACTOR) {
      return REGIME_FLAT;
    }
    if (peakEffective == null) {
      return REGIME_OTHER;
    }
    return REGIME_OTHER;
  }

  const isLateKick = kickInHourLocal != null && kickInHourLocal >= LATE_KICK_START_HOUR;
  if (isLateKick && caboWeakMorning) {
    return REGIME_SEA_BREEZE;
  }

  return REGIME_OTHER;
}

export function buildDayRegimeTag({
  label,
  caboObservations = [],
  marinaObservations = [],
  guinchoObservations = [],
  thresholdKnots = NORTADA_PEAK_THRESHOLD_KNOTS,
  timezone = DEFAULT_TIMEZONE,
}) {
  const nortadaSignal = detectObservedNortada({
    dateLocal: label.dateLocal,
    caboObservations,
    marinaObservations,
    guinchoObservations,
    timezone,
  });

  const dayRegime = classifyDayRegime({
    label: { ...label, dayRegime: undefined },
    caboObservations,
    marinaObservations,
    guinchoObservations,
    thresholdKnots,
    timezone,
  });

  const regimeSummary = [
    `regime=${dayRegime}`,
    nortadaSignal
      ? `nortada=${nortadaSignal.station}@${localHourFromMs(nortadaSignal.observedAt, timezone)}:00 ${nortadaSignal.kind} ${nortadaSignal.effectiveKnots}kt`
      : "nortada=none",
    label.actualKickInAt
      ? `marinaKick=${localHourFromMs(label.actualKickInAt, timezone)}:00`
      : "marinaKick=none",
  ].join("; ");

  return { dayRegime, regimeSummary, nortadaSignal };
}

export function tagSeasonRegimes({
  labels,
  caboObservationsByDate = {},
  marinaObservationsByDate = {},
  guinchoObservationsByDate = {},
  thresholdKnots,
}) {
  const tagged = {};
  for (const label of labels) {
    const date = label.dateLocal;
    tagged[date] = classifyDayRegime({
      label,
      caboObservations: caboObservationsByDate?.[date] || [],
      marinaObservations: marinaObservationsByDate?.[date] || [],
      guinchoObservations: guinchoObservationsByDate?.[date] || [],
      thresholdKnots,
    });
  }
  return tagged;
}

export function computeRegimeStats(days) {
  const stats = {};
  for (const r of REGIMES) {
    stats[r] = { count: 0, falsePositive: 0, falseNegative: 0, truePositive: 0, trueNegative: 0 };
  }

  for (const day of days) {
    const r = day.regime || REGIME_OTHER;
    if (!stats[r]) continue;

    stats[r].count += 1;

    const pred = !!day.predictedRideable;
    const actual = !!day.actualRideable;

    if (pred && !actual) stats[r].falsePositive += 1;
    if (!pred && actual) stats[r].falseNegative += 1;
    if (pred && actual) stats[r].truePositive += 1;
    if (!pred && !actual) stats[r].trueNegative += 1;
  }

  for (const r of REGIMES) {
    const s = stats[r];
    s.falsePositiveRate = s.count > 0 ? s.falsePositive / s.count : 0;
    s.precision =
      s.truePositive + s.falsePositive > 0
        ? s.truePositive / (s.truePositive + s.falsePositive)
        : 0;
  }

  return stats;
}
