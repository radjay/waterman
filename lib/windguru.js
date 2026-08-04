import { isValidWindReading, round1 } from "./forecast-experiment/units.js";

export const WINDGURU_IAPI_BASE = "https://www.windguru.cz/int/iapi.php";

/** Readings older than this are refused by the live path. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** Tolerance for clock skew between us and the station. */
const FUTURE_TOLERANCE_MS = 60 * 1000;

export function windguruHeaders(stationId) {
  return {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept: "application/json, */*",
    Referer: `https://www.windguru.cz/station/${stationId}`,
  };
}

/**
 * Parse an API numeric field. Explicit null/undefined/"" must stay absent,
 * not become 0 — Number(null) is 0 and Number.isFinite(0) is true, so a
 * naive `Number(value)` turns "no reading" into a real zero. Explicit nulls
 * are part of this API's vocabulary (wind_direction and temperature are both
 * null on a calm reading), and a fabricated 0 becomes a fabricated compass
 * bearing or a fabricated temperature in the permanent archive.
 *
 * Mirrors parseNumericKnots in lib/forecast-experiment/units.js.
 */
export function numeric(value) {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function sanitizeWind(value) {
  const number = numeric(value);
  if (!isValidWindReading(number)) return undefined;
  return round1(number);
}

export async function fetchCurrentStationPayload(stationId) {
  const response = await fetch(
    `${WINDGURU_IAPI_BASE}?q=station_data_current&id_station=${stationId}`,
    { cache: "no-store", headers: windguruHeaders(stationId) }
  );

  if (!response.ok) {
    throw new Error(`Windguru API error: ${response.status}`);
  }

  const data = await response.json();
  if (data?.return === "error") {
    throw new Error(data.message || "Windguru API error");
  }
  return data;
}

/**
 * A station reading, or null when the station is not actually reporting.
 *
 * A dead station returns {"datetime": "..."} with no unixtime and no wind
 * fields. A live station reporting calm ALSO omits wind_avg and wind_max —
 * so the wind fields cannot tell the two apart, and `wind_avg ?? 0` turns a
 * dead station into a fabricated calm reading. Because the fallback
 * timestamp would be Date.now(), it would be new on every poll and dedupe
 * could never catch it.
 *
 * unixtime is the discriminator. Present means a real reading, including a
 * legitimate zero. Absent means no reading at all.
 */
export function parseCurrentReading(payload, { nowMs = Date.now() } = {}) {
  if (!payload || typeof payload !== "object") return null;

  const unixtime = numeric(payload.unixtime);
  if (!unixtime || unixtime <= 0) return null;

  // Deliberately NOT rejecting on absent wind fields. A calm live station
  // omits wind_avg and wind_max too (route.js:58), so that check would throw
  // away every genuine calm reading. unixtime has already excluded the dead
  // station, which is the only thing absent wind could have caught.
  const time = unixtime * 1000;
  if (time > nowMs + FUTURE_TOLERANCE_MS) return null;
  if (time < nowMs - MAX_AGE_MS) return null;

  const speed = sanitizeWind(payload.wind_avg ?? 0);
  if (speed === undefined) return null;

  const tempC = numeric(payload.temperature);

  return {
    time,
    speed,
    gust: sanitizeWind(payload.wind_max),
    direction: numeric(payload.wind_direction),
    tempC: tempC === undefined ? undefined : round1(tempC),
  };
}

export async function fetchStationReading(stationId, { nowMs = Date.now() } = {}) {
  const payload = await fetchCurrentStationPayload(stationId);
  return parseCurrentReading(payload, { nowMs });
}

/**
 * The forecast-experiment shape, moved here so there is one iAPI client.
 * Re-exported by lib/forecast-experiment/windguruClient.js unchanged.
 */
export function assessQuality({ windSpeedKnots, windGustKnots, temperatureC, observedAt }) {
  const ageMs = Date.now() - observedAt;
  if (ageMs > 60 * 60 * 1000) return "stale";
  if (windSpeedKnots === 0 && windGustKnots === 0 && Number.isFinite(temperatureC)) {
    return "suspect";
  }
  return "ok";
}

export async function fetchWindguruCurrentStation(stationId) {
  const data = await fetchCurrentStationPayload(stationId);

  const observedAt = data.unixtime ? data.unixtime * 1000 : Date.now();
  const windSpeedKnots = sanitizeWind(data.wind_avg ?? 0);
  const windGustKnots = sanitizeWind(data.wind_max ?? 0);
  const temperatureC = numeric(data.temperature);
  const quality = assessQuality({ windSpeedKnots, windGustKnots, temperatureC, observedAt });

  return {
    observedAt,
    windSpeedKnots,
    windGustKnots,
    windDirectionDeg: numeric(data.wind_direction),
    temperatureC,
    quality,
    raw: data,
  };
}
