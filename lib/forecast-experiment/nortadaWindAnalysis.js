import {
  filterObservationsToActiveNortadaWindow,
  NORTADA_STATIONS,
  REGIME_NORTADA,
  summarizeActiveNortadaWindow,
} from "./dayRegimes.js";

const DEFAULT_TIMEZONE = "Europe/Lisbon";
const MONTH_NAMES = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function round1(value) {
  return Math.round(value * 10) / 10;
}

function monthKey(dateLocal) {
  return dateLocal.slice(0, 7);
}

function calendarMonth(dateLocal) {
  return Number(dateLocal.slice(5, 7));
}

function collectDayStats({ dateLocal, observationsByStation, stations, timezone }) {
  const allReadings = [];
  const byStation = {};

  for (const station of stations) {
    const readings = filterObservationsToActiveNortadaWindow(
      observationsByStation?.[station]?.[dateLocal] || [],
      dateLocal,
      timezone
    );
    byStation[station] = summarizeActiveNortadaWindow(readings);
    allReadings.push(...readings);
  }

  const pooled = summarizeActiveNortadaWindow(allReadings);
  if (!pooled) return null;

  return { dateLocal, pooled, byStation };
}

function initMonthBucket() {
  return { days: 0, dailyMeans: [], dailyPeaks: [] };
}

function pushDay(bucket, stats) {
  bucket.days += 1;
  bucket.dailyMeans.push(stats.meanEffectiveKnots);
  bucket.dailyPeaks.push(stats.peakEffectiveKnots);
}

function finalizeBucket(bucket) {
  if (bucket.days === 0) return null;
  return {
    days: bucket.days,
    avgWindKnots: round1(bucket.dailyMeans.reduce((sum, v) => sum + v, 0) / bucket.dailyMeans.length),
    avgPeakKnots: round1(bucket.dailyPeaks.reduce((sum, v) => sum + v, 0) / bucket.dailyPeaks.length),
    maxPeakKnots: round1(Math.max(...bucket.dailyPeaks)),
  };
}

/**
 * Monthly wind stats on nortada-tagged days, using only readings > 10 kt during 06:00–21:00.
 */
export function analyzeNortadaWindByMonth({
  nortadaLabels,
  observationsByStation,
  stations = NORTADA_STATIONS,
  timezone = DEFAULT_TIMEZONE,
}) {
  const byYearMonth = new Map();
  const byCalendarMonth = new Map();
  const byYearMonthStation = Object.fromEntries(stations.map((station) => [station, new Map()]));

  for (const label of nortadaLabels) {
    if (label.dayRegime !== REGIME_NORTADA) continue;

    const dayStats = collectDayStats({
      dateLocal: label.dateLocal,
      observationsByStation,
      stations,
      timezone,
    });
    if (!dayStats) continue;

    const ym = monthKey(label.dateLocal);
    if (!byYearMonth.has(ym)) byYearMonth.set(ym, initMonthBucket());
    pushDay(byYearMonth.get(ym), dayStats.pooled);

    const cm = calendarMonth(label.dateLocal);
    if (!byCalendarMonth.has(cm)) byCalendarMonth.set(cm, initMonthBucket());
    pushDay(byCalendarMonth.get(cm), dayStats.pooled);

    for (const station of stations) {
      const stationStats = dayStats.byStation[station];
      if (!stationStats) continue;
      if (!byYearMonthStation[station].has(ym)) {
        byYearMonthStation[station].set(ym, initMonthBucket());
      }
      pushDay(byYearMonthStation[station].get(ym), stationStats);
    }
  }

  return {
    byYearMonth: Object.fromEntries(
      [...byYearMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, bucket]) => [key, finalizeBucket(bucket)])
        .filter(([, value]) => value)
    ),
    byCalendarMonth: Object.fromEntries(
      [...byCalendarMonth.entries()]
        .sort(([a], [b]) => a - b)
        .map(([key, bucket]) => [MONTH_NAMES[key], finalizeBucket(bucket)])
        .filter(([, value]) => value)
    ),
    byYearMonthStation: Object.fromEntries(
      stations.map((station) => [
        station,
        Object.fromEntries(
          [...byYearMonthStation[station].entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, bucket]) => [key, finalizeBucket(bucket)])
            .filter(([, value]) => value)
        ),
      ])
    ),
    monthNames: MONTH_NAMES,
  };
}
