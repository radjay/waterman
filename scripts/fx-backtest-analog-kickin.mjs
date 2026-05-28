/**
 * Compare analog kick-in (train year → test year holdout) vs v3.6 ML.
 *
 * npm run fx:backtest:analog-kickin
 * npm run fx:backtest:analog-kickin -- --train-year 2024 --test-year 2025 --k 12
 */
import dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { runAnalogHoldoutComparison } from "../lib/forecast-experiment/analogKickInBacktest.js";
import {
  DEFAULT_RIDEABILITY_PRESET,
  resolveRideabilityThreshold,
} from "../lib/forecast-experiment/rideabilityThresholds.js";

dotenv.config({ path: ".env.local" });

function parseArgs(argv) {
  let trainYear = 2024;
  let testYear = 2025;
  let k = 12;
  let sessionThreshold = 0.5;
  let preset;
  let thresholdKnots;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--train-year" && argv[index + 1]) {
      trainYear = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--test-year" && argv[index + 1]) {
      testYear = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--k" && argv[index + 1]) {
      k = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--session-threshold" && argv[index + 1]) {
      sessionThreshold = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--preset" && argv[index + 1]) {
      preset = argv[index + 1];
      index += 1;
    } else if (arg === "--threshold" && argv[index + 1]) {
      thresholdKnots = Number(argv[index + 1]);
      index += 1;
    }
  }

  return { trainYear, testYear, k, sessionThreshold, preset, thresholdKnots };
}

function formatSummaryLine(label, summary) {
  const mae = summary.meanAbsoluteErrorMinutes;
  const withinHour =
    summary.daysComparable > 0 ? `${summary.withinHourCount}/${summary.daysComparable}` : "—";
  const precision =
    summary.rideablePrecision != null ? `${Math.round(summary.rideablePrecision * 100)}%` : "—";
  const recall =
    summary.rideableRecall != null ? `${Math.round(summary.rideableRecall * 100)}%` : "—";
  return [
    `${label}:`,
    `MAE ${mae != null ? `${mae} min` : "—"}`,
    `within ±1h ${withinHour}`,
    `precision ${precision}`,
    `recall ${recall}`,
    `false+ ${summary.falsePositiveCount}`,
    `false- ${summary.falseNegativeCount}`,
    `daysComparable ${summary.daysComparable}`,
  ].join(" ");
}

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}

const { trainYear, testYear, k, sessionThreshold, preset, thresholdKnots } = parseArgs(
  process.argv.slice(2)
);
const resolvedThreshold = resolveRideabilityThreshold({
  thresholdKnots,
  preset: preset ?? DEFAULT_RIDEABILITY_PRESET,
});

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

console.log(`Analog holdout backtest: train ${trainYear} → test ${testYear}`);
console.log(`Threshold: ${resolvedThreshold} kt · K=${k} · sessionThreshold=${sessionThreshold}`);
console.log("");

const result = await runAnalogHoldoutComparison(convex, {
  trainYear,
  testYear,
  thresholdKnots: resolvedThreshold,
  preset,
  analogOptions: { k, sessionThreshold },
});

if (!result.ok) {
  throw new Error(result.error);
}

console.log(`Analog index: ${result.analogIndexSize} observed days from ${trainYear}`);
console.log(`Test days: ${result.testDayCount} (${testYear})`);
console.log("");
console.log(formatSummaryLine(`Analog (${result.analog.modelVersion})`, result.analog.summary));
console.log(formatSummaryLine(`ML (${result.ml.modelVersion})`, result.ml.summary));

const analogMae = result.analog.summary.meanAbsoluteErrorMinutes;
const mlMae = result.ml.summary.meanAbsoluteErrorMinutes;
if (Number.isFinite(analogMae) && Number.isFinite(mlMae)) {
  const delta = mlMae - analogMae;
  console.log("");
  console.log(
    `Analog MAE delta vs ML: ${delta > 0 ? "+" : ""}${Math.round(delta)} min (${delta >= 0 ? "analog better" : "ML better"})`
  );
  console.log(
    `False positives: analog ${result.analog.summary.falsePositiveCount} vs ML ${result.ml.summary.falsePositiveCount}`
  );
}
