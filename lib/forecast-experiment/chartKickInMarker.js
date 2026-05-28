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

function chartDayStartMs(hours) {
  if (!hours.length) return null;
  return hours[0].validTime - hours[0].hourLocal * 3_600_000;
}

function chartKickInWindowMs(hours) {
  const dayStart = chartDayStartMs(hours);
  if (dayStart == null) return null;
  return {
    windowStart: dayStart + BACKTEST_KICKIN_MARKER_START_HOUR * 3_600_000,
    windowEnd: dayStart + BACKTEST_KICKIN_MARKER_END_HOUR * 3_600_000,
  };
}

/** Clamps kick-in to the chart's 8am–9pm marker range for consistent label + position. */
export function resolveKickInChartMarkerMs(ms, hours) {
  if (ms == null || hours.length === 0) return null;
  const window = chartKickInWindowMs(hours);
  if (!window) return null;
  const { windowStart, windowEnd } = window;
  if (ms > windowEnd + 3_600_000) return null;
  const clampedMs = Math.max(ms, windowStart);
  if (clampedMs > windowEnd) return null;
  return clampedMs;
}

/** Fractional hour index for a kick-in timestamp on an hourly chart. */
export function kickInMarkerIndex(ms, hours) {
  const clampedMs = resolveKickInChartMarkerMs(ms, hours);
  if (clampedMs == null) return null;
  return markerX(clampedMs, hours);
}

export function kickInMarkerSvgX(index, hourCount, innerWidth, paddingLeft, pixelOffset = 0) {
  if (index == null || hourCount <= 0) return null;
  if (hourCount <= 1) return paddingLeft + innerWidth / 2 + pixelOffset;
  return paddingLeft + (index / (hourCount - 1)) * innerWidth + pixelOffset;
}

/** Map a timestamp to the same fractional x-axis used by marina bars and kick-in markers. */
export function chartTimeIndex(ms, hours) {
  return markerX(ms, hours);
}

export function chartTimeSvgX(ms, hours, innerWidth, paddingLeft, pixelOffset = 0) {
  const index = chartTimeIndex(ms, hours);
  return kickInMarkerSvgX(index, hours.length, innerWidth, paddingLeft, pixelOffset);
}
