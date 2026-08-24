import { RATING_DETAIL, RATING_LABEL } from "./data/wingfoilDestinations";

/**
 * Plain-text tooltip builders shared by the /destinations table
 * (components/ui/RatingMatrix.js) and map (components/ui/RouteMap.js)
 * views, so the two views can't drift on what a rating or a destination
 * actually means.
 */

export function humanizeTag(tag) {
  return tag.replace(/_/g, " ");
}

/** The fields that don't vary by month — spots, route, caveats, tags, confidence. */
export function nameTooltip(row) {
  const parts = [`${row.primarySpots.join(", ")}.`];
  if (row.travelFlight !== "none") parts.push(row.travelFlight);
  parts.push(row.travelGround);
  if (row.notes.length) parts.push(row.notes.join(" "));
  parts.push(`Best for: ${row.bestFor.map(humanizeTag).join(", ")}.`);
  parts.push(`Data confidence: ${row.confidence}.`);
  return parts.join(" ");
}

/** One month's rating, typical wind/waves, riding zone, and shoulder caveat. */
export function cellTooltip(row, month) {
  const level = row.ratings[month.key];
  const shoulder = row.shoulder.includes(month.key);
  const parts = [
    `${month.label} — ${RATING_LABEL[level]}.`,
    RATING_DETAIL[level],
    `Typical ${row.wind[month.key]} kt, ~${row.waves[month.key]}m waves. ${row.environment}.`,
  ];
  if (shoulder) {
    parts.push("Shoulder month: season is starting or ending, expect more day-to-day variance.");
  }
  return parts.join(" ");
}
