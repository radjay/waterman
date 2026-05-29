/**
 * Pure helpers for deduplicating forecast slots that share a timestamp
 * but come from different scrapes.
 */

export function dedupeSlotsByTimestamp(slots) {
  const byTimestamp = new Map();
  for (const slot of slots) {
    const existing = byTimestamp.get(slot.timestamp);
    if (!existing) {
      byTimestamp.set(slot.timestamp, slot);
      continue;
    }
    const scrapeTs = slot.scrapeTimestamp || 0;
    const existingScrapeTs = existing.scrapeTimestamp || 0;
    if (scrapeTs > existingScrapeTs) {
      byTimestamp.set(slot.timestamp, slot);
    }
  }
  return Array.from(byTimestamp.values()).sort((a, b) => a.timestamp - b.timestamp);
}

export function filterSlotsOverlappingWindow(slots, startTime, endTime, slotDurationMs) {
  return slots.filter((slot) => {
    const slotStart = slot.timestamp;
    const slotEnd = slotStart + slotDurationMs;
    return slotStart <= endTime && slotEnd >= startTime;
  });
}
