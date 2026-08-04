/**
 * Dummy rider counts for the flagged cam-count UX.
 *
 * There is no computer-vision pipeline yet. These numbers are invented.
 *
 * They live here, in the Next.js layer, and are NEVER written to Convex —
 * production and development share one deployment, so seeding fixtures into the
 * database would put fabricated counts in front of real users. The
 * `cam_rider_counts` table is defined so the shape is settled while the UI is
 * built, but nothing writes to it until the real pipeline does.
 *
 * Values are derived from spot id + hour rather than randomised, so a demo or a
 * screenshot looks the same twice. The four states the design calls for —
 * active, quieter, nobody out, offline — are all reachable, because a cam with
 * nobody on it is a real answer and needs to look deliberate.
 *
 * The return shape deliberately matches what the real query will return, so
 * swapping the source later is a one-line change at the call site.
 */

/** Stable small hash so the same spot always gets the same character. */
function hash(input) {
  let h = 0;
  const s = String(input);
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * A spot's baseline busyness, 0-3. Deterministic per spot.
 * 0 = never anyone, 3 = the popular one.
 */
function busyness(spotId) {
  return hash(spotId) % 4;
}

/**
 * Rider count history for a spot, most recent last.
 *
 * @param {string} spotId
 * @param {number} nowMs
 * @param {number} points - how many 15-minute buckets
 * @returns {Array<{ at: number, count: number }>}
 */
export function riderCountHistory(spotId, nowMs = Date.now(), points = 6) {
  const level = busyness(spotId);
  if (level === 0) return [];

  const bucket = 15 * 60 * 1000;
  const hour = new Date(nowMs).getHours();

  // Riders build through the middle of the day and drop off at the edges,
  // which is roughly how a thermal-driven spot actually behaves.
  const daylight = hour >= 8 && hour <= 20 ? 1 - Math.abs(14 - hour) / 9 : 0;
  const peak = Math.round(level * 4 * Math.max(daylight, 0));

  return Array.from({ length: points }, (_, i) => {
    const step = (i + 1) / points;
    const drift = ((hash(spotId + i) % 3) - 1) * 0.15;
    return {
      at: nowMs - (points - 1 - i) * bucket,
      count: Math.max(0, Math.round(peak * (0.45 + 0.55 * step) + peak * drift)),
    };
  });
}

/**
 * Current rider count plus its trend.
 *
 * @returns {{ count: number, previous: number, trend: "up"|"down"|"steady",
 *   history: Array<{at:number,count:number}>, updatedAt: number, estimated: true } | null}
 *   null means "we have no reading", which is different from a count of 0
 *   ("nobody out") — the design treats those as different answers.
 */
export function riderCount(spotId, nowMs = Date.now()) {
  const history = riderCountHistory(spotId, nowMs);
  if (!history.length) return null;

  const count = history[history.length - 1].count;
  const previous = history[0].count;
  const delta = count - previous;

  return {
    count,
    previous,
    trend: delta > 1 ? "up" : delta < -1 ? "down" : "steady",
    history,
    updatedAt: nowMs,
    // Never present the count as measured fact.
    estimated: true,
  };
}

/** The label the design uses for the badge. Zero is an answer, not an absence. */
export function riderCountLabel(reading, sportNoun = "out") {
  if (!reading) return null;
  if (reading.count === 0) return "NOBODY OUT";
  return `${reading.count} ${sportNoun}`.toUpperCase();
}
