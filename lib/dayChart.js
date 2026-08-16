import { dtf } from "./datetime";

/**
 * One day, one clock — the geometry every chart on every screen shares.
 *
 * Now, Live and Spot forecast all draw the same day on the same axis. When each
 * of them derived its own scale they disagreed by an hour twice a year (the
 * forecast grid is UTC, so slots land on 07/10/13 in Lisbon summer and
 * 06/09/12 in winter) and the now line stopped lining up with the columns it
 * was supposed to sit between. So the scale is computed once, here, from the
 * day's real slot timestamps, and the charts only render what this returns.
 *
 * The shape of a day:
 *   - six 3-hour forecast slots inside the charted hours (07..22 in summer),
 *   - drawn as six equal columns, because the data really is two numbers per
 *     slot and nothing finer,
 *   - with the now line placed on the CONTINUOUS time scale between the first
 *     and last slot hour, never snapped to a column boundary.
 */

export const TZ = "Europe/Lisbon";

/** A slot is charted when its whole block is inside the day's usable hours. */
export const CHART_FIRST_HOUR = 6;
export const CHART_LAST_HOUR = 22;

/** Forecast slots are 3-hour blocks. */
export const SLOT_MS = 3 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Left inset (px) reserved for y-axis labels on every day-chart plot.
 *
 * Shared by Wind / Waves & Tide / Score so the three stacked bands stay
 * aligned. Labels like "15kt" and "1m" sit in this gutter; bars and lines
 * start after it so they never paint under the numbers.
 */
export const PLOT_LABEL_INSET_PX = 28;

/** Local hour (0-23) of a timestamp. */
export function hourOf(ms, timeZone = TZ) {
  return Number(
    dtf("en-GB", { hour: "2-digit", hour12: false, timeZone }).format(new Date(ms))
  );
}

/** Local hour as a float, e.g. 10.5 for 10:30. */
export function hourFloatOf(ms, timeZone = TZ) {
  const parts = dtf("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(new Date(ms));
  const get = (t) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") + get("minute") / 60;
}

/** Local midnight for the day containing `ms`. */
export function dayStartOf(ms, timeZone = TZ) {
  const parts = dtf("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (t) => parts.find((p) => p.type === t).value;
  return new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00`).getTime();
}

export const sameDay = (a, b, timeZone = TZ) =>
  dayStartOf(a, timeZone) === dayStartOf(b, timeZone);

/** "07" / "07:00" for an hour number. */
export const hourLabel = (h, withMinutes = false) =>
  `${String(Math.floor(h) % 24).padStart(2, "0")}${withMinutes ? ":00" : ""}`;

/**
 * The six columns of a day, plus where "now" falls on them.
 *
 * @param {object} input
 * @param {Array} input.slots       every forecast slot for the spot (any day)
 * @param {number} input.dayStart   local midnight of the day to draw
 * @param {number} [input.nowMs]
 * @returns {{
 *   columns: Array<{slot:object, hour:number, left:number, width:number,
 *                   isPast:boolean, isCurrent:boolean, isFuture:boolean}>,
 *   marks: number[], firstHour:number, lastHour:number,
 *   nowPct: number|null, isToday: boolean, hasSlots: boolean
 * }}
 */
export function buildDayChart({ slots = [], dayStart, nowMs = Date.now(), timeZone = TZ }) {
  const dayEnd = dayStart + DAY_MS;
  const inDay = (slots || [])
    .filter((s) => Number.isFinite(s?.timestamp) && s.timestamp >= dayStart && s.timestamp < dayEnd)
    .map((s) => ({ ...s, hour: hourOf(s.timestamp, timeZone) }))
    .filter((s) => s.hour >= CHART_FIRST_HOUR && s.hour <= CHART_LAST_HOUR)
    .sort((a, b) => a.timestamp - b.timestamp);

  // De-duplicate: a re-scrape can leave two rows on one timestamp.
  const seen = new Set();
  const charted = [];
  for (const s of inDay) {
    if (seen.has(s.timestamp)) continue;
    seen.add(s.timestamp);
    charted.push(s);
  }

  const isToday = sameDay(nowMs, dayStart, timeZone);

  if (charted.length === 0) {
    // Fall back to the canonical shape so an empty day still draws an axis
    // rather than collapsing — "nothing here" has to look like a day.
    const marks = [7, 10, 13, 16, 19, 22];
    return {
      columns: [],
      marks,
      firstHour: marks[0],
      lastHour: marks[marks.length - 1],
      nowPct: isToday ? nowPercent(nowMs, marks[0], marks[marks.length - 1], timeZone) : null,
      futureFrom: null,
      isToday,
      hasSlots: false,
    };
  }

  const width = 100 / charted.length;
  const firstHour = charted[0].hour;
  const lastHour = charted[charted.length - 1].hour;

  const columns = charted.map((slot, i) => {
    const start = slot.timestamp;
    const end = start + SLOT_MS;
    return {
      slot,
      hour: slot.hour,
      left: i * width,
      width,
      isPast: end <= nowMs,
      isCurrent: start <= nowMs && nowMs < end,
      isFuture: start > nowMs,
    };
  });

  const nowPct = isToday ? nowPercent(nowMs, firstHour, lastHour, timeZone) : null;

  return {
    columns,
    marks: charted.map((s) => s.hour),
    firstHour,
    lastHour,
    nowPct,
    /**
     * Where the forecast wash starts. Not the same as the now line: on a future
     * day, or before dawn today, everything on screen is forecast and the wash
     * covers the whole plot even though there is no marker to anchor it.
     */
    futureFrom: nowPct !== null ? nowPct : columns.every((c) => !c.isPast) ? 0 : null,
    isToday,
    hasSlots: true,
  };
}

/**
 * Where the now rule sits, as a percentage of the track.
 *
 * Deliberately on the continuous scale rather than snapped to a slot: a marker
 * on a column boundary reads as a divider between two forecasts, not as a time.
 *
 * The last slot runs three hours past the last axis mark — 22:00 covers the
 * evening — so a rider looking at this at 22:40 is inside the final column but
 * off the end of the axis. That clamps to the right edge rather than vanishing:
 * the marker's job is "you are here", and here is the last column.
 *
 * Before the first mark it returns null. A line at 0% would claim it is 07:00
 * when it is actually five in the morning, and the whole day being ahead of you
 * is better said by the forecast wash covering all of it.
 */
export function nowPercent(nowMs, firstHour, lastHour, timeZone = TZ) {
  const span = lastHour - firstHour;
  if (span <= 0) return null;
  const h = hourFloatOf(nowMs, timeZone);
  if (h < firstHour) return null;
  if (h > lastHour + SLOT_MS / 3600000) return null;
  return Math.min(100, ((h - firstHour) / span) * 100);
}

/* ------------------------------------------------------------------ scales */

/** Round up to a sensible ceiling so the plot has headroom but stays readable. */
function niceCeil(value, step) {
  return Math.max(step, Math.ceil(value / step) * step);
}

/**
 * Y-axis reference lines from `tick` up to (but not including) `max`.
 *
 * Starts at the fine step (5 kt / 0.5 m) so the low mark is always offered.
 * If that would crowd past `maxLines`, the spacing doubles while the first tick
 * stays at `tick` — so a normal 30 kt day thins to 5 / 15 / 25 rather than
 * losing the 5 kt line, and a short mobile band stays readable.
 */
function scaleLines(max, { tick, format, maxLines = 5 }) {
  if (!(max > 0) || !(tick > 0)) return [];

  let spacing = tick;
  let values = [];
  for (;;) {
    values = [];
    for (let v = tick; v < max - tick * 1e-9; v += spacing) {
      // Snap to the tick grid so 0.5 + 0.5 + … does not drift off 1.5.
      const rounded = Math.round(v / tick) * tick;
      if (rounded > 0 && rounded < max && !values.includes(rounded)) {
        values.push(rounded);
      }
    }
    if (values.length <= maxLines || spacing >= max) break;
    spacing *= 2;
  }

  return values.map((value) => ({
    value,
    label: format(value),
    top: (1 - value / max) * 100,
  }));
}

/** Wave labels: `1m`, `0.5m`, `1.5m` — no trailing `.0`. */
function waveLabel(metres) {
  const n = Math.round(metres * 10) / 10;
  return `${n}m`;
}

/**
 * The wind y-scale: 0..max knots, top of the box is max.
 *
 * 30 kt is the default ceiling because it is the scale the design is drawn to
 * and it covers a normal Cascais day. It stretches rather than clipping when a
 * real gust goes over — a bar drawn at the ceiling would understate a 40 kt day.
 *
 * Gridlines step by 5 kt (5 / 10 / 15 / …), thinning to 5 / 15 / 25 when a
 * denser set would crowd the band.
 */
export function windScale(values = [], { min = 30, step = 10 } = {}) {
  const finite = values.filter((v) => Number.isFinite(v));
  const peak = finite.length ? Math.max(...finite) : 0;
  const max = peak <= min ? min : niceCeil(peak * 1.05, step);
  return {
    max,
    lines: scaleLines(max, { tick: 5, format: (v) => `${v}kt`, maxLines: 5 }),
  };
}

/**
 * Wave y-scale: 0..max metres, with 0.5 m reference lines.
 *
 * Always keeps headroom above the peak. Without it a day whose swell tops out
 * at 0.98 m against a 1 m ceiling drew the line along the very top of the box,
 * which reads as "off the scale" — the opposite of what a flat metre of swell
 * means. Tide shares the band visually but is normalised separately and never
 * gets its own numbered ticks.
 */
export function waveScale(values = [], { min = 1, step = 0.5 } = {}) {
  const finite = values.filter((v) => Number.isFinite(v));
  const peak = finite.length ? Math.max(...finite) : 0;
  const max = Math.max(min, niceCeil(peak * 1.25, step));
  return {
    max,
    // Waves band is shorter than wind — cap at 4 lines so mobile stays clear.
    lines: scaleLines(max, { tick: step, format: waveLabel, maxLines: 4 }),
  };
}

/** Fraction of the box height, measured from the top, for a value on a scale. */
export const topPct = (value, max) =>
  Math.max(0, Math.min(100, (1 - value / max) * 100));

/* ------------------------------------------------------------- score bands */

/**
 * Score bands, shared by the dial, the score bars and the week strip.
 *
 *   <60   marginal @ .8   — below the bar
 *   60-74 accent   @ .34  — rideable
 *   75-85 accent   @ .62  — good
 *   >85   accent   @ 1    — the one worth driving for
 */
export function scoreBand(score) {
  if (score === null || score === undefined) return null;
  if (score > 85) return "epic";
  if (score >= 75) return "great";
  if (score >= 60) return "good";
  return "marginal";
}

export const SCORE_FILL = {
  epic: { color: "rgb(var(--wm-accent))", opacity: 1 },
  great: { color: "rgb(var(--wm-accent))", opacity: 0.62 },
  good: { color: "rgb(var(--wm-accent))", opacity: 0.34 },
  marginal: { color: "rgb(var(--wm-marginal))", opacity: 0.8 },
};

/** Ring / number colour: accent at or above the bar, marginal below it. */
export const scoreColor = (score) =>
  score >= 60 ? "rgb(var(--wm-accent))" : "rgb(var(--wm-marginal))";

export const scoreTextClass = (score) => (score >= 60 ? "text-accent" : "text-marginal");

/* ---------------------------------------------------------- hover geometry */

/**
 * Continuous x% for a timestamp on the day-chart track.
 *
 * Matches WindBand's station line: first slot start → last slot start. Not the
 * same as column centres — a 15:42 reading sits inside the 13:00 column, not
 * on its left edge.
 */
export function timePctOnChart(chart, timeMs) {
  if (!chart?.columns?.length || !Number.isFinite(timeMs)) return null;
  const start = chart.columns[0].slot.timestamp;
  const end = chart.columns[chart.columns.length - 1].slot.timestamp;
  const span = end - start;
  if (span <= 0) return null;
  return ((timeMs - start) / span) * 100;
}

/** The forecast column whose horizontal band contains `pct` (0–100). */
export function columnAtPct(chart, pct) {
  if (!chart?.columns?.length || !Number.isFinite(pct)) return null;
  for (const col of chart.columns) {
    if (pct >= col.left && pct < col.left + col.width) return col;
  }
  // Past the last column's right edge (float noise / clamp) → last column.
  if (pct >= 100) return chart.columns[chart.columns.length - 1];
  return null;
}
