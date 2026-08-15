import { detectWindows } from "../../lib/windows";
import { buildDayChart } from "../../lib/dayChart";

/**
 * Fixtures for the UI kit.
 *
 * Built by running invented slots through the app's own `detectWindows`, so
 * every demo receives the exact shape the real screens receive. Hand-authored
 * window objects drifted from the real ones the moment `finaliseWindow` changed
 * — the kit then documented a component contract nothing actually used.
 *
 * Fixed timestamps, never `Date.now()`: the kit is a visual reference and a
 * screenshot target, and a page whose contents shift by the hour cannot be
 * diffed against yesterday's.
 */
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/**
 * Local midnight on a Tuesday in Lisbon (UTC+1 in July). Arbitrary but stable —
 * and it has to be MIDNIGHT, not the first slot: WeekStrip derives its axis from
 * `slot.timestamp - day.dayStart`, so anchoring the day at 06:00 shifted every
 * hour down by six and collapsed the axis to 06:00–15:00.
 */
export const T0 = Date.UTC(2026, 6, 13, 23, 0, 0);

export const slot = (dayOffset, hour, score, over = {}) => ({
  timestamp: T0 + dayOffset * DAY + hour * HOUR,
  score,
  speed: 18,
  gust: 24,
  direction: 160,
  waveHeight: 1.2,
  wavePeriod: 9,
  waveDirection: 280,
  ...over,
});

export const SPOTS = [
  { _id: "spot_guincho", name: "Praia do Guincho", liveReportUrl: null },
  { _id: "spot_lagoa", name: "Lagoa da Albufeira", liveReportUrl: null },
  { _id: "spot_marina", name: "Marina de Cascais", liveReportUrl: null },
];

const dayWindows = (offset, scores) =>
  detectWindows(scores.map(([hour, score], i) => slot(offset, hour, score)));

export const WINDOWS = [
  { spot: SPOTS[0], window: dayWindows(0, [[12, 88], [15, 92], [18, 84]])[0] },
  { spot: SPOTS[1], window: dayWindows(1, [[9, 74], [12, 71]])[0] },
  { spot: SPOTS[2], window: dayWindows(2, [[15, 66]])[0] },
];

/**
 * Six days for the week strip, shaped exactly as NextContent builds them: every
 * charted slot from 06:00 to 19:00, scored, with `detectWindows` picking out the
 * bands. Only listing the qualifying slots produced an axis that stopped at
 * 15:00 — the strip derives its axis from the slots it is given, so a partial
 * fixture documents a chart the app never draws.
 */
export const WEEK = [
  [41, 58, 88, 92, 84],
  [52, 74, 71, 55, 38],
  [22, 31, 44, 39, 28],
  [48, 62, 79, 95, 91],
  [55, 63, 58, 44, 33],
  [37, 51, 78, 81, 69],
].map((scores, i) => {
  const slots = scores.map((score, j) => slot(i, 6 + j * 3, score));
  const windows = detectWindows(slots);
  return {
    dayStart: T0 + i * DAY,
    label: ["TUE", "WED", "THU", "FRI", "SAT", "SUN"][i],
    windows,
    bestScore: slots.reduce((b, s) => (s.score > (b ?? -1) ? s.score : b), null),
    slots,
  };
});

export const HOUR_SLOTS = [
  slot(0, 12, 88),
  slot(0, 15, 92, { speed: 21, gust: 27 }),
  slot(0, 18, 84, { speed: 19, gust: 23 }),
];

export const FACTORS = { windQuality: 88, waveQuality: 62, tideQuality: 74 };

export const STATION = {
  speed: 19.4,
  gust: 25,
  directionLabel: "NNW",
  delta: 2,
  agoLabel: "8 MIN AGO",
  caption: "Windguru station 4021",
  history: [11, 13, 12, 16, 18, 17, 19, 21, 20, 19].map((speed) => ({ speed })),
};

export const RIDER_COUNT = { count: 7, previous: 4, trend: "up" };

export const MODEL_COLUMNS = [
  { timestamp: T0 + 12 * HOUR, label: "12:00" },
  { timestamp: T0 + 15 * HOUR, label: "15:00" },
  { timestamp: T0 + 18 * HOUR, label: "18:00" },
];

/* ---------------------------------------------------------- the day chart */

/**
 * A full day on the shared clock: six 3-hour slots from 07:00, wind building
 * through the afternoon and dying at dusk, with the pretend "now" at 14:20 so
 * the past/present/future treatments are all visible at once.
 *
 * Built through `buildDayChart` rather than hand-authored, for the same reason
 * the windows are built through `detectWindows`: the kit has to receive the
 * exact shape the screens receive or it documents a contract nothing uses.
 */
const DAY_SHAPE = [
  [7, 55, 9, 13, 1.1],
  [10, 70, 12, 17, 1.05],
  [13, 72, 15, 20, 0.98],
  [16, 88, 19, 24, 0.92],
  [19, 68, 16, 21, 0.85],
  [22, 34, 9, 12, 0.8],
];

export const CHART_SLOTS = DAY_SHAPE.map(([hour, score, speed, gust, waveHeight]) =>
  slot(0, hour, score, { speed, gust, waveHeight })
);

export const CHART_NOW = T0 + 14 * HOUR + 20 * 60 * 1000;

export const CHART = buildDayChart({
  slots: CHART_SLOTS,
  dayStart: T0,
  nowMs: CHART_NOW,
});

/** Two highs and a low, so the tide line has a real shape to draw. */
export const TIDES = [
  { time: T0 + 4 * HOUR, height: 1.9, type: "high" },
  { time: T0 + 10.5 * HOUR, height: 0.4, type: "low" },
  { time: T0 + 16.5 * HOUR, height: 2.1, type: "high" },
  { time: T0 + 23 * HOUR, height: 0.5, type: "low" },
];

/** A live station trail up to "now" — solid base, dashed gust. */
export const STATION_TRAIL = {
  speed: 15.6,
  gust: 20.2,
  directionLabel: "NW",
  delta: 1.4,
  agoLabel: "4 MIN AGO",
  caption: "THE SPOT",
  history: Array.from({ length: 45 }, (_, i) => {
    const time = T0 + 7 * HOUR + i * 10 * 60 * 1000;
    const t = i / 44;
    return {
      time,
      speed: 9 + t * 7 + Math.sin(i / 3) * 0.9,
      gust: 13 + t * 8 + Math.sin(i / 2) * 1.4,
    };
  }),
};

/** The per-spot shape `useCoastData` returns, for the row/card components. */
export const PACK = {
  spot: SPOTS[0],
  score: 72,
  slot: CHART_SLOTS[2],
  station: STATION_TRAIL,
  hasStationUrl: true,
  charted: CHART_SLOTS,
  tides: TIDES,
  days: [{ dayStart: T0, slots: CHART_SLOTS, windows: detectWindows(CHART_SLOTS), peak: 88 }],
};

export const PACK_NO_STATION = {
  ...PACK,
  spot: { _id: "spot_cds", name: "Praia do CDS", liveReportUrl: null },
  score: null,
  station: null,
  hasStationUrl: false,
};

/** A day in the shape SpotDayRow takes. */
export const SPOT_DAY = {
  dayStart: T0,
  label: "Today",
  slots: CHART_SLOTS,
  scored: CHART_SLOTS,
  windows: detectWindows(CHART_SLOTS),
  peak: 88,
};

/** The week strip's shared clock, derived from the first day's own slots. */
export const WEEK_CHART = buildDayChart({
  slots: WEEK[0].slots,
  dayStart: T0,
  nowMs: CHART_NOW,
});

/** Six days for the new week strip, shaped as NextContent builds them. */
export const WEEK_DAYS = WEEK.map((day, i) => ({
  ...day,
  isToday: i === 0,
  peak: day.bestScore,
  best: [...day.slots]
    .filter((s) => s.score !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((s) => ({ ...s, spotName: SPOTS[i % SPOTS.length].name })),
}));
