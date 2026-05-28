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

export function localDayStartMs(dateLocal, timezone = "Europe/Lisbon") {
  let low = Date.parse(`${dateLocal}T00:00:00Z`) - 28 * 3_600_000;
  let high = Date.parse(`${dateLocal}T00:00:00Z`) + 28 * 3_600_000;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (localDateKey(mid, timezone) < dateLocal) low = mid + 1;
    else high = mid;
  }
  return low;
}

export function localDayWindowMs(dateLocal, timezone = "Europe/Lisbon") {
  const startAt = localDayStartMs(dateLocal, timezone);
  const endAt = localDayStartMs(addDays(dateLocal, 1), timezone);
  return { startAt, endAt };
}

export function isoWeekDateRange(year, week) {
  if (week < 1 || week > 53) {
    throw new RangeError("week must be between 1 and 53");
  }
  const jan4Day = new Date(Date.UTC(year, 0, 4)).getUTCDay() || 7;
  const mondayWeek1 = Date.UTC(year, 0, 4 - (jan4Day - 1));
  const monday = mondayWeek1 + (week - 1) * 7 * 86_400_000;
  const dates = [];
  for (let offset = 0; offset < 7; offset += 1) {
    dates.push(localDateKey(monday + offset * 86_400_000, "UTC"));
  }
  return {
    year,
    week,
    dates,
    startDateLocal: dates[0],
    endDateLocal: dates[6],
  };
}

export function formatLisbonDateTime(ms, { includeWeekday = false, includeTime = true } = {}) {
  if (ms == null) return "—";
  return new Date(ms).toLocaleString("en-GB", {
    timeZone: "Europe/Lisbon",
    ...(includeWeekday ? { weekday: "short" } : {}),
    day: "numeric",
    month: "short",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
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
