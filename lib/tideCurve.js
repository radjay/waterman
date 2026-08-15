/**
 * A tide line from tide marks.
 *
 * The scrape stores highs and lows, not a curve — four points a day. Drawing
 * straight segments between them makes the water look like it changes direction
 * instantly at slack, which is the one thing tide does not do. Between two
 * consecutive extremes the real surface is very close to half a cosine, so that
 * is what is drawn: exact at both marks, and honest about the shape in between.
 *
 * Nothing is invented outside the marks: the curve starts at the first mark and
 * ends at the last, and the caller decides what to do with the gap.
 */

const QUARTER_HOUR = 15 * 60 * 1000;

/**
 * @param {Array<{time:number, height:number}>} tides
 * @param {number} fromMs
 * @param {number} toMs
 * @param {number} [stepMs]
 * @returns {Array<{time:number, height:number}>} empty when there is nothing to draw
 */
export function tideCurve(tides, fromMs, toMs, stepMs = QUARTER_HOUR) {
  const marks = (tides || [])
    .filter((t) => Number.isFinite(t?.time) && Number.isFinite(t?.height))
    .sort((a, b) => a.time - b.time);

  // One mark is a level, not a curve, and two are the minimum for a segment.
  if (marks.length < 2 || !(toMs > fromMs)) return [];

  const start = Math.max(fromMs, marks[0].time);
  const end = Math.min(toMs, marks[marks.length - 1].time);
  if (end <= start) return [];

  const points = [];
  for (let t = start; t <= end; t += stepMs) {
    points.push({ time: t, height: heightAt(marks, t) });
  }
  // Always land exactly on the end so the line reaches the edge of the plot.
  if (points[points.length - 1]?.time !== end) {
    points.push({ time: end, height: heightAt(marks, end) });
  }
  return points;
}

function heightAt(marks, t) {
  for (let i = 0; i < marks.length - 1; i += 1) {
    const a = marks[i];
    const b = marks[i + 1];
    if (t < a.time || t > b.time) continue;
    const span = b.time - a.time;
    if (span <= 0) return b.height;
    const phase = (t - a.time) / span;
    // cos runs 1 -> -1 over half a period; map it onto a -> b.
    const eased = (1 - Math.cos(phase * Math.PI)) / 2;
    return a.height + (b.height - a.height) * eased;
  }
  return t <= marks[0].time ? marks[0].height : marks[marks.length - 1].height;
}

/** Next high/low at or after `fromMs`, for the "next tide" caption. */
export function nextTide(tides, fromMs) {
  return (
    (tides || [])
      .filter((t) => Number.isFinite(t?.time) && t.time >= fromMs)
      .sort((a, b) => a.time - b.time)[0] ?? null
  );
}
