import { getCardinalDirection } from "./utils";
import { isWindSport } from "../components/sport/SportProvider";

/**
 * The headline metric for a slot, per sport.
 *
 * Now and Next were showing wind speed regardless of sport, so a surfer got
 * "6 kn WNW" as the answer to "can I go" — a number that says nothing about
 * whether there are waves. The scores were already sport-specific; only the
 * displayed evidence was not.
 *
 * Wind sports lead with wind. Surfing leads with swell, and keeps wind as
 * secondary context because onshore wind is what ruins an otherwise good swell.
 *
 * Direction follows the app's existing convention in WaveGroup and Arrow: both
 * wind and swell are stored as the direction the energy is travelling TO, and
 * displayed as where it comes FROM (+180).
 */

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * @param {object} slot - forecast slot
 * @param {string} sport
 * @returns {{
 *   value: number|null, unit: string, secondary: string|null,
 *   directionLabel: string|null, directionDegrees: number|null,
 *   tertiary: string|null
 * }|null}
 */
export function primaryMetric(slot, sport) {
  if (!slot) return null;

  if (isWindSport(sport)) {
    const speed = slot.speed;
    if (speed === null || speed === undefined) return null;
    return {
      value: Math.round(speed),
      unit: "kn",
      secondary: slot.gust ? `(${Math.round(slot.gust)}*)` : null,
      directionLabel:
        slot.direction === null || slot.direction === undefined
          ? null
          : getCardinalDirection(slot.direction + 180),
      directionDegrees: slot.direction ?? null,
      tertiary: null,
    };
  }

  // Surfing: swell height leads, period qualifies it, wind is context.
  const height = slot.waveHeight;
  if (height === null || height === undefined || height === 0) {
    // No swell data is not "0 kn" — say nothing rather than something wrong.
    return null;
  }

  const period = slot.wavePeriod ? `@ ${Math.round(slot.wavePeriod)} s` : null;
  const wind =
    slot.speed !== null && slot.speed !== undefined
      ? `${Math.round(slot.speed)} kn ${
          slot.direction !== null && slot.direction !== undefined
            ? getCardinalDirection(slot.direction + 180)
            : ""
        }`.trim()
      : null;

  const swellDir =
    slot.waveDirection === null || slot.waveDirection === undefined
      ? null
      : getCardinalDirection(slot.waveDirection + 180);

  return {
    value: round1(height),
    unit: "m",
    // Reads as "0.5 m" then "E swell @ 5 s". Putting the compass point
    // immediately after the metre made "0.5 m E" look like a unit.
    directionLabel: null,
    secondary: [swellDir ? `${swellDir} swell` : null, period]
      .filter(Boolean)
      .join(" ") || null,
    directionDegrees: slot.waveDirection ?? null,
    // Wind still matters for surf — offshore holds a wave up, onshore flattens
    // it — so it stays on the card as supporting context, not as the headline.
    tertiary: wind ? `wind ${wind}` : null,
  };
}

/** One-line summary for lists and hero cards, e.g. "26 kn NNW" / "1.4 m @ 11 s WNW". */
export function conditionSummary(slot, sport) {
  const m = primaryMetric(slot, sport);
  if (!m) return null;
  const parts = [`${m.value} ${m.unit}`];
  if (m.directionLabel) parts.push(m.directionLabel);
  if (m.secondary && !m.secondary.startsWith("(")) parts.push(m.secondary);
  return parts.join(" ");
}
