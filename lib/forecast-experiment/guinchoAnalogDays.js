import { WIND_REGIME_NORTADA } from "./modelSkillAnalysis.js";
import { consensusBucket } from "./guinchoBlendModels.js";
import { GUINCHO_MODEL_SLUGS, RIDEABLE_KNOTS, SESSION_MIN_HOURS } from "./guinchoModelSkillConstants.js";

// Deliberately not imported from guinchoModelSkill.js -- that file imports
// this one (fingerprintDay/findAnalogDays), so importing back would be a
// circular import. It is a one-line pure check; duplicating it here is
// cheaper than restructuring the module graph for it.
function isNortadaSeasonDate(dateLocal) {
  const month = Number(String(dateLocal).slice(5, 7));
  return month >= 5 && month <= 9;
}

function hourEffective(forecast) {
  return forecast?.effectiveWindKnots;
}

/**
 * Fingerprint one day at one lead: consensus direction bucket (per hour,
 * via `consensusBucket` -- the same majority-of-real-models vote
 * `buildRouterPoints` uses, never a single model's own direction), season,
 * and each model's own go/no-go call for the day (>= SESSION_MIN_HOURS go
 * hours).
 *
 * Returns `null` when the day has zero real forecast coverage for this
 * lead from any of `models` -- e.g. the 2022-05..2024-01 gap where the
 * station archive exists but the Open-Meteo forecast archive does not yet.
 * Such a day cannot be fingerprinted at all and must never enter the
 * analog-day candidate pool as a fabricated "other:<season>:0000" match.
 */
export function fingerprintDay(dateLocal, dayHours, forecastIndex, leadDay, { models = GUINCHO_MODEL_SLUGS } = {}) {
  const hasCoverage = dayHours.some((hour) =>
    models.some((model) => forecastIndex.has(`${model}:${leadDay}:${hour.validTime}`))
  );
  if (!hasCoverage) return null;

  let nortadaVotes = 0;
  let otherVotes = 0;
  for (const hour of dayHours) {
    const hourModels = new Map();
    for (const model of models) {
      const forecast = forecastIndex.get(`${model}:${leadDay}:${hour.validTime}`);
      if (forecast) hourModels.set(model, forecast);
    }
    const bucket = consensusBucket(hourModels, models);
    if (bucket === WIND_REGIME_NORTADA) nortadaVotes += 1;
    else if (bucket === "other") otherVotes += 1;
  }
  const regime = nortadaVotes >= otherVotes ? "nortada" : "other";
  const season = isNortadaSeasonDate(dateLocal) ? "maySep" : "octApr";
  const calls = models.map((model) => {
    const goHours = dayHours.filter((hour) => {
      const forecast = forecastIndex.get(`${model}:${leadDay}:${hour.validTime}`);
      const effective = hourEffective(forecast);
      return Number.isFinite(effective) && effective >= RIDEABLE_KNOTS;
    }).length;
    return goHours >= SESSION_MIN_HOURS ? 1 : 0;
  });
  return { dateLocal, regime, season, calls, key: `${regime}:${season}:${calls.join("")}` };
}

function byMostRecentFirst(a, b) {
  return b.dateLocal.localeCompare(a.dateLocal);
}

/**
 * k nearest historical analogs by exact fingerprint key, falling back to
 * regime+season. "Historical" means strictly before the target date --
 * never the target's own future -- and "nearest" means most recent first,
 * not earliest-in-the-archive first.
 */
export function findAnalogDays(target, allFingerprints, { k = 20 } = {}) {
  const exact = allFingerprints
    .filter((day) => day.key === target.key && day.dateLocal < target.dateLocal)
    .sort(byMostRecentFirst);
  if (exact.length >= k) return exact.slice(0, k);
  const fallback = allFingerprints
    .filter(
      (day) =>
        day.dateLocal < target.dateLocal &&
        day.regime === target.regime &&
        day.season === target.season &&
        day.key !== target.key
    )
    .sort(byMostRecentFirst);
  return [...exact, ...fallback].slice(0, k);
}
