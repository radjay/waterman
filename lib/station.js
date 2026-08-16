import { getDisplayWindDirection } from "./utils";

/** Match LiveWindIndicator: past this, hide rather than show an old number. */
const STALE_MS = 60 * 60 * 1000;
/** The sparkline's span — last 6 hours of station readings. */
const HISTORY_MS = 6 * 60 * 60 * 1000;
/** One point per bucket; 6h at 5 min ≈ 72 raw buckets before the 3-reading avg. */
const BUCKET_MS = 5 * 60 * 1000;

function agoLabel(time, nowMs) {
  const minutes = Math.floor((nowMs - time) / 60_000);
  if (minutes < 1) return "JUST NOW";
  return `${minutes} MIN AGO`;
}

/** Paired with agoLabel as "2 MIN AGO @ THE SPOT" (see StationCard). */
function caption(proximity) {
  if (proximity?.kind === "at-spot") return "THE SPOT";
  if (!proximity?.station || !Number.isFinite(proximity.distanceKm)) {
    return "NEARBY STATION";
  }
  const km = Math.round(proximity.distanceKm * 10) / 10;
  return `${proximity.station.name.toUpperCase()} · ${km} KM ${proximity.bearingLabel}`;
}

function mean(values) {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, n) => sum + n, 0) / values.length) * 10) / 10;
}

/** One averaged point per 5-minute bucket, oldest first. Empty buckets vanish. */
function bucketHistory(readings, nowMs, historyMs = HISTORY_MS) {
  const cutoff = nowMs - historyMs;
  const buckets = new Map();

  for (const reading of readings) {
    if (reading.time < cutoff) continue;
    const key = Math.floor(reading.time / BUCKET_MS);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(reading);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([key, group]) => {
      const speeds = group.map((r) => r.speed).filter(Number.isFinite);
      const gusts = group.map((r) => r.gust).filter(Number.isFinite);
      return {
        // Bucket midpoint so the chart x-axis is honest about the window.
        time: key * BUCKET_MS + BUCKET_MS / 2,
        speed: mean(speeds),
        gust: mean(gusts),
      };
    })
    .filter((p) => p.speed !== null);
}

/**
 * Rolling mean of the last `window` points (default 3). Smooths station noise
 * so the sparkline is readable without inventing values past the series.
 * Forecast is left as a step (no average) so each bucket keeps the slot that
 * covered it.
 * Exported for the chart and for unit tests.
 */
export function averageWindow(points, window = 3) {
  if (!points?.length) return [];
  const w = Math.max(1, window);
  return points.map((_, i) => {
    const slice = points.slice(Math.max(0, i - w + 1), i + 1);
    const speeds = slice.map((p) => p.speed).filter(Number.isFinite);
    const gusts = slice.map((p) => p.gust).filter(Number.isFinite);
    return {
      time: points[i].time,
      speed: mean(speeds),
      gust: mean(gusts),
      // Forecast is left as a step (no average) so each bucket keeps the slot.
      forecast: Number.isFinite(points[i].forecast) ? points[i].forecast : null,
      forecastGust: Number.isFinite(points[i].forecastGust)
        ? points[i].forecastGust
        : null,
    };
  });
}

/** Forecast slots are 3-hour blocks — same as lib/windows SLOT_HOURS. */
const FORECAST_SLOT_MS = 3 * 60 * 60 * 1000;

/**
 * Paint the model forecast onto each history sample: base + gust of the
 * forecast slot covering that timestamp. The day chart draws forecast as 3h
 * stacked grey bars; live station is a primary stack on top per column.
 */
export function attachForecast(history, forecastSlots, slotMs = FORECAST_SLOT_MS) {
  if (!history?.length) return history || [];
  const slots = [...(forecastSlots || [])]
    .filter((s) => Number.isFinite(s?.timestamp) && Number.isFinite(s?.speed))
    .sort((a, b) => a.timestamp - b.timestamp);
  if (slots.length === 0) {
    return history.map((p) => ({
      ...p,
      forecast: p.forecast ?? null,
      forecastGust: p.forecastGust ?? null,
    }));
  }

  return history.map((p) => {
    const covering = slots.find(
      (s) => s.timestamp <= p.time && p.time < s.timestamp + slotMs
    );
    const speed = covering?.speed;
    const gust = covering?.gust;
    return {
      ...p,
      forecast: Number.isFinite(speed) ? Math.round(speed * 10) / 10 : null,
      forecastGust: Number.isFinite(gust) ? Math.round(gust * 10) / 10 : null,
    };
  });
}

/**
 * The STATION card, or null when there is nothing honest to show.
 *
 * delta is null for anything but an at-spot station. It feeds deriveVerdict
 * (lib/verdict.js:54), where a 50-59 score plus a station running 2kn over
 * flips NO to MARGINAL — so a sensor 2.9km away on a headland would put a
 * standing offset into the verdict and present terrain as forecast error.
 *
 * `forecastSlots` (preferred) or a single `forecastSlot` paints the model
 * line on the sparkline next to the live station trail.
 */
export function buildStationCard({
  readings,
  forecastSlot,
  forecastSlots,
  proximity,
  nowMs = Date.now(),
  // The day chart draws the station line across the whole charted day, not just
  // the sparkline's six hours, so callers can widen the trail they get back.
  historyMs = HISTORY_MS,
}) {
  const sorted = [...(readings || [])]
    .filter((r) => Number.isFinite(r?.time) && Number.isFinite(r?.speed))
    .sort((a, b) => a.time - b.time);

  if (sorted.length === 0) return null;

  const latest = sorted[sorted.length - 1];
  if (nowMs - latest.time > STALE_MS) return null;

  const slotsForChart =
    forecastSlots?.length > 0 ? forecastSlots : forecastSlot ? [forecastSlot] : [];

  const atSpot = proximity?.kind === "at-spot";
  // Delta still uses the current slot only — the one driving the verdict.
  const forecastSpeed = forecastSlot?.speed ?? slotsForChart.at(-1)?.speed;
  const delta =
    atSpot && Number.isFinite(forecastSpeed)
      ? Math.round((latest.speed - forecastSpeed) * 10) / 10
      : null;

  const history = attachForecast(bucketHistory(sorted, nowMs, historyMs), slotsForChart);

  return {
    speed: latest.speed,
    gust: latest.gust ?? null,
    // Same convention as the forecast (getDisplayWindDirection, i.e. stored
    // bearing + 180). Both numbers come from Windguru as the meteorological
    // "from" bearing, and the redesign now prints the station reading directly
    // beside the forecast columns — rendering the raw bearing here made the two
    // disagree by 180° about the same wind.
    directionLabel: Number.isFinite(latest.direction)
      ? getDisplayWindDirection(latest.direction)
      : null,
    agoLabel: agoLabel(latest.time, nowMs),
    delta,
    history,
    caption: caption(proximity),
  };
}
