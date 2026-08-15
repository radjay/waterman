import { SLOT_MS, TZ, columnAtPct, timePctOnChart } from "../../lib/dayChart";
import { dtf } from "../../lib/datetime";

/**
 * Hover copy for the NOW wind band.
 *
 * Two hit targets share one overlay:
 *   - a forecast 3h column → `1pm forecast: 12kt (16*)  station: 6kt (9*)`
 *   - a station wind reading → `15:42 station: 6kt (9*)  forecast: 12kt (16*)`
 *
 * Station hits win when the pointer is close to a plotted reading, so a 15:42
 * sample does not collapse to the 1pm slot label.
 */

/** How close (track %) the pointer must be to prefer a station sample. */
export const STATION_HIT_PCT = 2.25;

export function slotHourLabel(hour) {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

/** Lisbon wall clock for a station sample — `15:42`, never a slot hour. */
export function clockLabel(ms, timeZone = TZ) {
  if (!Number.isFinite(ms)) return null;
  return dtf("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(new Date(ms));
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

/**
 * Station-led tip: exact sample time first, overlapping forecast when known.
 *
 * `point.forecast` / `forecastGust` come from attachForecast on the station
 * card; otherwise the covering column's slot is used.
 */
export function stationHoverText(point, chart = null) {
  if (!point || !Number.isFinite(point.time)) return null;
  const reading = knotsPair(point.speed, point.gust);
  if (!reading) return null;

  const clock = clockLabel(point.time);
  if (!clock) return null;

  const parts = [`${clock} station: ${reading}`];

  let forecast = knotsPair(point.forecast, point.forecastGust);
  if (!forecast && chart?.columns?.length) {
    const covering = chart.columns.find(
      (c) =>
        c.slot?.timestamp <= point.time && point.time < c.slot.timestamp + SLOT_MS
    );
    forecast = covering ? knotsPair(covering.slot.speed, covering.slot.gust) : null;
  }
  if (forecast) parts.push(`forecast: ${forecast}`);

  return parts.join("  ");
}

/**
 * Resolve what the pointer is on: a station sample, or a forecast column.
 *
 * @returns {{ kind: 'station'|'column', xPct: number, text: string } | null}
 */
export function resolveChartHover({
  chart,
  station = null,
  xPct,
  nowMs = Date.now(),
  stationHitPct = STATION_HIT_PCT,
}) {
  if (!chart?.columns?.length || !Number.isFinite(xPct)) return null;

  const history = station?.history ?? [];
  let nearest = null;
  let nearestDist = Infinity;
  let nearestPct = null;

  for (const p of history) {
    if (!Number.isFinite(p?.time) || !Number.isFinite(p?.speed)) continue;
    if (p.time > nowMs) continue;
    const pct = timePctOnChart(chart, p.time);
    if (pct == null || pct < 0 || pct > 100) continue;
    const dist = Math.abs(pct - xPct);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = p;
      nearestPct = pct;
    }
  }

  if (nearest && nearestDist <= stationHitPct) {
    const text = stationHoverText(nearest, chart);
    if (text) {
      return { kind: "station", xPct: nearestPct, text };
    }
  }

  const column = columnAtPct(chart, xPct);
  if (!column) return null;
  const text = columnHoverText(column, station, nowMs);
  if (!text) return null;
  return {
    kind: "column",
    xPct: column.left + column.width / 2,
    text,
  };
}
