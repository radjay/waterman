import { getDisplayWindDirection } from "../../lib/utils";

/**
 * ConditionLine component - compact one-line wind/wave summary.
 *
 * @param {number} speed - Wind speed in knots
 * @param {number} gust - Wind gust in knots
 * @param {number} direction - Wind direction in degrees
 * @param {number} waveHeight - Wave height in meters
 * @param {number} wavePeriod - Wave period in seconds
 * @param {string} sport - Sport type for display priority
 * @param {string} className - Additional CSS classes
 */
export function ConditionLine({
  speed,
  gust,
  direction,
  waveHeight,
  wavePeriod,
  sport,
  className = "",
}) {
  const windDir = direction != null ? getDisplayWindDirection(direction) : "";
  const windStr = speed != null ? `${Math.round(speed)} kn` : "";
  const gustStr = gust != null ? ` (${Math.round(gust)}*)` : "";
  const waveStr = waveHeight != null ? `${waveHeight.toFixed(1)}m` : "";
  const periodStr = wavePeriod != null ? ` (${wavePeriod}s)` : "";

  // Surfing: waves first, then wind
  if (sport === "surfing") {
    const parts = [];
    if (waveStr) parts.push(`${waveStr}${periodStr}`);
    if (windStr) parts.push(`${windStr}`);
    return (
      <span className={`font-data text-xs text-faded-ink ${className}`}>
        {parts.join(" | ")}
      </span>
    );
  }

  // Wind sports (wingfoil, kitesurfing): wind first, then waves
  const parts = [];
  if (windStr) parts.push(`${windStr}${gustStr} ${windDir}`.trim());
  if (waveStr) parts.push(`${waveStr}${periodStr}`);

  return (
    <span className={`font-data text-xs text-faded-ink ${className}`}>
      {parts.join(" | ")}
    </span>
  );
}
