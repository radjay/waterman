import { effectiveWindKnots, isValidWindReading, round1 } from "./units.js";
import {
  WINDGURU_IAPI_BASE,
  assessQuality,
  fetchWindguruCurrentStation,
  windguruHeaders,
} from "../windguru.js";

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function sanitizeWind(value) {
  const number = numeric(value);
  if (!isValidWindReading(number)) return undefined;
  return round1(number);
}

export { fetchWindguruCurrentStation };

export async function fetchWindguruStationData({
  stationId,
  from,
  to,
  avgMinutes = 10,
}) {
  const url = new URL(WINDGURU_IAPI_BASE);
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
