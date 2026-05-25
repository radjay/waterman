import { kmhToKnots, msToKnots } from "./units.js";

const IPMA_OBSERVATIONS_URL = "https://api.ipma.pt/open-data/observation/meteorology/stations/observations.json";
const IPMA_STATIONS_URL = "https://api.ipma.pt/open-data/observation/meteorology/stations/stations.json";

export async function fetchIpmaStations() {
  const response = await fetch(IPMA_STATIONS_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`IPMA stations API error: ${response.status}`);
  return await response.json();
}

export async function fetchIpmaHourlyObservations() {
  const response = await fetch(IPMA_OBSERVATIONS_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`IPMA observations API error: ${response.status}`);
  return await response.json();
}

export function parseIpmaObservations(payload, stationAllowList = []) {
  const observations = [];
  for (const [isoMinute, stationMap] of Object.entries(payload)) {
    const observedAt = Date.parse(`${isoMinute}:00Z`);
    if (!Number.isFinite(observedAt)) continue;
    for (const [stationId, raw] of Object.entries(stationMap)) {
      if (!raw || typeof raw !== "object") continue;
      if (stationAllowList.length > 0 && !stationAllowList.includes(stationId)) continue;
      const windMs = valid(raw.intensidadeVento);
      const windKmh = valid(raw.intensidadeVentoKM);
      observations.push({
        stationId,
        observedAt,
        windSpeedKnots: windMs !== undefined ? msToKnots(windMs) : windKmh !== undefined ? kmhToKnots(windKmh) : undefined,
        windGustKnots: undefined,
        windDirectionDeg: ipmaDirectionClassToDegrees(raw.idDireccVento),
        temperatureC: valid(raw.temperatura),
        pressureMslHpa: valid(raw.pressao),
        humidityPct: valid(raw.humidade),
        radiationKjM2: valid(raw.radiacao),
        quality: hasNoData(raw) ? "nodata" : "ok",
        raw,
      });
    }
  }
  return observations;
}

export function ipmaDirectionClassToDegrees(value) {
  const code = Number(value);
  const map = {
    1: 0,
    2: 45,
    3: 90,
    4: 135,
    5: 180,
    6: 225,
    7: 270,
    8: 315,
    9: 0,
  };
  return map[code];
}

function valid(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number === -99 || number === -99.0) return undefined;
  return number;
}

function hasNoData(raw) {
  return Object.values(raw).some((value) => Number(value) === -99);
}
