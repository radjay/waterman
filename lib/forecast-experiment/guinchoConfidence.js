import { GUINCHO_VOTE_MODELS, RIDEABLE_KNOTS, SESSION_MIN_HOURS } from "./guinchoModelSkillConstants.js";

function round1(value) {
  return Math.round(value * 10) / 10;
}

function hourEffective(forecast) {
  const speed = forecast?.windSpeedKnots;
  const gust = forecast?.windGustKnots;
  if (Number.isFinite(speed) && Number.isFinite(gust)) return (speed + gust) / 2;
  if (Number.isFinite(speed)) return speed;
  if (Number.isFinite(gust)) return gust;
  return undefined;
}

/**
 * Buckets session days by how many of the three vote members called the
 * day's go hours (unanimous "3" / majority "2" / single dissent "1" /
 * "no-call" when the majority never reaches SESSION_MIN_HOURS), and reports
 * the false-call and miss rate within each bucket, using majority vote
 * (>= 2 of 3 per hour) as the day's official call.
 */
export function computeAgreementReliability(observedHours, forecastIndex, leadDay, {
  models = GUINCHO_VOTE_MODELS,
  threshold = RIDEABLE_KNOTS,
  sessionMinHours = SESSION_MIN_HOURS,
} = {}) {
  const byDate = new Map();
  for (const hour of observedHours) {
    const perModelGo = models.map((model) => {
      const forecast = forecastIndex.get(`${model}:${leadDay}:${hour.validTime}`);
      const effective = hourEffective(forecast);
      return Number.isFinite(effective) ? effective >= threshold : null;
    });
    if (perModelGo.some((value) => value === null)) continue;
    if (!byDate.has(hour.dateLocal)) byDate.set(hour.dateLocal, { agreementCounts: [], majorityGoHours: 0, actualGoHours: 0 });
    const day = byDate.get(hour.dateLocal);
    const goCount = perModelGo.filter(Boolean).length;
    day.agreementCounts.push(goCount);
    if (goCount >= 2) day.majorityGoHours += 1;
    if (hour.effectiveWindKnots >= threshold) day.actualGoHours += 1;
  }

  const byBucket = new Map();
  for (const day of byDate.values()) {
    const called = day.majorityGoHours >= sessionMinHours;
    const actual = day.actualGoHours >= sessionMinHours;
    if (!called && !actual) continue;
    const bucketKey = called ? String(mode(day.agreementCounts.filter((count) => count >= 2))) : "no-call";
    if (!byBucket.has(bucketKey)) byBucket.set(bucketKey, { days: 0, falseGoDays: 0, missedDays: 0 });
    const bucket = byBucket.get(bucketKey);
    bucket.days += 1;
    if (called && !actual) bucket.falseGoDays += 1;
    if (actual && !called) bucket.missedDays += 1;
  }

  return [...byBucket.entries()]
    .map(([agreementBucket, stats]) => ({
      agreementBucket,
      days: stats.days,
      falseGoDayPct: stats.days ? round1((100 * stats.falseGoDays) / stats.days) : undefined,
      missedPct: stats.days ? round1((100 * stats.missedDays) / stats.days) : undefined,
    }))
    .sort((a, b) => a.agreementBucket.localeCompare(b.agreementBucket));
}

function mode(values) {
  if (!values.length) return undefined;
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
