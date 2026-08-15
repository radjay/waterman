import { SLOT_MS } from "../../lib/dayChart";

/**
 * Hover copy for a day-chart column.
 *
 *   10am forecast: 12kt (16*)  station: 6kt (9*)
 *
 * Station half is omitted when there is no reading in that slot (future, or a
 * beach with no sensor). Forecast always leads — it is what the column is.
 */

export function slotHourLabel(hour) {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function knotsPair(speed, gust) {
  if (!Number.isFinite(speed)) return null;
  const base = `${Math.round(speed)}kt`;
  return Number.isFinite(gust) ? `${base} (${Math.round(gust)}*)` : base;
}

/** Latest station sample that falls inside the slot and at or before now. */
export function stationInSlot(history, slotTs, nowMs = Date.now()) {
  if (!history?.length || !Number.isFinite(slotTs)) return null;
  const end = Math.min(slotTs + SLOT_MS, nowMs);
  if (end <= slotTs) return null;
  let best = null;
  for (const p of history) {
    if (!Number.isFinite(p?.time) || !Number.isFinite(p?.speed)) continue;
    if (p.time < slotTs || p.time >= end) continue;
    if (!best || p.time >= best.time) best = p;
  }
  return best;
}

export function columnHoverText(column, station = null, nowMs = Date.now()) {
  if (!column?.slot) return null;
  const forecast = knotsPair(column.slot.speed, column.slot.gust);
  if (!forecast) return null;

  const parts = [`${slotHourLabel(column.hour)} forecast: ${forecast}`];
  const live = stationInSlot(station?.history, column.slot.timestamp, nowMs);
  if (live) {
    const reading = knotsPair(live.speed, live.gust);
    if (reading) parts.push(`station: ${reading}`);
  }
  return parts.join("  ");
}
