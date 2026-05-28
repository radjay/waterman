import {
  BACKTEST_KICKIN_MARKER_END_HOUR,
  BACKTEST_KICKIN_MARKER_START_HOUR,
} from "./backtest.js";

function markerX(ms, hours) {
  if (ms == null || hours.length === 0) return null;
  const first = hours[0].validTime;
  const last = hours[hours.length - 1].validTime;
  if (ms < first || ms > last + 3_600_000) return null;
  const span = last - first || 1;
  return ((ms - first) / span) * (hours.length - 1);
}

/** Fractional hour index for a kick-in timestamp on an hourly chart. */
export function kickInMarkerIndex(ms, hours) {
  if (ms == null || hours.length === 0) return null;
  const dayStart = hours[0].validTime - hours[0].hourLocal * 3_600_000;
  const windowStart = dayStart + BACKTEST_KICKIN_MARKER_START_HOUR * 3_600_000;
  const windowEnd = dayStart + BACKTEST_KICKIN_MARKER_END_HOUR * 3_600_000;
  if (ms > windowEnd + 3_600_000) return null;
  const clampedMs = Math.max(ms, windowStart);
  if (clampedMs > windowEnd) return null;
  return markerX(clampedMs, hours);
}

export function kickInMarkerSvgX(index, hourCount, innerWidth, paddingLeft, pixelOffset = 0) {
  if (index == null || hourCount <= 0) return null;
  if (hourCount <= 1) return paddingLeft + innerWidth / 2 + pixelOffset;
  return paddingLeft + (index / (hourCount - 1)) * innerWidth + pixelOffset;
}
