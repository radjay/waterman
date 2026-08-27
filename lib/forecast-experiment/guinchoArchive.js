import { createReadStream, existsSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import {
  CABO_RASO_STATION_ID,
  FORECAST_SLOTS_ARCHIVE_PATH,
  GUINCHO_SPOT_ID,
  OPENMETEO_GUINCHO_PATH,
  STATION_READINGS_PATH,
  SUMMARY_PATH,
} from "./guinchoModelSkillConstants.js";
import { mapStationReading, mapWindySlot } from "./guinchoModelSkill.js";

export {
  FORECAST_SLOTS_ARCHIVE_PATH,
  OPENMETEO_GUINCHO_PATH,
  STATION_READINGS_PATH,
  SUMMARY_PATH,
};

export function resolveRepoPath(relativePath, cwd = process.cwd()) {
  return path.resolve(cwd, relativePath);
}

export function assertReadable(relativePath, cwd = process.cwd()) {
  const fullPath = resolveRepoPath(relativePath, cwd);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing archive file: ${relativePath}`);
  }
  return fullPath;
}

export async function readJsonl(relativePath, onRow, cwd = process.cwd()) {
  const fullPath = assertReadable(relativePath, cwd);
  const input = createReadStream(fullPath, { encoding: "utf8" });
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    onRow(JSON.parse(line));
  }
}

export async function loadCaboRasoObservations(cwd = process.cwd()) {
  const observations = [];
  await readJsonl(STATION_READINGS_PATH, (row) => {
    if (String(row.stationId) !== CABO_RASO_STATION_ID) return;
    const mapped = mapStationReading(row);
    if (mapped && Number.isFinite(mapped.observedAt)) observations.push(mapped);
  }, cwd);
  return observations;
}

export async function loadGuinchoWindySlots(cwd = process.cwd()) {
  const slots = [];
  await readJsonl(FORECAST_SLOTS_ARCHIVE_PATH, (row) => {
    if (row.spotId !== GUINCHO_SPOT_ID) return;
    const mapped = mapWindySlot(row);
    if (mapped && Number.isFinite(mapped.validTime) && Number.isFinite(mapped.scrapeTimestamp)) {
      slots.push(mapped);
    }
  }, cwd);
  return slots;
}

export async function loadOpenMeteoGuinchoPoints(cwd = process.cwd()) {
  const points = [];
  await readJsonl(OPENMETEO_GUINCHO_PATH, (row) => {
    if (!row?.model || !Number.isFinite(row.validTime)) return;
    points.push(row);
  }, cwd);
  return points;
}

export function ensureOpenMeteoDir(cwd = process.cwd()) {
  const dir = path.dirname(resolveRepoPath(OPENMETEO_GUINCHO_PATH, cwd));
  mkdirSync(dir, { recursive: true });
  return resolveRepoPath(OPENMETEO_GUINCHO_PATH, cwd);
}
