import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { scoreGuinchoModelSkill, modelLabel } from "../lib/forecast-experiment/guinchoModelSkill.js";
import {
  SUMMARY_PATH,
  STATION_READINGS_PATH,
  FORECAST_SLOTS_ARCHIVE_PATH,
  OPENMETEO_GUINCHO_PATH,
  loadCaboRasoObservations,
  loadGuinchoWindySlots,
  loadOpenMeteoGuinchoPoints,
} from "../lib/forecast-experiment/guinchoArchive.js";

console.log("Loading Cabo Raso 3294…");
const observations = await loadCaboRasoObservations();
console.log(`  ${observations.length} readings (${STATION_READINGS_PATH})`);

console.log("Loading Windy Guincho archive…");
const windySlots = await loadGuinchoWindySlots();
console.log(`  ${windySlots.length} slots (${FORECAST_SLOTS_ARCHIVE_PATH})`);

console.log("Loading Open-Meteo Guincho points…");
const openMeteoPoints = await loadOpenMeteoGuinchoPoints();
console.log(`  ${openMeteoPoints.length} points (${OPENMETEO_GUINCHO_PATH})`);

const summary = scoreGuinchoModelSkill({ observations, openMeteoPoints, windySlots });
const outPath = path.resolve(SUMMARY_PATH);
mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(summary)}\n`);

const winner = summary.winner;
if (winner) {
  console.log(
    `Winner Day −1 rideable: ${modelLabel(winner.model)} MAE ${winner.mae} kt on ${winner.hours} hours (${winner.caveat})`
  );
} else {
  console.log("No Day −1 rideable winner (no shared hours).");
}
console.log(`Wrote ${SUMMARY_PATH}`);
