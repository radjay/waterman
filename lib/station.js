import { getCardinalDirection } from "./utils";

/** Match LiveWindIndicator: past this, hide rather than show an old number. */
const STALE_MS = 60 * 60 * 1000;
/** The sparkline's span. */
const HISTORY_MS = 90 * 60 * 1000;
/** One bar per bucket; 90 minutes at 5 gives the ~18 bars StationCard draws. */
const BUCKET_MS = 5 * 60 * 1000;

function agoLabel(time, nowMs) {
  const minutes = Math.floor((nowMs - time) / 60_000);
  if (minutes < 1) return "JUST NOW";
  return `${minutes} MIN AGO`;
}

function caption(proximity) {
  if (proximity?.kind === "at-spot") return "AT THE SPOT";
  if (!proximity?.station || !Number.isFinite(proximity.distanceKm)) {
    return "NEARBY STATION";
  }
  const km = Math.round(proximity.distanceKm * 10) / 10;
  return `${proximity.station.name.toUpperCase()} · ${km} KM ${proximity.bearingLabel}`;
}

/** One averaged point per 5-minute bucket, oldest first. Empty buckets vanish. */
function bucketHistory(readings, nowMs) {
  const cutoff = nowMs - HISTORY_MS;
  const buckets = new Map();

  for (const reading of readings) {
    if (reading.time < cutoff) continue;
    const key = Math.floor(reading.time / BUCKET_MS);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(reading.speed);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, speeds]) => ({
      speed: Math.round((speeds.reduce((sum, s) => sum + s, 0) / speeds.length) * 10) / 10,
    }));
}

/**
 * The STATION card, or null when there is nothing honest to show.
 *
 * delta is null for anything but an at-spot station. It feeds deriveVerdict
 * (lib/verdict.js:54), where a 50-59 score plus a station running 2kn over
 * flips NO to MARGINAL — so a sensor 2.9km away on a headland would put a
 * standing offset into the verdict and present terrain as forecast error.
 */
export function buildStationCard({ readings, forecastSlot, proximity, nowMs = Date.now() }) {
  const sorted = [...(readings || [])]
    .filter((r) => Number.isFinite(r?.time) && Number.isFinite(r?.speed))
    .sort((a, b) => a.time - b.time);

  if (sorted.length === 0) return null;

  const latest = sorted[sorted.length - 1];
  if (nowMs - latest.time > STALE_MS) return null;

  const atSpot = proximity?.kind === "at-spot";
  const forecastSpeed = forecastSlot?.speed;
  const delta =
    atSpot && Number.isFinite(forecastSpeed)
      ? Math.round((latest.speed - forecastSpeed) * 10) / 10
      : null;

  return {
    speed: latest.speed,
    gust: latest.gust ?? null,
    directionLabel: Number.isFinite(latest.direction)
      ? getCardinalDirection(latest.direction)
      : null,
    agoLabel: agoLabel(latest.time, nowMs),
    delta,
    history: bucketHistory(sorted, nowMs),
    caption: caption(proximity),
  };
}
