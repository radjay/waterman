/**
 * Score shading for the week strip.
 *
 * A single flat accent said "there is a window here" but not "this one is the
 * one", and not "it peaks mid-afternoon". Shading turns the strip into
 * something you can rank and time by eye, without reading the numbers.
 *
 * Two levels of it:
 *   - `scoreColour` maps one score to one colour, stepped by tier so the legend
 *     labels mean something out loud.
 *   - `windowGradient` lays those colours out ACROSS the slots inside a window,
 *     so a band visibly climbs good -> great -> epic and back down as the
 *     afternoon builds and fades. A flat per-window tier hid exactly that.
 *
 * Tiers follow the score semantics already used across the app: 60 is the
 * "worth showing" threshold, and the top two are pulled to round numbers.
 */
export const TIERS = [
  { id: "epic", label: "EPIC", min: 90 },
  { id: "great", label: "GREAT", min: 80 },
  { id: "good", label: "GOOD", min: 70 },
  { id: "fair", label: "FAIR", min: 60 },
  { id: "marginal", label: "MARGINAL", min: 0 },
];

export function scoreTier(score) {
  if (score === null || score === undefined) return null;
  return TIERS.find((t) => score >= t.min) ?? TIERS[TIERS.length - 1];
}

/**
 * One score, one colour.
 *
 * Epic separates by LIGHTNESS rather than opacity: past about 85% every step
 * looks like the same bright accent, which is what made epic and great
 * indistinguishable. Mixing toward --wm-ink intensifies in BOTH themes, because
 * ink is near-white in Nightglass and near-black in Dayglass — the band reads
 * as lit at night and as deeply saturated in day, rather than one theme washing
 * out.
 */
export function scoreColour(score, { marginal = false } = {}) {
  const tier = marginal ? "marginal" : scoreTier(score)?.id;

  switch (tier) {
    case "epic":
      return "color-mix(in srgb, rgb(var(--wm-accent)) 45%, rgb(var(--wm-ink)))";
    case "great":
      return "rgb(var(--wm-accent))";
    case "good":
      return "rgb(var(--wm-accent) / 0.62)";
    case "fair":
      return "rgb(var(--wm-accent) / 0.3)";
    default:
      return "rgb(var(--wm-marginal) / 0.75)";
  }
}

const clamp01 = (n) => Math.max(0, Math.min(1, n));

/**
 * Background for one window band, ramped horizontally across its slots.
 *
 * @param {object} window - from detectWindows(); uses .slots, .start, .end
 * @param {object} [options]
 * @param {boolean} [options.marginal] - paint the whole band in the accent-2 hue
 * @returns {string} a CSS linear-gradient
 */
export function windowGradient(window, { marginal = false } = {}) {
  // Legend swatches and callers that only have a number pass a bare score.
  if (typeof window === "number" || window === null || window === undefined) {
    const colour = scoreColour(window, { marginal });
    return `linear-gradient(90deg, ${colour}, ${colour})`;
  }

  const slots = window.slots ?? [];
  const span = window.end - window.start;

  if (slots.length === 0 || span <= 0) {
    const colour = scoreColour(window.score, { marginal });
    return `linear-gradient(90deg, ${colour}, ${colour})`;
  }

  // Each slot gets a PLATEAU, not a point.
  //
  // Placing one stop per slot centre meant an epic hour surrounded by great
  // ones existed only at a single interpolation point — measured, the peak
  // reached rgb(118,231,240) against a pure accent of rgb(110,231,240), so the
  // top tier was invisible. Emitting a stop at each end of a slot's block gives
  // every slot area to hold its own colour, with the blend confined to the
  // boundary between neighbours.
  const SLOT_MS = 3 * 60 * 60 * 1000;
  const BLEND = 0.22; // fraction of a block given over to the transition

  const stops = [];
  slots.forEach((slot, i) => {
    const isMarginal = marginal || (slot.score !== null && slot.score < 60);
    const colour = scoreColour(slot.score, { marginal: isMarginal });

    const blockStart = (slot.timestamp - window.start) / span;
    const blockEnd = (slot.timestamp + SLOT_MS - window.start) / span;
    const inset = (blockEnd - blockStart) * BLEND;

    // Pin the outer edges so the band does not fade at its own boundaries.
    const from = i === 0 ? 0 : clamp01(blockStart + inset);
    const to = i === slots.length - 1 ? 1 : clamp01(blockEnd - inset);

    stops.push(`${colour} ${(from * 100).toFixed(1)}%`);
    stops.push(`${colour} ${(to * 100).toFixed(1)}%`);
  });

  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

/** Tiers worth showing in the legend, best first. */
export const LEGEND_TIERS = TIERS.filter((t) => t.min >= 70);
