/**
 * Feature flags.
 *
 * IMPORTANT CONSTRAINT: production and development share one Convex
 * deployment. There is no production database. That means a Convex-side env var
 * cannot gate anything by environment — one deployment, one set of env vars —
 * and any dummy data written to Convex is written to production.
 *
 * So the rule is: **fixture data never touches Convex.** Rider-count dummy data
 * is generated in the Next.js layer from a deterministic fixture module. There
 * is nothing in the database to leak, so nothing needs a backend gate. The
 * environment boundary is the Render service's env vars, which DO differ
 * between production and preview.
 *
 * This is a better design than gating on both sides, not a workaround. The
 * failure mode being avoided — someone flipping a localStorage key and seeing
 * fabricated rider counts under a "detected with our computer vision model"
 * footnote — is impossible by construction, because the fabricated counts only
 * exist in builds where the env var is set.
 */

/**
 * Env vars must be referenced statically, not built from a template string:
 * Next inlines `process.env.NEXT_PUBLIC_*` at build time by literal match, so
 * `process.env[name]` would silently resolve to undefined in the browser.
 */
export const FLAGS = {
  /**
   * Every rider count, trend, count-history chart, the "In the water" evidence
   * card, cam count badges, and the activity sort on Cams.
   *
   * OFF in production. No CV pipeline exists; the numbers are fixtures.
   */
  riderCounts: {
    env: process.env.NEXT_PUBLIC_FLAG_RIDER_COUNTS,
    description: "Rider counts detected from cam footage",
  },

  /**
   * Station sparkline, the "+2 vs forecast" pill, and the per-spot bias line.
   *
   * OFF until `station_readings` has accumulated a few days — a trailing bias
   * computed over an empty table is worse than no bias at all.
   */
  stationEvidence: {
    env: process.env.NEXT_PUBLIC_FLAG_STATION_EVIDENCE,
    description: "Live station history, delta and per-spot bias",
  },

  /**
   * Model grid, agreement bars, and the "models split" state.
   *
   * ON — this ships with real data from day one. The flag exists as a kill
   * switch, not as a staging gate.
   */
  modelConfidence: {
    env: process.env.NEXT_PUBLIC_FLAG_MODEL_CONFIDENCE ?? "true",
    description: "Per-model agreement and the confidence grid",
  },
};

const OVERRIDES_ENABLED = process.env.NEXT_PUBLIC_FLAG_OVERRIDES_ENABLED === "true";

export const FLAG_NAMES = Object.keys(FLAGS);

export const OVERRIDE_STORAGE_KEY = "waterman_flags";

/** The build-time value. Authoritative during SSR and in production. */
export function flagDefault(name) {
  return FLAGS[name]?.env === "true";
}

/** Whether local/URL overrides are permitted in this build. Never in production. */
export function overridesEnabled() {
  return OVERRIDES_ENABLED;
}

/**
 * Read client-side overrides. Returns {} when overrides are disabled, so a
 * production build cannot be talked into showing flagged UI.
 */
export function readOverrides(search = "") {
  if (!OVERRIDES_ENABLED) return {};

  const overrides = {};
  try {
    const stored = JSON.parse(localStorage.getItem(OVERRIDE_STORAGE_KEY) || "{}");
    for (const name of FLAG_NAMES) {
      if (typeof stored[name] === "boolean") overrides[name] = stored[name];
    }
  } catch {
    /* private browsing or malformed JSON */
  }

  // ?ff=riderCounts,-modelConfidence — a leading "-" turns one off.
  try {
    const ff = new URLSearchParams(search).get("ff");
    if (ff) {
      for (const raw of ff.split(",")) {
        const token = raw.trim();
        if (!token) continue;
        const off = token.startsWith("-");
        const name = off ? token.slice(1) : token;
        if (FLAG_NAMES.includes(name)) overrides[name] = !off;
      }
    }
  } catch {
    /* malformed query string */
  }

  return overrides;
}

export function writeOverride(name, value) {
  if (!OVERRIDES_ENABLED) return;
  try {
    const stored = JSON.parse(localStorage.getItem(OVERRIDE_STORAGE_KEY) || "{}");
    if (value === null) delete stored[name];
    else stored[name] = value;
    localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* private browsing */
  }
}
