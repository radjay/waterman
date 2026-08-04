import { BANDS } from "./agreement";

/**
 * Windows, not hours.
 *
 * This is the core new abstraction of the redesign: the app's unit stops being
 * the forecast slot. A rider asks "when", and the answer is "today, 12:00-15:00",
 * not a table of six rows they have to read and collapse themselves.
 */

/**
 * The hours the week strip draws, and therefore the only hours a window may
 * cover.
 *
 * These have to be one rule, not two. When the chart clipped bands to daylight
 * but detectWindows ran over every slot, a band drawn from 07:00 belonged to a
 * window that actually started at 04:00 — so tapping the visible part opened a
 * Confidence screen for hours that were never on screen.
 *
 * `isDaylightSlot` is not the right test here: it admits a slot that merely
 * OVERLAPS daylight, so the 04:00 block qualifies on the strength of its last
 * twenty minutes. A window needs the whole block to be rideable.
 */
export const CHART_FIRST_HOUR = 6;
export const CHART_LAST_HOUR = 22;
export const SLOT_HOURS = 3;

/** Local hour of a timestamp in the spot's timezone. */
export function localHour(timestamp, timeZone = "Europe/Lisbon") {
  return Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone }).format(
      new Date(timestamp)
    )
  );
}

/** Is this slot's WHOLE three-hour block inside the charted hours? */
export function isChartedSlot(timestamp, timeZone = "Europe/Lisbon") {
  const h = localHour(timestamp, timeZone);
  return h >= CHART_FIRST_HOUR && h + SLOT_HOURS <= CHART_LAST_HOUR;
}

/** A slot counts toward a window when its score clears this. */
export const GOOD_SCORE = 60;
export const STRONG_SCORE = 75;

/**
 * Collapse contiguous qualifying slots into windows.
 *
 * @param {Array<{timestamp:number, score:number|null, speed:number,
 *   direction:number, band?:string}>} slots - ascending by timestamp
 * @param {object} options
 * @param {number} options.maxGapMs - slots further apart than this start a new
 *   window. Defaults to 3h + 1min, so a normal 3-hourly series stays contiguous
 *   but a real hole in the data does not get bridged.
 * @returns {Array<{start:number,end:number,peak:object,score:number,band:string,slots:Array}>}
 */
export function detectWindows(slots, { maxGapMs = 3 * 60 * 60 * 1000 + 60000 } = {}) {
  const windows = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    windows.push(finaliseWindow(current));
    current = null;
  };

  for (const slot of slots || []) {
    // The score is the authority on quality; agreement is the authority on
    // confidence. Models agreeing that the wind clears a threshold does NOT
    // make a slot good — it can still be a 41 for other reasons, and on a flat
    // day that would invent windows that are not there.
    //
    // Model bands only qualify a slot on their own when there is no score yet,
    // which is the real case where a fresh scrape has outrun the scorer.
    const qualifies =
      slot.score === null || slot.score === undefined
        ? slot.band === BANDS.GOOD || slot.band === BANDS.SPLIT
        : slot.score >= GOOD_SCORE;

    if (!qualifies) {
      flush();
      continue;
    }

    if (current && slot.timestamp - current.slots[current.slots.length - 1].timestamp > maxGapMs) {
      flush();
    }

    if (!current) current = { slots: [] };
    current.slots.push(slot);
  }
  flush();

  return windows;
}

function finaliseWindow({ slots }) {
  const peak = slots.reduce((best, s) => ((s.score ?? 0) > (best.score ?? 0) ? s : best), slots[0]);

  // A window's band is the WORST honest thing you can say about it: if any part
  // of it is only "models split", the window is split. Averaging would hide
  // exactly the disagreement the design wants surfaced.
  let band = BANDS.GOOD;
  if (slots.some((s) => s.band === BANDS.SPLIT)) band = BANDS.SPLIT;
  if (slots.every((s) => s.band === BANDS.UNKNOWN)) band = BANDS.UNKNOWN;

  const last = slots[slots.length - 1];

  return {
    start: slots[0].timestamp,
    // A slot represents the 3 hours it opens, so the window ends when the last
    // slot's period does — otherwise "12:00-15:00" would render as "12:00-12:00".
    end: last.timestamp + 3 * 60 * 60 * 1000,
    peak,
    score: peak.score ?? null,
    band,
    slots,
  };
}

/**
 * The soonest window at or after `fromMs`, across every spot.
 * @param {Array<{spot:object, windows:Array}>} bySpot
 */
export function soonestWindow(bySpot, fromMs = Date.now()) {
  let best = null;
  for (const { spot, windows } of bySpot || []) {
    for (const window of windows) {
      if (window.end <= fromMs) continue;
      if (window.band !== BANDS.GOOD) continue;
      if (!best || window.start < best.window.start) best = { spot, window };
    }
  }
  return best;
}

/**
 * Local midnight for the day containing `ms`.
 *
 * This is the contract for the `day` segment of /window/[day]/[start]. It lives
 * here rather than in a screen because Now and Next both generate that URL, and
 * two private copies is exactly how they came to disagree — Now was passing the
 * window start where Next passed the day start.
 */
export function dayStartOf(ms, timeZone = "Europe/Lisbon") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (t) => parts.find((p) => p.type === t).value;
  return new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00`).getTime();
}

/** Is `window` the one happening right now? */
export const isActive = (window, atMs) => window.start <= atMs && atMs < window.end;

/**
 * The next N good windows across every spot, soonest first.
 *
 * Now shows three rather than one: a single "next window" answers "when" but
 * not "or else what", and on a flat day the second and third options are the
 * ones that actually get someone on the water.
 *
 * @param {object} [options]
 * @param {boolean} [options.uniqueSpots] One entry per spot (default true).
 * @param {string}  [options.excludeActiveAt] Spot id whose CURRENTLY RUNNING
 *   window should be dropped. Now's verdict card already describes that exact
 *   session, so listing it again under "next windows" showed the rider the same
 *   window twice. Only that spot's active window is dropped — another beach
 *   being on right now is a real option, not a duplicate.
 * @returns {Array<{spot:object, window:object}>}
 */
export function upcomingWindows(
  bySpot,
  fromMs = Date.now(),
  limit = 3,
  { uniqueSpots = true, excludeActiveAt = null } = {}
) {
  const all = [];
  for (const { spot, windows } of bySpot || []) {
    for (const window of windows) {
      if (window.end <= fromMs) continue;
      if (window.band !== BANDS.GOOD) continue;
      if (excludeActiveAt && spot._id === excludeActiveAt && isActive(window, fromMs)) continue;
      all.push({ spot, window });
    }
  }
  all.sort((a, b) => a.window.start - b.window.start);

  // One entry per spot, so three rows are three places rather than three
  // slices of the same afternoon at the same beach. Turned off when the screen
  // is already scoped to a single spot — there the question is "when here",
  // and deduping by spot would leave exactly one row.
  if (!uniqueSpots) return all.slice(0, limit);

  const seen = new Set();
  const picked = [];
  for (const entry of all) {
    if (seen.has(entry.spot._id)) continue;
    seen.add(entry.spot._id);
    picked.push(entry);
    if (picked.length === limit) break;
  }
  return picked;
}

/**
 * Per-spot summary for the "Where, this week" list.
 * Spots with nothing are included and say so rather than being dropped —
 * "nothing here this week" is an answer.
 */
export function spotSummaries(bySpot, fromMs = Date.now()) {
  return (bySpot || [])
    .map(({ spot, windows }) => {
      const upcoming = windows.filter((w) => w.end > fromMs && w.band === BANDS.GOOD);
      return {
        spot,
        windowCount: upcoming.length,
        soonest: upcoming.length ? upcoming[0].start : null,
      };
    })
    .sort((a, b) => {
      if (a.windowCount === 0 && b.windowCount === 0) return 0;
      if (a.windowCount === 0) return 1;
      if (b.windowCount === 0) return -1;
      return a.soonest - b.soonest;
    });
}

/**
 * Position a window on a day track running dayStartHour..dayEndHour.
 * Returns percentages for absolute positioning, clamped to the track.
 * Returns null when the window falls entirely outside the visible hours.
 */
export function windowTrackPosition(
  window,
  dayStartMs,
  { dayStartHour = 6, dayEndHour = 24 } = {}
) {
  const hourMs = 60 * 60 * 1000;
  const trackStart = dayStartMs + dayStartHour * hourMs;
  const trackEnd = dayStartMs + dayEndHour * hourMs;
  const span = trackEnd - trackStart;
  if (span <= 0) return null;

  const start = Math.max(window.start, trackStart);
  const end = Math.min(window.end, trackEnd);
  if (end <= start) return null;

  const left = ((start - trackStart) / span) * 100;
  const width = ((end - start) / span) * 100;

  const peakAt = window.peak?.timestamp;
  const peak =
    peakAt >= trackStart && peakAt <= trackEnd
      ? ((peakAt - trackStart) / span) * 100
      : null;

  return { left, width, peak };
}
