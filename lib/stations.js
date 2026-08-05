import { getCardinalDirection } from "./utils";

/**
 * Windguru stations we know the position of.
 *
 * Coordinates come from lib/forecast-experiment/locations.js, which sites
 * cabo-raso and cascais-bay against the same physical sensors.
 *
 * Station 15435 (Lagoa da Albufeira) is deliberately absent: it is dead, and
 * we do not know where it actually stands. Guessing its position from the
 * spot's coordinates would classify it "at-spot" on no evidence, which is
 * exactly the mistake classifyProximity exists to prevent.
 */
export const STATIONS = {
  "2329": { name: "Marina de Cascais", latitude: 38.6919, longitude: -9.4203 },
  "3294": { name: "Cabo Raso", latitude: 38.7089, longitude: -9.4859 },
};

/** Under this, the station is measuring the spot rather than the region. */
export const AT_SPOT_KM = 1;

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function stationIdFromUrl(url) {
  if (typeof url !== "string") return null;
  const match = url.match(/windguru\.cz\/station\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * One entry per distinct station, carrying the spots that point at it.
 * Two spots share 2329 and two share 3294, so polling per spot would fetch
 * the same sensor twice.
 */
export function stationTargetsFromSpots(spots) {
  const byStation = new Map();

  for (const spot of spots || []) {
    const stationId = stationIdFromUrl(spot?.liveReportUrl);
    if (!stationId) continue;
    if (!byStation.has(stationId)) byStation.set(stationId, []);
    byStation.get(stationId).push(spot._id);
  }

  return [...byStation.entries()].map(([stationId, spotIds]) => ({ stationId, spotIds }));
}

export function distanceKm(from, to) {
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.sin(deltaLon / 2) ** 2 * Math.cos(fromLat) * Math.cos(toLat);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function bearingDegrees(from, to) {
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const y = Math.sin(deltaLon) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon);

  return (Math.atan2(y, x) * 180) / Math.PI;
}

/**
 * Whether this station measures the spot, or merely the neighbourhood.
 *
 * Only an "at-spot" station is allowed to move the verdict. An unmapped
 * station is always "nearby", so adding a spot with an unknown station cannot
 * silently start flipping verdicts.
 */
export function classifyProximity(stationId, spot) {
  const station = STATIONS[stationId] || null;
  const hasSpotCoords =
    Number.isFinite(spot?.latitude) && Number.isFinite(spot?.longitude);

  if (!station || !hasSpotCoords) {
    return { kind: "nearby", station, distanceKm: null, bearingLabel: null };
  }

  const km = distanceKm(spot, station);
  if (km < AT_SPOT_KM) {
    return { kind: "at-spot", station, distanceKm: km, bearingLabel: null };
  }

  return {
    kind: "nearby",
    station,
    distanceKm: km,
    bearingLabel: getCardinalDirection(bearingDegrees(spot, station)),
  };
}
