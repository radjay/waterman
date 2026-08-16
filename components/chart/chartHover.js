import { SLOT_MS, TZ, columnAtPct, timePctOnChart } from "../../lib/dayChart";
import { dtf } from "../../lib/datetime";

/**
 * Hover tip for the NOW / spot-forecast wind band.
 *
 * Two hit targets share one overlay:
 *   - a forecast 3h column
 *   - a station wind reading (wins when the pointer is close to a plotted sample)
 *
 * The tip is a stacked card — time, then up to two lines:
 *   Live {speed}kt ({gust}*)
 *   Forecast {speed}kt ({gust}*)
 * rendered by ChartColumnHover. Station hits keep the sample's wall clock so a
 * 15:42 reading does not collapse to the 1pm slot label.
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

/** `1kt` or `1kt (3*)` — no space before kt; gust as parenthetical *. */
function windLine(label, speed, gust) {
  let text = `${label} ${Math.round(speed)}kt`;
  if (Number.isFinite(gust)) text += ` (${Math.round(gust)}*)`;
  return text;
}

/**
 * Build the tip card rows from the numbers we have.
 *
 * At most two data lines: Live (station accent/primary) and Forecast (muted
 * grey). Gusts fold into the same line as `(N*)`; omit a line entirely when
 * that series is absent. Matches WindBand + LIVE badge colour roles.
 */
export function windHoverRows({
  stationSpeed = null,
  stationGust = null,
  forecastSpeed = null,
  forecastGust = null,
} = {}) {
  const rows = [];
  if (Number.isFinite(stationSpeed)) {
    rows.push({
      key: "live",
      text: windLine("Live", stationSpeed, stationGust),
      tone: "accent",
    });
  }
  if (Number.isFinite(forecastSpeed)) {
    rows.push({
      key: "forecast",
      text: windLine("Forecast", forecastSpeed, forecastGust),
      tone: "muted",
    });
  }
  return rows;
}

/** Plain-text fallback / aria summary of a hover card. */
export function hoverCardText(card) {
  if (!card?.time || !card.rows?.length) return null;
  return [card.time, ...card.rows.map((r) => r.text)].join(" · ");
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

export function columnHoverCard(column, station = null, nowMs = Date.now()) {
  if (!column?.slot || !Number.isFinite(column.slot.speed)) return null;
  const live = stationInSlot(station?.history, column.slot.timestamp, nowMs);
  const rows = windHoverRows({
    stationSpeed: live?.speed,
    stationGust: live?.gust,
    forecastSpeed: column.slot.speed,
    forecastGust: column.slot.gust,
  });
  if (!rows.length) return null;
  return { time: slotHourLabel(column.hour), rows };
}

/** @deprecated Prefer columnHoverCard — kept for callers/tests expecting a string. */
export function columnHoverText(column, station = null, nowMs = Date.now()) {
  return hoverCardText(columnHoverCard(column, station, nowMs));
}

/**
 * Station-led tip: exact sample time first, overlapping forecast when known.
 *
 * `point.forecast` / `forecastGust` come from attachForecast on the station
 * card; otherwise the covering column's slot is used.
 */
export function stationHoverCard(point, chart = null) {
  if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.speed)) return null;
  const clock = clockLabel(point.time);
  if (!clock) return null;

  let forecastSpeed = Number.isFinite(point.forecast) ? point.forecast : null;
  let forecastGust = Number.isFinite(point.forecastGust) ? point.forecastGust : null;
  if (forecastSpeed == null && chart?.columns?.length) {
    const covering = chart.columns.find(
      (c) =>
        c.slot?.timestamp <= point.time && point.time < c.slot.timestamp + SLOT_MS
    );
    if (covering?.slot) {
      forecastSpeed = covering.slot.speed;
      forecastGust = covering.slot.gust;
    }
  }

  const rows = windHoverRows({
    stationSpeed: point.speed,
    stationGust: point.gust,
    forecastSpeed,
    forecastGust,
  });
  if (!rows.length) return null;
  return { time: clock, rows };
}

/** @deprecated Prefer stationHoverCard — kept for callers/tests expecting a string. */
export function stationHoverText(point, chart = null) {
  return hoverCardText(stationHoverCard(point, chart));
}

/**
 * Plot marks for a hover hit — same x as `xPct`, values for WindBand's y scale.
 *
 * Station: speed (+ gust) at the sample. Column: the forecast slot band, and the
 * in-slot station sample when the tip mentions one.
 */
export function hoverMarks({ kind, xPct, point = null, column = null, stationPoint = null, chart = null }) {
  if (kind === "station" && point && Number.isFinite(point.speed)) {
    return {
      xPct,
      station: {
        xPct,
        speed: point.speed,
        gust: Number.isFinite(point.gust) ? point.gust : null,
      },
    };
  }
  if (kind === "column" && column?.slot && Number.isFinite(column.slot.speed)) {
    const marks = {
      xPct,
      column: {
        left: column.left,
        width: column.width,
        speed: column.slot.speed,
        gust: Number.isFinite(column.slot.gust) ? column.slot.gust : null,
      },
    };
    if (stationPoint && Number.isFinite(stationPoint.speed)) {
      const sx = timePctOnChart(chart, stationPoint.time);
      if (sx != null && sx >= 0 && sx <= 100) {
        marks.station = {
          xPct: sx,
          speed: stationPoint.speed,
          gust: Number.isFinite(stationPoint.gust) ? stationPoint.gust : null,
        };
      }
    }
    return marks;
  }
  return null;
}

/**
 * Resolve what the pointer is on: a station sample, or a forecast column.
 *
 * @returns {{ kind: 'station'|'column', xPct: number, card: object, text: string, marks: object } | null}
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
    const card = stationHoverCard(nearest, chart);
    if (card) {
      return {
        kind: "station",
        xPct: nearestPct,
        card,
        text: hoverCardText(card),
        marks: hoverMarks({ kind: "station", xPct: nearestPct, point: nearest }),
      };
    }
  }

  const column = columnAtPct(chart, xPct);
  if (!column) return null;
  const card = columnHoverCard(column, station, nowMs);
  if (!card) return null;
  const tipX = column.left + column.width / 2;
  const live = stationInSlot(station?.history, column.slot.timestamp, nowMs);
  return {
    kind: "column",
    xPct: tipX,
    card,
    text: hoverCardText(card),
    marks: hoverMarks({
      kind: "column",
      xPct: tipX,
      column,
      stationPoint: live,
      chart,
    }),
  };
}
