import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { writeFileSync } from "node:fs";
import { formatModelSkillTable } from "../lib/forecast-experiment/modelSkillAnalysis.js";
import { runModelSkillAnalysis } from "../lib/forecast-experiment/runModelSkillAnalysis.js";

dotenv.config({ path: ".env.local" });

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const locationSlug = process.env.FX_SKILL_LOCATION || "cascais-bay";
const startDateLocal = process.env.FX_SKILL_START_DATE || "2025-05-01";
const endDateLocal = process.env.FX_SKILL_END_DATE || "2025-09-30";
const outputPath = process.env.FX_SKILL_OUTPUT;

console.log(`Fetching observations and forecasts for ${locationSlug}`);
console.log(`Window: ${startDateLocal} to ${endDateLocal}`);

const result = await runModelSkillAnalysis(convex, {
  locationSlug,
  startDateLocal,
  endDateLocal,
});

if (!result.ok) {
  throw new Error(result.error);
}

const { analysis, window, modelsAnalyzed: models } = result;

const summary = {
  locationSlug,
  startDateLocal,
  endDateLocal,
  overlapStartDateLocal: window.startDateLocal,
  overlapEndDateLocal: window.endDateLocal,
  daysAnalyzed: window.daysAnalyzed,
  modelsAnalyzed: models,
  regimeCounts: analysis.totals,
  winnerOverall: result.winnerOverall,
  winnerNortada: result.winnerNortada,
  ranking: analysis.models,
  byModel: analysis.byModel,
};

console.log("");
console.log("=== Model skill analysis (CNC Foil / cascais-bay) ===");
console.log(`Overlap: ${window.startDateLocal} – ${window.endDateLocal} (${window.daysAnalyzed} days)`);
console.log(`Comparable hours (per model): ${analysis.totals.overall}`);
console.log(`  Nortada hours: ${analysis.totals.nortada}`);
console.log(`  Non-Nortada hours: ${analysis.totals.nonNortada}`);
console.log(`Models: ${models.join(", ")}`);
console.log("");
console.log(formatModelSkillTable(analysis));

if (summary.winnerOverall) {
  console.log("");
  console.log(
    `Overall winner (effective MAE): ${summary.winnerOverall.model} (${summary.winnerOverall.effectiveMae?.toFixed(2)} kt)`
  );
}
if (summary.winnerNortada) {
  console.log(
    `Nortada winner (effective MAE): ${summary.winnerNortada.model} (${summary.winnerNortada.effectiveMae?.toFixed(2)} kt, n=${summary.winnerNortada.sampleCount})`
  );
}

if (outputPath) {
  writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`\nWrote ${outputPath}`);
}

