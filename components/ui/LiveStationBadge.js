import { Badge } from "./Badge";
import { getDisplayWindDirection } from "../../lib/utils";

/**
 * LIVE station reading as a pronounced badge — overlays the cam top-left when
 * a station is alive (CamFrame passes the same pack.station as the wind chart).
 *
 * Wind direction is always the display (TO) bearing: prefer
 * `station.directionLabel` from buildStationCard, otherwise convert a raw
 * FROM degrees via getDisplayWindDirection. Never print getCardinalDirection
 * of the stored bearing.
 *
 * One source of truth: pass the same `pack.station` used by the wind chart so
 * this cannot disagree with the station line.
 */
export function LiveStationBadge({ station, className = "", ...props }) {
  if (!station || !Number.isFinite(station.speed)) return null;

  const speed = Math.round(station.speed);
  const gust = Number.isFinite(station.gust) ? Math.round(station.gust) : null;
  const direction =
    station.directionLabel ??
    (Number.isFinite(station.direction)
      ? getDisplayWindDirection(station.direction)
      : null);

  const titleParts = [
    `Live station ${speed} kn`,
    gust != null ? `(${gust}* gusts)` : null,
    direction,
    station.agoLabel,
  ].filter(Boolean);

  return (
    <Badge
      variant="live"
      className={`normal-case tracking-label ${className}`}
      title={titleParts.join(" · ")}
      {...props}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-page flex-none" aria-hidden="true" />
      <span className="uppercase tracking-label">LIVE</span>
      <span className="font-bold tabular-nums">{speed}</span>
      {gust != null && <span className="opacity-80 tabular-nums">({gust}*)</span>}
      <span className="tabular-nums">kn</span>
      {direction && <span className="tabular-nums">{direction}</span>}
    </Badge>
  );
}
