/**
 * Nightglass / Dayglass theme resolution.
 *
 * The theme switches automatically on local sunrise/sunset, with a manual
 * Auto / Night / Day override in Settings. Auto-only switching is an
 * accessibility problem — a theme that flips itself mid-session with no way to
 * stop it is worse than either fixed theme.
 *
 * The same resolution has to run in two places: a blocking <head> script before
 * first paint (to avoid a flash of the wrong theme) and a React provider (to
 * flip it mid-session). To stop those two drifting apart, the bootstrap script
 * is generated from these exact functions via Function.prototype.toString().
 * Everything inlined below must therefore be self-contained — no imports, no
 * module-scope references.
 */

export const THEME_STORAGE_KEY = "waterman_theme";

/** Cascais. A fixed origin avoids a geolocation permission prompt on first load. */
export const DEFAULT_COORDS = { lat: 38.6979, lon: -9.4215 };

export const THEME_PREFERENCES = ["auto", "night", "day"];

/**
 * Sunrise/sunset for a date and location, via the standard NOAA sunrise
 * equation. Returns epoch ms. Accurate to well under a minute, which is far
 * more than a theme switch needs.
 *
 * Self-contained on purpose — see the module note above.
 *
 * @param {number} lat - Latitude, north positive
 * @param {number} lon - Longitude, east positive
 * @param {number} atMs - Any timestamp on the day of interest
 * @returns {{ sunrise: number, sunset: number }}
 */
export function sunTimes(lat, lon, atMs) {
  var rad = Math.PI / 180;
  var julian = atMs / 86400000 + 2440587.5;
  var n = Math.round(julian - 2451545.0 + 0.0008);
  var jStar = n - lon / 360;
  var m = (357.5291 + 0.98560028 * jStar) % 360;
  var c =
    1.9148 * Math.sin(m * rad) +
    0.02 * Math.sin(2 * m * rad) +
    0.0003 * Math.sin(3 * m * rad);
  var lambda = (m + c + 180 + 102.9372) % 360;
  var jTransit =
    2451545.0 +
    jStar +
    0.0053 * Math.sin(m * rad) -
    0.0069 * Math.sin(2 * lambda * rad);
  var sinDec = Math.sin(lambda * rad) * Math.sin(23.44 * rad);
  var cosDec = Math.cos(Math.asin(sinDec));
  var cosOmega =
    (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * sinDec) /
    (Math.cos(lat * rad) * cosDec);

  // Polar day / polar night: no crossing. Signal with nulls; callers fall back.
  if (cosOmega > 1 || cosOmega < -1) {
    return { sunrise: null, sunset: null };
  }

  var omega = Math.acos(cosOmega) / rad;
  var toMs = function (j) {
    return (j - 2440587.5) * 86400000;
  };
  return {
    sunrise: toMs(jTransit - omega / 360),
    sunset: toMs(jTransit + omega / 360),
  };
}

/**
 * Which theme "auto" resolves to right now.
 *
 * Self-contained on purpose — see the module note above.
 *
 * @returns {"night"|"day"}
 */
export function autoTheme(lat, lon, nowMs) {
  var t = sunTimes(lat, lon, nowMs);
  if (t.sunrise === null) {
    // Polar edge case — fall back to local clock hours.
    var h = new Date(nowMs).getHours();
    return h >= 7 && h < 19 ? "day" : "night";
  }
  return nowMs >= t.sunrise && nowMs < t.sunset ? "day" : "night";
}

/**
 * When "auto" should next flip. Used to schedule a single timer rather than
 * polling. Returns epoch ms.
 */
export function nextThemeBoundary(lat, lon, nowMs) {
  const today = sunTimes(lat, lon, nowMs);
  if (today.sunrise === null) return nowMs + 60 * 60 * 1000;
  if (nowMs < today.sunrise) return today.sunrise;
  if (nowMs < today.sunset) return today.sunset;
  // Past sunset — next boundary is tomorrow's sunrise.
  const tomorrow = sunTimes(lat, lon, nowMs + 24 * 60 * 60 * 1000);
  return tomorrow.sunrise ?? nowMs + 60 * 60 * 1000;
}

/**
 * Resolve a stored preference to a concrete theme.
 * @param {string|null} preference - "auto" | "night" | "day"
 * @returns {"night"|"day"}
 */
export function resolveTheme(preference, nowMs = Date.now(), coords = DEFAULT_COORDS) {
  if (preference === "night" || preference === "day") return preference;
  return autoTheme(coords.lat, coords.lon, nowMs);
}

/**
 * The blocking <head> script. Runs before first paint so there is no flash of
 * the wrong theme, and sets the attribute that :root[data-theme="day"] keys off.
 *
 * Generated from the functions above so the two implementations cannot drift.
 * <html> carries suppressHydrationWarning, which is what makes this safe.
 */
export function themeBootstrapScript(coords = DEFAULT_COORDS) {
  return (
    "(function(){try{" +
    "var sunTimes=" + sunTimes.toString() + ";" +
    "var autoTheme=" + autoTheme.toString() + ";" +
    "var pref=null;try{pref=localStorage.getItem('" + THEME_STORAGE_KEY + "')}catch(e){}" +
    "var q=null;try{q=new URLSearchParams(location.search).get('theme')}catch(e){}" +
    "if(q==='night'||q==='day')pref=q;" +
    "var t=(pref==='night'||pref==='day')?pref:autoTheme(" +
    coords.lat + "," + coords.lon + ",Date.now());" +
    "document.documentElement.setAttribute('data-theme',t);" +
    "}catch(e){document.documentElement.setAttribute('data-theme','night')}})()"
  );
}

/** Page background per theme, for <meta name="theme-color">. */
export const THEME_COLORS = {
  night: "#0A1420",
  day: "#F1F4F4",
};
