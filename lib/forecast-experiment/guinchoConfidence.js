import { GUINCHO_VOTE_MODELS, RIDEABLE_KNOTS, SESSION_MIN_HOURS } from "./guinchoModelSkillConstants.js";

function round1(value) {
  return Math.round(value * 10) / 10;
}

function hourEffective(forecast) {
  return forecast?.effectiveWindKnots;
}

/**
 * Buckets session days by how well the three vote members agreed on the
 * day's go hours, and reports the false-call and miss rate within each
 * bucket, using majority vote (>= 2 of 3 per hour) as the day's official
 * call. A day only gets a bucket once it is "called" (majority-go hours
 * reach SESSION_MIN_HOURS); the buckets are:
 *   - "3": every called hour saw all 3 members agree it was go.
 *   - "2": the day's called hours were typically a bare 2-of-3 majority
 *     (i.e. one model dissenting).
 *   - "no-call": the majority vote never reached SESSION_MIN_HOURS go
 *     hours, so the day was never called at all.
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
