export function isoRun(ms) {
  const date = new Date(ms);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
}

export function leadHours(runStartedAt, validTime) {
  return Math.round((validTime - runStartedAt) / 3_600_000);
}

export function localDateKey(ms, timezone = "Europe/Lisbon") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function candidateGlobalRuns(nowMs = Date.now()) {
  const date = new Date(nowMs);
  date.setUTCMinutes(0, 0, 0);
  const currentHour = date.getUTCHours();
  const runHour = [18, 12, 6, 0].find((hour) => currentHour >= hour) ?? 18;
  if (runHour === 18 && currentHour < 0) date.setUTCDate(date.getUTCDate() - 1);
  date.setUTCHours(runHour);

  const runs = [];
  for (let i = 0; i < 12; i += 1) {
    runs.push(isoRun(date.getTime() - i * 6 * 3_600_000));
  }
  return runs;
}

export function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dateRangeWeeks(startDate, endDate) {
  const ranges = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    const weekEnd = addDays(cursor, 6);
    ranges.push({
      from: cursor,
      to: weekEnd <= endDate ? weekEnd : endDate,
    });
    cursor = addDays(cursor, 7);
  }
  return ranges;
}
