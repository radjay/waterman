#!/usr/bin/env node
/**
 * Small helper for LOOCV evaluation (Phase 1).
 *
 * Usage:
 *   node scripts/fx-loocv-evaluate.mjs --holdout-year 2025
 *   node scripts/fx-loocv-evaluate.mjs --holdout-year 2024
 *
 * It will:
 *   - Temporarily replace the default v3 model with the corresponding holdout-tuned model
 *   - Run the existing backtest for that summer
 *   - Restore the original model
 *   - Print key metrics
 */

import { copyFileSync, renameSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const DEFAULT_MODEL = join(ROOT, "data/forecast-experiment/bay-wind-v3-model.json");
const BACKUP_MODEL = join(ROOT, "data/forecast-experiment/bay-wind-v3-model.json.loocv-backup");

function parseArgs() {
  const args = process.argv.slice(2);
  const map = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i];
      const val = args[i + 1];
      if (val && !val.startsWith("--")) {
        map[key] = val;
        i++; // skip value
      } else {
        map[key] = true;
      }
    }
  }

  let modelHoldout = null;
  let evalSeason = null;

  if (map["--holdout-year"]) {
    modelHoldout = parseInt(map["--holdout-year"], 10);
    evalSeason = modelHoldout;
  }
  if (map["--model-holdout"]) {
    modelHoldout = parseInt(map["--model-holdout"], 10);
  }
  if (map["--eval-season"]) {
    evalSeason = parseInt(map["--eval-season"], 10);
  }

  if (!modelHoldout || ![2024, 2025].includes(modelHoldout)) {
    console.error("Usage examples:");
    console.error("  node scripts/fx-loocv-evaluate.mjs --holdout-year 2025");
    console.error("  node scripts/fx-loocv-evaluate.mjs --model-holdout 2025 --eval-season 2024");
    process.exit(1);
  }

  if (!evalSeason || ![2024, 2025].includes(evalSeason)) {
    console.error("Invalid --eval-season. Must be 2024 or 2025.");
    process.exit(1);
  }

  return { modelHoldout, evalSeason };
}

function main() {
  const { modelHoldout, evalSeason } = parseArgs();

  const holdoutModel = join(
    ROOT,
    `data/forecast-experiment/bay-wind-v3-model-holdout-${modelHoldout}.json`
  );

  if (!existsSync(holdoutModel)) {
    console.error(`Holdout model not found: ${holdoutModel}`);
    process.exit(1);
  }

  const label = modelHoldout === evalSeason 
    ? `Holdout ${evalSeason} (self)`
    : `Model tuned on ${modelHoldout} evaluated on ${evalSeason} (cross)`;

  console.log(`\n=== LOOCV Evaluation: ${label} ===`);
  console.log(`Using model: ${holdoutModel}`);
  console.log(`Evaluating on season: ${evalSeason}\n`);

  // Backup current default model if it exists
  let hadBackup = false;
  if (existsSync(DEFAULT_MODEL)) {
    copyFileSync(DEFAULT_MODEL, BACKUP_MODEL);
    hadBackup = true;
    console.log("Backed up current default model.");
  }

  // Swap in the holdout model
  copyFileSync(holdoutModel, DEFAULT_MODEL);
  console.log("Swapped in holdout-tuned model.");

  try {
    // Run backtest for the target evaluation season
    const env = { ...process.env, FX_BACKTEST_SEASON: String(evalSeason) };
    const cmd = `npm run fx:backtest:predictions -- --preset wingfoil-light`;

    console.log(`\nRunning backtest for Summer ${evalSeason}...\n`);
    const output = execSync(cmd, { cwd: ROOT, env, encoding: "utf8", stdio: "pipe" });

    console.log(output);

  } finally {
    // Always restore
    if (hadBackup && existsSync(BACKUP_MODEL)) {
      renameSync(BACKUP_MODEL, DEFAULT_MODEL);
      console.log("\nRestored original default model.");
    } else if (!hadBackup && existsSync(DEFAULT_MODEL)) {
      console.log("\nNo previous default model existed before the swap.");
    }
  }

  console.log(`\n=== Done evaluating ${label} ===\n`);
}

main();