import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";

dotenv.config({ path: ".env.local" });

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const pageSize = Number(process.env.FX_PURGE_PAGE_SIZE || "500");

const workerRunId = await convex.mutation(api.forecastExperiment.startWorkerRun, {
  workerName: "fx-purge-forecast-gaps",
  metadata: { pageSize },
});

let deletedPoints = 0;
let scannedPoints = 0;
let pages = 0;

try {
  let cursor = undefined;
  let isDone = false;

  while (!isDone) {
    const result = await convex.mutation(api.forecastExperiment.purgeUnusableForecastPoints, {
      cursor,
      pageSize,
    });
    deletedPoints += result.deleted;
    scannedPoints += result.scanned;
    pages += 1;
    cursor = result.continueCursor;
    isDone = result.isDone;
    console.log(
      `page ${pages}: deleted ${result.deleted}/${result.scanned} (total deleted ${deletedPoints})`
    );
  }

  const emptyRuns = await convex.mutation(api.forecastExperiment.purgeEmptyForecastRuns, {});
  console.log(`Removed ${emptyRuns.deletedRuns} empty forecast runs`);

  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "success",
    attemptedCount: pages,
    insertedCount: deletedPoints,
    metadata: { deletedPoints, scannedPoints, deletedRuns: emptyRuns.deletedRuns },
  });

  console.log(`Done. Purged ${deletedPoints} unusable forecast points.`);
} catch (error) {
  await convex.mutation(api.forecastExperiment.finishWorkerRun, {
    workerRunId,
    status: "failed",
    attemptedCount: pages,
    insertedCount: deletedPoints,
    errorMessage: error.message,
  });
  throw error;
}
