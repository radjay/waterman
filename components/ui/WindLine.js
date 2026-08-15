import { primaryMetric } from "../../lib/conditions";

/**
 * The one-line reading — `19 (23*) kn NW` for wind, `1.2 m NW swell @ 11 s`
 * for surf.
 *
 * Sport decides what leads: wind sports lead with wind and keep the water as
 * context, surfing leads with swell and treats wind as the quality note. That
 * rule lives in `primaryMetric`; this renders it.
 *
 * `whitespace-nowrap` is load-bearing. Wrapped between the number and its unit
 * the line reads as two different measurements, and "19" alone on a row is a
 * number with no unit at all.
 *
 * @param {object} slot     forecast slot or live station reading
 * @param {string} sport
 * @param {string} [suffix] appended after a middot — "· nothing today"
 */
export function WindLine({ slot, sport, metric: given, suffix, size = 10.5, className = "" }) {
  const metric = given ?? primaryMetric(slot, sport);

  if (!metric || metric.value === null || metric.value === undefined) {
    return (
      <span
        className={`font-data text-dim whitespace-nowrap tabular-nums ${className}`}
        style={{ fontSize: size }}
      >
        {suffix ? `no reading · ${suffix}` : "no reading"}
      </span>
    );
  }

  const parts = [
    `${metric.value}`,
    metric.secondary?.startsWith("(") ? metric.secondary : null,
    metric.unit,
    metric.directionLabel,
    metric.secondary && !metric.secondary.startsWith("(") ? metric.secondary : null,
  ].filter(Boolean);

  return (
    <span
      className={`font-data whitespace-nowrap tabular-nums ${className}`}
      style={{ fontSize: size }}
    >
      {parts.join(" ")}
      {suffix ? <span className="text-dim"> · {suffix}</span> : null}
    </span>
  );
}

/**
 * A live station reading, in the same shape as the forecast line so the two are
 * comparable at a glance. Station readings are always wind, whatever the sport.
 */
export function StationLine({ station, suffix, size = 10.5, className = "" }) {
  if (!station || !Number.isFinite(station.speed)) return null;
  const metric = {
    value: Math.round(station.speed),
    unit: "kn",
    secondary: Number.isFinite(station.gust) ? `(${Math.round(station.gust)}*)` : null,
    directionLabel: station.directionLabel ?? null,
  };
  return <WindLine metric={metric} suffix={suffix} size={size} className={className} />;
}
