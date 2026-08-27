export const GUINCHO_SPOT_ID = "jd70a2qnf700nrv9sk736513t17y4y86";
export const CABO_RASO_STATION_ID = "3294";
export const GUINCHO_LATITUDE = 38.7333;
export const GUINCHO_LONGITUDE = -9.4733;
export const GUINCHO_TIMEZONE = "Europe/Lisbon";
export const START_HOUR = 7;
export const END_HOUR = 22;
export const RIDEABLE_KNOTS = 12;
/** Daytime hours at or above the rideable threshold that count as a called session. */
export const SESSION_MIN_HOURS = 4;
export const WINDY_MODEL = "windy-blended";
export const OVERLAP_PEER_MIN_N = 200;
export const SAMPLE_DAY_DEFAULT = "2025-08-20";
export const SPOT_CHECK_PER_BUCKET = 6;
export const SPOT_CHECK_MIN_HOURS = 4;
export const SPOT_CHECK_BUCKETS = [
  {
    id: "nortada-maySep",
    regime: "nortada",
    season: "maySep",
    title: "North wind · May–September",
    note: "Nortada season. Wind from the north.",
  },
  {
    id: "other-maySep",
    regime: "other",
    season: "maySep",
    title: "Other directions · May–September",
    note: "Nortada season. Wind not from the north.",
  },
  {
    id: "nortada-octApr",
    regime: "nortada",
    season: "octApr",
    title: "North wind · October–April",
    note: "The rest of the year. Wind from the north.",
  },
  {
    id: "other-octApr",
    regime: "other",
    season: "octApr",
    title: "Other directions · October–April",
    note: "The rest of the year. Wind not from the north.",
  },
];
export const WINNER_CAVEAT = "vs Cabo Raso, 2.9 km from the beach";

export const GUINCHO_MODELS = [
  { slug: "ecmwf-ifs025", openMeteoModel: "ecmwf_ifs025", windyLabel: "ECMWF" },
  { slug: "icon-eu", openMeteoModel: "icon_eu", windyLabel: "ICON7" },
  { slug: "icon-global", openMeteoModel: "icon_global", windyLabel: "ICON13" },
  { slug: "gfs-global", openMeteoModel: "gfs_global", windyLabel: "GFS" },
];

export const GUINCHO_MODEL_SLUGS = GUINCHO_MODELS.map((model) => model.slug);

export const STATION_READINGS_PATH = "archive/jsonl/station_readings/documents.jsonl";
export const FORECAST_SLOTS_ARCHIVE_PATH = "archive/jsonl/forecast_slots_archive/documents.jsonl";
export const OPENMETEO_GUINCHO_PATH = "archive/jsonl/openmeteo_guincho_previous_runs/documents.jsonl";
export const SUMMARY_PATH = "data/forecast-experiment/guincho-model-skill-summary.json";

export const FETCH_COMMANDS = [
  "npm run fx:fetch:openmeteo-guincho",
  "npm run fx:analyze:guincho-skill",
];

// Virtual (synthetic) models -- Guincho blend research. See
// docs/superpowers/specs/2026-08-27-guincho-blend-research-design.md
export const ROUTER_MODEL_SLUG = "router-consensus";
export const ROUTER_TIEBREAK_MODEL = "icon-eu";
export const VOTE_ANY_SLUG = "vote-any";
export const VOTE_MAJORITY_SLUG = "vote-majority";
export const BLEND_MEAN3_SLUG = "blend-mean3";
export const BLEND_WEIGHTED_SLUG = "blend-weighted";
export const GUINCHO_VOTE_MODELS = ["icon-eu", "icon-global", "gfs-global"];
export const VIRTUAL_MODEL_LABELS = {
  [ROUTER_MODEL_SLUG]: "Router (direction)",
  [VOTE_ANY_SLUG]: "Vote (any of 3)",
  [VOTE_MAJORITY_SLUG]: "Vote (majority)",
  [BLEND_MEAN3_SLUG]: "Blend (mean of 3)",
  [BLEND_WEIGHTED_SLUG]: "Blend (weighted)",
};
export const VIRTUAL_MODEL_SLUGS = Object.keys(VIRTUAL_MODEL_LABELS);
