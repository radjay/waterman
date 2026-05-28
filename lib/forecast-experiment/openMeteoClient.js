import { createHash } from "node:crypto";
import { leadHours } from "./time.js";
import { isUsableForecastPoint, parseNumericKnots } from "./units.js";

const SINGLE_RUNS_ENDPOINT = "https://single-runs-api.open-meteo.com/v1/forecast";
const PREVIOUS_RUNS_ENDPOINT = "https://previous-runs-api.open-meteo.com/v1/forecast";

export const HOURLY_VARIABLES = [
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "temperature_2m",
  "cloud_cover",
  "pressure_msl",
  "shortwave_radiation",
  "boundary_layer_height",
];

export function responseHash(text) {
  return createHash("sha256").update(text).digest("hex");
}

export function buildSingleRunUrl({ location, model, run, forecastDays = 3 }) {
  const url = new URL(SINGLE_RUNS_ENDPOINT);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("hourly", HOURLY_VARIABLES.join(","));
  url.searchParams.set("wind_speed_unit", "kn");
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("forecast_days", String(forecastDays));
  url.searchParams.set("models", model.openMeteoModel);
  url.searchParams.set("run", run);
  return url;
}

export async function fetchSingleRun({ location, model, run, forecastDays = 3 }) {
  const url = buildSingleRunUrl({ location, model, run, forecastDays });
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Open-Meteo ${response.status}: ${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text);
  return { json, url: url.toString(), hash: responseHash(text) };
}

export function parseSingleRunPoints({ json, locationSlug, runStartedAt }) {
  const hourly = json.hourly;
  if (!hourly?.time) return [];
  return hourly.time.map((time, index) => {
    const validTime = Date.parse(`${time}Z`);
    return {
      locationSlug,
      validTime,
      leadHours: leadHours(runStartedAt, validTime),
      intervalMinutes: 60,
      windSpeedKnots: parseNumericKnots(hourly.wind_speed_10m?.[index]),
      windGustKnots: parseNumericKnots(hourly.wind_gusts_10m?.[index]),
      windDirectionDeg: parseNumericKnots(hourly.wind_direction_10m?.[index]),
      temperatureC: parseNumericKnots(hourly.temperature_2m?.[index]),
      cloudCoverPct: parseNumericKnots(hourly.cloud_cover?.[index]),
      pressureMslHpa: parseNumericKnots(hourly.pressure_msl?.[index]),
      shortwaveRadiation: parseNumericKnots(hourly.shortwave_radiation?.[index]),
      boundaryLayerHeightM: parseNumericKnots(hourly.boundary_layer_height?.[index]),
      raw: { time },
    };
  }).filter(isUsableForecastPoint);
}

export function buildPreviousRunsUrl({ location, model, startDate, endDate }) {
  const url = new URL(PREVIOUS_RUNS_ENDPOINT);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("hourly", [
    "wind_speed_10m_previous_day0",
    "wind_speed_10m_previous_day1",
    "wind_speed_10m_previous_day2",
    "wind_direction_10m_previous_day0",
    "wind_direction_10m_previous_day2",
    "wind_gusts_10m_previous_day0",
    "wind_gusts_10m_previous_day1",
    "wind_gusts_10m_previous_day2",
  ].join(","));
  url.searchParams.set("wind_speed_unit", "kn");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("models", model.openMeteoModel);
  return url;
}
