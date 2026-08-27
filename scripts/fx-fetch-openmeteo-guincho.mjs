import { createWriteStream } from "node:fs";
import { GUINCHO_MODELS, buildGuinchoPreviousRunsUrl, parsePreviousRunsHourly } from "../lib/forecast-experiment/guinchoModelSkill.js";
import { OPENMETEO_GUINCHO_PATH, ensureOpenMeteoDir } from "../lib/forecast-experiment/guinchoArchive.js";

const startDate = process.env.FX_GUINCHO_START_DATE || "2024-01-01";
const endDate = process.env.FX_GUINCHO_END_DATE || new Date().toISOString().slice(0, 10);
const outPath = ensureOpenMeteoDir();
const chunks = buildMonthChunks(startDate, endDate);

const counts = Object.fromEntries(
  GUINCHO_MODELS.map((model) => [model.slug, { 0: 0, 1: 0, 2: 0 }])
);

const output = createWriteStream(outPath, { flags: "w" });
let written = 0;

console.log(`Fetching Open-Meteo Previous Runs for Guincho → ${OPENMETEO_GUINCHO_PATH}`);
console.log(`Window: ${startDate} → ${endDate} (${chunks.length} months)`);

try {
  for (const chunk of chunks) {
    for (const model of GUINCHO_MODELS) {
      const url = buildGuinchoPreviousRunsUrl({
        startDate: chunk.startDate,
        endDate: chunk.endDate,
        openMeteoModel: model.openMeteoModel,
      });
      const response = await fetch(url);
      const text = await response.text();
      if (!response.ok) {
        console.warn(`Skip ${model.slug} ${chunk.startDate}: HTTP ${response.status} ${text.slice(0, 160)}`);
        await sleep(500);
        continue;
      }
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        console.warn(`Skip ${model.slug} ${chunk.startDate}: invalid JSON`);
        await sleep(500);
        continue;
      }
      const points = parsePreviousRunsHourly(json, { modelSlug: model.slug });
      for (const point of points) {
        counts[model.slug][point.leadDay] += 1;
        output.write(`${JSON.stringify(point)}\n`);
        written += 1;
      }
      console.log(`  ${chunk.startDate} ${model.slug}: ${points.length} points`);
      await sleep(400);
    }
  }
} finally {
  await new Promise((resolve, reject) => {
    output.end(() => resolve());
    output.on("error", reject);
  });
}

console.log(`Wrote ${written} points to ${outPath}`);
console.log("Preflight non-null counts by model and lead day:");
for (const model of GUINCHO_MODELS) {
  const row = counts[model.slug];
  console.log(`  ${model.windyLabel} (${model.slug}): Day0=${row[0]} Day-1=${row[1]} Day-2=${row[2]}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildMonthChunks(rangeStart, rangeEnd) {
  const start = new Date(`${rangeStart}T00:00:00Z`);
  const end = new Date(`${rangeEnd}T00:00:00Z`);
  const chunks = [];
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor <= end) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
    const chunkStart = start > cursor ? rangeStart : monthStart;
    const chunkEnd = lastDay > rangeEnd ? rangeEnd : lastDay;
    chunks.push({ startDate: chunkStart, endDate: chunkEnd });
    cursor = new Date(Date.UTC(year, month + 1, 1));
  }
  return chunks;
}
