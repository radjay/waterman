/**
 * Plain-JS equirectangular projection for the /destinations map view —
 * deliberately not a d3-geo dependency at runtime. d3's geoEquirectangular
 * is literally `x = scale·λ + translate[0], y = -scale·φ + translate[1]`
 * (λ/φ = lng/lat in radians), so it's cheap to replicate exactly. SCALE and
 * TRANSLATE below are the exact values a one-off d3-geo script produced
 * fitting Lisbon + all 21 destinations (see lib/data/worldLandPath.js) into
 * the MAP_WIDTH×MAP_HEIGHT viewBox — change the destination set and both
 * the path and these constants need regenerating together, or points will
 * drift off their coastlines.
 */

export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 760;

const SCALE = 171.88733853924697;
const TRANSLATE = [600, 380];

export const LISBON = { name: "Lisbon", coords: [38.7223, -9.1393] };

export function project([lat, lng]) {
  const x = SCALE * (lng * (Math.PI / 180)) + TRANSLATE[0];
  const y = -SCALE * (lat * (Math.PI / 180)) + TRANSLATE[1];
  return [x, y];
}
