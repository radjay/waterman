import { effectiveWindKnots, isValidWindReading, round1 } from "./units.js";

const IAPI_BASE = "https://www.windguru.cz/int/iapi.php";

function windguruHeaders(stationId) {
  return {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept: "application/json, */*",
    Referer: `https://www.windguru.cz/station/${stationId}`,
  };
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function sanitizeWind(value) {
  const number = numeric(value);
  if (!isValidWindReading(number)) return undefined;
  return round1(number);
}

function assessQuality({ windSpeedKnots, windGustKnots, temperatureC, observedAt }) {
  const ageMs = Date.now() - observedAt;
  if (ageMs > 60 * 60 * 1000) return "stale";
  if (windSpeedKnots === 0 && windGustKnots === 0 && Number.isFinite(temperatureC)) {
    return "suspect";
  }
  return "ok";
}

export async function fetchWindguruCurrentStation(stationId) {
  const url = `${IAPI_BASE}?q=station_data_current&id_station=${stationId}`;
  const response = await fetch(url, {
    cache: "no-store",
    headers: windguruHeaders(stationId),
  });

  if (!response.ok) {
    throw new Error(`Windguru API error: ${response.status}`);
  }

  const data = await response.json();
  if (data?.return === "error") {
    throw new Error(data.message || "Windguru API error");
  }

  const observedAt = data.unixtime ? data.unixtime * 1000 : Date.now();
  const windSpeedKnots = sanitizeWind(data.wind_avg ?? 0);
  const windGustKnots = sanitizeWind(data.wind_max ?? 0);
  const temperatureC = numeric(data.temperature);

  return {
    observedAt,
    windSpeedKnots,
    windGustKnots,
    windDirectionDeg: numeric(data.wind_direction),
    temperatureC,
    quality: assessQuality({ windSpeedKnots, windGustKnots, temperatureC, observedAt }),
    raw: data,
  };
}

export async function fetchWindguruStationData({
  stationId,
  from,
  to,
  avgMinutes = 10,
}) {
  const url = new URL(IAPI_BASE);
  url.searchParams.set("q", "station_data");
  url.searchParams.set("id_station", stationId);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("avg_minutes", String(avgMinutes));

  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: windguruHeaders(stationId),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Windguru historical API error: ${response.status}`);
  }

  const json = JSON.parse(text);
  if (json?.return === "error") {
    throw new Error(json.message || "Windguru historical API error");
  }
  return json;
}

export function parseWindguruStationData(json, meta) {
  const times = json.unixtime ?? [];
  const observations = [];

  for (let index = 0; index < times.length; index += 1) {
    const observedAt = Number(times[index]) * 1000;
    if (!Number.isFinite(observedAt)) continue;

    const windSpeedKnots = sanitizeWind(json.wind_avg?.[index]);
    const windGustKnots = sanitizeWind(json.wind_max?.[index]);
    const temperatureC = numeric(json.temperature?.[index]);

    if (windSpeedKnots === undefined && windGustKnots === undefined) continue;

    const obs = {
      observedAt,
      windSpeedKnots,
      windGustKnots,
      windDirectionDeg: numeric(json.wind_direction?.[index]),
      temperatureC,
    };

    observations.push({
      sourceSlug: meta.sourceSlug,
      provider: "windguru",
      providerStationId: meta.stationId,
      locationSlug: meta.locationSlug,
      receivedAt: Date.now(),
      ...obs,
      quality: assessQuality({ ...obs, temperatureC, observedAt }),
      raw: {
        datetime: json.datetime?.[index] ?? null,
      },
    });
  }

  return observations;
}

export { effectiveWindKnots };
