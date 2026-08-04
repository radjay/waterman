/**
 * Score tiers for the week strip.
 *
 * A single flat accent said "there is a window here" but not "this one is the
 * one". Shading by score turns the strip into a ranking you can read without
 * looking at the numbers on the right — which is the whole point of the strip.
 *
 * Tiers deliberately match the score semantics already used across the app
 * (60 is the "worth showing" threshold; 75+ was the old "ideal" marker), with
 * the top two pulled to round numbers so the labels mean something out loud.
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
 * Background for a window band.
 *
 * Gradients run left-to-right and intensify with the tier, so a row of windows
 * reads as a slope rather than as flat blocks. Built from the accent channel
 * triple so both themes shade correctly without a second palette — Dayglass
 * gets the same ramp against its own, much darker, accent.
 */
export function windowGradient(score, { marginal = false } = {}) {
  if (marginal) {
    return "linear-gradient(90deg, rgb(var(--wm-marginal) / 0.55), rgb(var(--wm-marginal) / 0.85))";
  }

  const tier = scoreTier(score)?.id;
  switch (tier) {
    case "epic":
      // Brightest, with a slight lift through the middle so it reads as lit.
      return "linear-gradient(90deg, rgb(var(--wm-accent) / 0.85), rgb(var(--wm-accent)) 45%, rgb(var(--wm-accent) / 0.9))";
    case "great":
      return "linear-gradient(90deg, rgb(var(--wm-accent) / 0.65), rgb(var(--wm-accent) / 0.95))";
    case "good":
      return "linear-gradient(90deg, rgb(var(--wm-accent) / 0.5), rgb(var(--wm-accent) / 0.75))";
    case "fair":
      return "linear-gradient(90deg, rgb(var(--wm-accent) / 0.32), rgb(var(--wm-accent) / 0.52))";
    default:
      return "linear-gradient(90deg, rgb(var(--wm-marginal) / 0.55), rgb(var(--wm-marginal) / 0.85))";
  }
}

/** Tiers worth showing in the legend, best first. */
export const LEGEND_TIERS = TIERS.filter((t) => t.min >= 70);
