/**
 * Collapse a batch to one reading per timestamp, ascending.
 *
 * The live path fetches one reading at a time, but the backfill pages
 * thousands at once and the same observation can appear in two overlapping
 * weekly chunks. Deduping in memory first keeps the mutation from doing an
 * indexed lookup per duplicate.
 */
export function dedupeReadingsByTime(readings) {
  const byTime = new Map();

  for (const reading of readings || []) {
    if (!Number.isFinite(reading?.time)) continue;
    if (!byTime.has(reading.time)) byTime.set(reading.time, reading);
  }

  return [...byTime.values()].sort((a, b) => a.time - b.time);
}
