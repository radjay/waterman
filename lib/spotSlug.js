/**
 * Utilities for converting spot names to/from URL slugs.
 * e.g. "Marina de Cascais" <-> "marina-de-cascais"
 */

/**
 * Convert a spot name to a URL-safe slug.
 * @param {string} name - Spot name (e.g. "Marina de Cascais")
 * @returns {string} URL slug (e.g. "marina-de-cascais")
 */
export function toSpotSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")    // non-alphanumeric -> hyphen
    .replace(/^-+|-+$/g, "");        // trim leading/trailing hyphens
}

/**
 * Find a spot from an array by matching its slug.
 * @param {Array} spots - Array of spot objects with a `name` field
 * @param {string} slug - URL slug to match (e.g. "marina-de-cascais")
 * @returns {Object|null} Matching spot or null
 */
export function spotFromSlug(spots, slug) {
  if (!spots || !slug) return null;
  return spots.find((spot) => toSpotSlug(spot.name) === slug) ?? null;
}
