import { classifyWindRegime, WIND_REGIME_NORTADA } from "./modelSkillAnalysis.js";
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
 * Fingerprint one day at one lead: consensus direction bucket (majority of
 * the four real models' own forecast direction that day), season, and each
 * model's own go/no-go call for the day (>= SESSION_MIN_HOURS go hours).
 */
export function fingerprintDay(dateLocal, dayHours, forecastIndex, leadDay, { models = GUINCHO_MODEL_SLUGS } = {}) {
  let nortadaVotes = 0;
  let otherVotes = 0;
  for (const hour of dayHours) {
    const forecast = forecastIndex.get(`${models[0]}:${leadDay}:${hour.validTime}`);
    if (classifyWindRegime(forecast?.windDirectionDeg) === WIND_REGIME_NORTADA) nortadaVotes += 1;
    else otherVotes += 1;
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

/** k nearest historical analogs by exact fingerprint key, falling back to regime+season. */
export function findAnalogDays(target, allFingerprints, { k = 20 } = {}) {
  const exact = allFingerprints.filter((day) => day.key === target.key && day.dateLocal !== target.dateLocal);
  if (exact.length >= k) return exact.slice(0, k);
  const fallback = allFingerprints.filter(
    (day) =>
      day.dateLocal !== target.dateLocal &&
      day.regime === target.regime &&
      day.season === target.season &&
      day.key !== target.key
  );
  return [...exact, ...fallback].slice(0, k);
}
